CREATE TABLE public.sync_operations (
  id uuid primary key default gen_random_uuid(),
  client_op_id uuid not null unique,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  status text not null default 'applied',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT ON public.sync_operations TO authenticated;
GRANT ALL ON public.sync_operations TO service_role;

ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own sync operations"
ON public.sync_operations FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can insert own sync operations"
ON public.sync_operations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_sync_operations_updated_at
BEFORE UPDATE ON public.sync_operations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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

CREATE POLICY "Public can read app releases"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-releases');

CREATE POLICY "Admins can upload app releases"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'app-releases' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app releases"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'app-releases' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app releases"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'app-releases' AND public.has_role(auth.uid(), 'admin'));