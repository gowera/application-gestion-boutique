CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log(user_id, action, entity, entity_id, metadata)
    VALUES (_actor, 'role.grant', 'user_roles', NEW.user_id,
            jsonb_build_object('role', NEW.role, 'target_user_id', NEW.user_id));
    RETURN NEW;
  ELSE
    INSERT INTO public.activity_log(user_id, action, entity, entity_id, metadata)
    VALUES (_actor, 'role.revoke', 'user_roles', OLD.user_id,
            jsonb_build_object('role', OLD.role, 'target_user_id', OLD.user_id));
    RETURN OLD;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_log_role_grant ON public.user_roles;
CREATE TRIGGER trg_log_role_grant AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

DROP TRIGGER IF EXISTS trg_log_role_revoke ON public.user_roles;
CREATE TRIGGER trg_log_role_revoke AFTER DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

CREATE OR REPLACE FUNCTION public.log_auth_event(_action text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _action NOT IN ('auth.signin', 'auth.signout', 'auth.denied') THEN RAISE EXCEPTION 'invalid_action'; END IF;
  INSERT INTO public.activity_log(user_id, action, entity, entity_id, metadata)
  VALUES (_uid, _action, 'auth', _uid, COALESCE(_metadata, '{}'::jsonb));
END; $$;

REVOKE EXECUTE ON FUNCTION public.log_auth_event(text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(text, jsonb) TO authenticated;