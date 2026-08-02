CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  bio TEXT,
  photo_url TEXT,
  cv_url TEXT,
  email TEXT,
  phone TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_public_read" ON public.team_members;
DROP POLICY IF EXISTS "team_auth_read" ON public.team_members;
DROP POLICY IF EXISTS "team_admin_manage" ON public.team_members;

CREATE POLICY "team_public_read" ON public.team_members FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "team_auth_read" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_admin_manage" ON public.team_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS team_members_updated_at ON public.team_members;
CREATE TRIGGER team_members_updated_at BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();