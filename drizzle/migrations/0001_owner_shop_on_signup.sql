CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)) ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.shop_memberships WHERE user_id = NEW.id) THEN
    INSERT INTO public.shops(owner_id) VALUES (NEW.id) RETURNING id INTO sid;
    INSERT INTO public.shop_memberships(user_id, shop_id) VALUES (NEW.id, sid);
    INSERT INTO public.shop_settings(shop_id, shop_name, extras) VALUES (sid, 'Ma boutique', '{}'::jsonb) ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$ DECLARE u record; sid uuid; BEGIN
  FOR u IN SELECT id, email, raw_user_meta_data FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM public.shop_memberships m WHERE m.user_id = au.id) LOOP
    INSERT INTO public.profiles (id, full_name) VALUES (u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email)) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.shops(owner_id) VALUES (u.id) RETURNING id INTO sid;
    INSERT INTO public.shop_memberships(user_id, shop_id) VALUES (u.id, sid);
    INSERT INTO public.shop_settings(shop_id, shop_name, extras) VALUES (sid, 'Ma boutique', '{}'::jsonb) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (u.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;