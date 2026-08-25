CREATE OR REPLACE FUNCTION public.sync_apply_operation(_client_op_id uuid, _kind text, _payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing jsonb;
  _res jsonb;
  _id uuid;
  _amount numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur','comptable']::app_role[]) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT result INTO _existing FROM public.sync_operations WHERE client_op_id = _client_op_id;
  IF FOUND THEN
    RETURN jsonb_build_object('duplicate', true, 'result', _existing);
  END IF;

  IF _kind = 'pos_sale' THEN
    _id := public.create_pos_sale(
      NULLIF(_payload->>'customer_id','')::uuid,
      COALESCE(_payload->'items', '[]'::jsonb),
      COALESCE(_payload->'payments', '[]'::jsonb),
      COALESCE((_payload->>'discount_usd')::numeric, 0),
      _payload->>'note',
      NULLIF(_payload->>'session_id','')::uuid
    );
    _res := jsonb_build_object('sale_id', _id);
  ELSIF _kind = 'expense' THEN
    INSERT INTO public.expenses (category_id, amount, currency, amount_usd, method, user_id, note, spent_at)
    VALUES (
      NULLIF(_payload->>'category_id','')::uuid,
      COALESCE((_payload->>'amount')::numeric, 0),
      COALESCE(_payload->>'currency','USD')::currency_code,
      COALESCE((_payload->>'amount_usd')::numeric, 0),
      COALESCE(_payload->>'method','cash')::payment_method,
      auth.uid(),
      _payload->>'note',
      COALESCE((_payload->>'spent_at')::date, CURRENT_DATE)
    ) RETURNING id INTO _id;
    _res := jsonb_build_object('expense_id', _id);
  ELSIF _kind = 'customer' THEN
    INSERT INTO public.customers (name, phone, email, address, credit_limit, notes)
    VALUES (
      COALESCE(_payload->>'name','Client'),
      _payload->>'phone',
      _payload->>'email',
      _payload->>'address',
      COALESCE((_payload->>'credit_limit')::numeric, 0),
      _payload->>'notes'
    ) RETURNING id INTO _id;
    _res := jsonb_build_object('customer_id', _id);
  ELSIF _kind = 'stock_adjust' THEN
    PERFORM public.adjust_stock(
      (_payload->>'product_id')::uuid,
      COALESCE((_payload->>'delta')::int, 0),
      COALESCE(_payload->>'reason','correction')::movement_reason,
      _payload->>'note'
    );
    _res := jsonb_build_object('ok', true);
  ELSIF _kind = 'customer_ledger' THEN
    _amount := COALESCE((_payload->>'delta')::numeric, 0);
    _id := NULLIF(_payload->>'customer_id','')::uuid;
    IF _id IS NULL THEN
      INSERT INTO public.customers (name, phone, address)
      VALUES (COALESCE(_payload->>'customer_name','Client'), _payload->>'customer_phone', _payload->>'customer_address')
      RETURNING id INTO _id;
    END IF;
    INSERT INTO public.customer_ledger (customer_id, delta, reason, due_date)
    VALUES (_id, _amount, COALESCE(_payload->>'reason','octroi_credit'), NULLIF(_payload->>'due_date','')::date);
    UPDATE public.customers SET balance = COALESCE(balance,0) + _amount WHERE id = _id;
    _res := jsonb_build_object('customer_id', _id, 'delta', _amount);
  ELSIF _kind = 'document' THEN
    _res := public.issue_document_number(
      COALESCE(_payload->>'doc_type','facture'),
      NULLIF(_payload->>'sale_id','')::uuid,
      _payload->>'customer_name',
      COALESCE((_payload->>'total_usd')::numeric, 0)
    );
  ELSE
    RAISE EXCEPTION 'Unknown operation kind: %', _kind;
  END IF;

  INSERT INTO public.sync_operations (client_op_id, user_id, kind, payload, result, status)
  VALUES (_client_op_id, auth.uid(), _kind, _payload, _res, 'applied');

  RETURN jsonb_build_object('duplicate', false, 'result', _res);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_apply_operation(uuid, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.sync_apply_operation(uuid, text, jsonb) TO authenticated;