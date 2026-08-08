
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_secrets TO service_role;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_secrets(key, value)
VALUES ('shwary_rpc_secret', '1f4f9bb7750f74246ac86ed2a97bfc3b751386e79e002f57848822cfaa8d7d94')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.shwary_check_secret(_secret text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_secrets WHERE key='shwary_rpc_secret' AND value = _secret);
$$;

CREATE OR REPLACE FUNCTION public.shwary_get_order(_secret text, _order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _o RECORD; _rate numeric;
BEGIN
  IF NOT public.shwary_check_secret(_secret) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id, code, total_usd, paid, payment_status INTO _o FROM public.online_orders WHERE id=_order_id;
  IF _o IS NULL THEN RETURN NULL; END IF;
  SELECT usd_to_cdf_rate INTO _rate FROM public.settings WHERE id=1;
  RETURN jsonb_build_object('id',_o.id,'code',_o.code,'total_usd',_o.total_usd,'paid',_o.paid,'payment_status',_o.payment_status,'rate',COALESCE(_rate,2800));
END; $$;

CREATE OR REPLACE FUNCTION public.shwary_get_order_by_code(_secret text, _code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _o RECORD;
BEGIN
  IF NOT public.shwary_check_secret(_secret) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id, payment_status, paid, status, payment_ref INTO _o FROM public.online_orders WHERE code=_code;
  IF _o IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id',_o.id,'payment_status',_o.payment_status,'paid',_o.paid,'status',_o.status,'payment_ref',_o.payment_ref);
END; $$;

CREATE OR REPLACE FUNCTION public.shwary_set_ref(_secret text, _order_id uuid, _ref text, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.shwary_check_secret(_secret) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.online_orders
    SET payment_provider='shwary', payment_ref=_ref, payment_status=COALESCE(_status,'pending'), payment_method='mobile_money'
    WHERE id=_order_id;
END; $$;

CREATE OR REPLACE FUNCTION public.shwary_apply_status(_secret text, _order_id uuid, _ref text, _status text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o RECORD; _paid boolean := false; _st text;
BEGIN
  IF NOT public.shwary_check_secret(_secret) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF lower(_status) IN ('completed','success','successful','paid') THEN _paid := true; END IF;

  UPDATE public.online_orders o
    SET payment_status=_status,
        paid = CASE WHEN _paid THEN true ELSE o.paid END,
        status = CASE WHEN _paid THEN 'confirmed'
                      WHEN lower(_status) IN ('failed','cancelled','timeout') AND o.paid = false THEN 'cancelled'
                      ELSE o.status END
    WHERE (_order_id IS NOT NULL AND o.id=_order_id) OR (_order_id IS NULL AND o.payment_ref=_ref)
    RETURNING o.id, o.code, o.customer_name, o.paid, o.status, o.payment_status INTO _o;

  IF _o IS NULL THEN RETURN NULL; END IF;

  IF _paid THEN
    INSERT INTO public.notifications(title, message, type, entity_type, entity_id)
    VALUES ('Paiement reçu', 'Commande '||_o.code||' payée par '||COALESCE(_o.customer_name,'client')||' (Shwary).', 'success','online_order',_o.id);
  ELSIF lower(_status) IN ('failed','cancelled') THEN
    INSERT INTO public.notifications(title, message, type, entity_type, entity_id)
    VALUES ('Paiement échoué', 'Commande '||_o.code||' — '||COALESCE(_reason,_status)||'.', 'warning','online_order',_o.id);
  END IF;

  RETURN jsonb_build_object('id',_o.id,'paid',_o.paid,'status',_o.status,'payment_status',_o.payment_status);
END; $$;

REVOKE ALL ON FUNCTION public.shwary_check_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shwary_get_order(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shwary_get_order_by_code(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shwary_set_ref(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shwary_apply_status(text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shwary_get_order(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shwary_get_order_by_code(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shwary_set_ref(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shwary_apply_status(text, uuid, text, text, text) TO anon, authenticated;
