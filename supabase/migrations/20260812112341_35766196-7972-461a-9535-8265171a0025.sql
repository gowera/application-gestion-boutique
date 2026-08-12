DROP POLICY IF EXISTS invitations_read ON public.invitations;
CREATE POLICY invitations_read_staff ON public.invitations FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));
REVOKE SELECT ON public.invitations FROM anon;

CREATE OR REPLACE FUNCTION public.check_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _row RECORD;
BEGIN
  SELECT role, expires_at, used_at INTO _row FROM public.invitations WHERE token = _token;
  IF _row IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'role', _row.role,
    'expires_at', _row.expires_at,
    'valid', (_row.used_at IS NULL AND _row.expires_at > now())
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.check_invitation(text) TO anon, authenticated;

DROP POLICY IF EXISTS product_suppliers_read ON public.product_suppliers;
CREATE POLICY product_suppliers_read_staff ON public.product_suppliers FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur','comptable']::public.app_role[]));
REVOKE SELECT ON public.product_suppliers FROM anon;