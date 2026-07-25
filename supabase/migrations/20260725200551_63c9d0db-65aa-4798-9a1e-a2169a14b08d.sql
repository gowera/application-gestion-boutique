-- Categories
DROP POLICY IF EXISTS categories_staff_manage ON public.categories;
CREATE POLICY categories_auth_manage ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products
DROP POLICY IF EXISTS products_staff_manage ON public.products;
CREATE POLICY products_auth_manage ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Product images
DROP POLICY IF EXISTS "staff write product_images" ON public.product_images;
CREATE POLICY product_images_auth_manage ON public.product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Product suppliers link
DROP POLICY IF EXISTS "staff write product_suppliers" ON public.product_suppliers;
CREATE POLICY product_suppliers_auth_manage ON public.product_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Suppliers
DROP POLICY IF EXISTS "staff write suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "staff read suppliers" ON public.suppliers;
CREATE POLICY suppliers_auth_manage ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customers
DROP POLICY IF EXISTS customers_staff_all ON public.customers;
CREATE POLICY customers_auth_manage ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;

-- Donner un rôle par défaut aux comptes sans rôle et aux nouveaux comptes
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'manager'::public.app_role FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'manager'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $function$;