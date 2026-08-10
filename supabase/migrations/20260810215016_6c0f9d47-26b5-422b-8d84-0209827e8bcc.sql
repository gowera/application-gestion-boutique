
INSERT INTO public.app_secrets(key, value)
VALUES ('shwary_rpc_secret', '270caa104210488833b0ef17eb7202118f1bec84f880ceb87d41f64878910b81')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.shwary_get_creds(_secret text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _c RECORD;
BEGIN
  IF NOT public.shwary_check_secret(_secret) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT merchant_id, merchant_key, sandbox INTO _c
    FROM public.payment_credentials WHERE provider = 'shwary';
  IF _c IS NULL OR _c.merchant_id IS NULL OR _c.merchant_key IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('merchant_id', _c.merchant_id, 'merchant_key', _c.merchant_key, 'sandbox', COALESCE(_c.sandbox, false));
END; $$;

CREATE OR REPLACE FUNCTION public.shwary_save_creds(_secret text, _merchant_id text, _merchant_key text, _sandbox boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.shwary_check_secret(_secret) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _merchant_id IS NULL OR _merchant_key IS NULL THEN RAISE EXCEPTION 'invalid_creds'; END IF;
  INSERT INTO public.payment_credentials(provider, merchant_id, merchant_key, sandbox, updated_at)
    VALUES ('shwary', _merchant_id, _merchant_key, COALESCE(_sandbox, false), now())
  ON CONFLICT (provider) DO UPDATE
    SET merchant_id = EXCLUDED.merchant_id,
        merchant_key = EXCLUDED.merchant_key,
        sandbox = EXCLUDED.sandbox,
        updated_at = now();
END; $$;

REVOKE ALL ON FUNCTION public.shwary_get_creds(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shwary_save_creds(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shwary_get_creds(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shwary_save_creds(text, text, text, boolean) TO anon, authenticated, service_role;
