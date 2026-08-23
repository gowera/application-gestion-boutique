ALTER TABLE public.customer_ledger ADD COLUMN IF NOT EXISTS method public.payment_method;

CREATE OR REPLACE FUNCTION public.record_customer_payment(_customer_id UUID, _amount NUMERIC, _note TEXT DEFAULT NULL, _method public.payment_method DEFAULT 'cash')
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _lid UUID := gen_random_uuid();
BEGIN
  IF NOT public.has_any_role(_uid, ARRAY['admin','manager','caissier']::public.app_role[]) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  INSERT INTO public.customer_ledger(id, customer_id, delta, reason, user_id, method)
    VALUES (_lid, _customer_id, -_amount, COALESCE(_note,'payment'), _uid, _method);
  UPDATE public.customers SET balance = balance - _amount WHERE id = _customer_id;
  INSERT INTO public.activity_log(user_id, action, entity, entity_id, metadata)
    VALUES (_uid,'customer.payment','customers',_customer_id, jsonb_build_object('amount',_amount,'method',_method));
  RETURN _lid;
END; $$;
REVOKE ALL ON FUNCTION public.record_customer_payment(UUID, NUMERIC, TEXT, public.payment_method) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(UUID, NUMERIC, TEXT, public.payment_method) TO authenticated;