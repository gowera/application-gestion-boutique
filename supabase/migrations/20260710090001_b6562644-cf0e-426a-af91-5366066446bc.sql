
-- Categories: subcategories & metadata
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT, email TEXT, address TEXT, notes TEXT,
  balance_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[]));
CREATE POLICY "staff write suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

-- Purchases
DO $$ BEGIN CREATE TYPE public.purchase_status AS ENUM ('draft','ordered','received','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status public.purchase_status NOT NULL DEFAULT 'draft',
  subtotal_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read purchases" ON public.purchases FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[]));
CREATE POLICY "staff write purchases" ON public.purchases FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty INT NOT NULL,
  unit_cost_usd NUMERIC(12,2) NOT NULL,
  line_total_usd NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;
GRANT ALL ON public.purchase_items TO service_role;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read purchase_items" ON public.purchase_items FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[]));
CREATE POLICY "staff write purchase_items" ON public.purchase_items FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

CREATE SEQUENCE IF NOT EXISTS public.purchase_code_seq;

-- Product images
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read product_images" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff write product_images" ON public.product_images FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

-- Online orders
DO $$ BEGIN CREATE TYPE public.order_status AS ENUM ('pending','confirmed','preparing','shipping','delivered','cancelled','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.delivery_mode AS ENUM ('delivery','pickup'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.online_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_mode public.delivery_mode NOT NULL DEFAULT 'delivery',
  delivery_address TEXT,
  delivery_fee_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method,
  paid BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.online_orders TO authenticated;
GRANT SELECT, INSERT ON public.online_orders TO anon;
GRANT ALL ON public.online_orders TO service_role;
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders read" ON public.online_orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','livreur']::public.app_role[]));
CREATE POLICY "staff update orders" ON public.online_orders FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','livreur']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','livreur']::public.app_role[]));

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty INT NOT NULL,
  unit_price_usd NUMERIC(12,2) NOT NULL,
  line_total_usd NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read order_items" ON public.order_items FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.online_orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','livreur']::public.app_role[])))
);

CREATE SEQUENCE IF NOT EXISTS public.order_code_seq;

-- Cart
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Interventions
DO $$ BEGIN CREATE TYPE public.intervention_status AS ENUM ('pending','planned','in_progress','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  service_type TEXT NOT NULL,
  description TEXT,
  technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  status public.intervention_status NOT NULL DEFAULT 'pending',
  labor_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  travel_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  materials_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  report TEXT,
  quote_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interventions TO authenticated;
GRANT ALL ON public.interventions TO service_role;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read interventions" ON public.interventions FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[])
  OR technician_id = auth.uid()
);
CREATE POLICY "staff write interventions" ON public.interventions FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));
CREATE POLICY "tech update interventions" ON public.interventions FOR UPDATE TO authenticated USING (technician_id = auth.uid()) WITH CHECK (technician_id = auth.uid());

CREATE SEQUENCE IF NOT EXISTS public.intervention_code_seq;

-- Rent
CREATE TABLE IF NOT EXISTS public.rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount_usd NUMERIC(12,2) NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  method public.payment_method,
  proof_url TEXT,
  note TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_payments TO authenticated;
GRANT ALL ON public.rent_payments TO service_role;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read rent" ON public.rent_payments FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[]));
CREATE POLICY "staff write rent" ON public.rent_payments FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

-- Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT, email TEXT, address TEXT,
  position TEXT,
  role public.app_role,
  monthly_salary_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  hired_at DATE,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read employees" ON public.employees FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[]));
CREATE POLICY "admin write employees" ON public.employees FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Salary payments
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount_usd NUMERIC(12,2) NOT NULL,
  advance BOOLEAN NOT NULL DEFAULT false,
  method public.payment_method,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_payments TO authenticated;
GRANT ALL ON public.salary_payments TO service_role;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read salaries" ON public.salary_payments FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[]));
CREATE POLICY "acct write salaries" ON public.salary_payments FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','comptable']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','comptable']::public.app_role[]));

-- Updated_at triggers
CREATE TRIGGER trg_suppliers_upd BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_purchases_upd BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orders_upd BEFORE UPDATE ON public.online_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_interv_upd BEFORE UPDATE ON public.interventions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rent_upd BEFORE UPDATE ON public.rent_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_employees_upd BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Code generators
CREATE OR REPLACE FUNCTION public.next_order_code() RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT 'CMD-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.order_code_seq')::text,4,'0');
$$;

CREATE OR REPLACE FUNCTION public.next_purchase_code() RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT 'ACH-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.purchase_code_seq')::text,4,'0');
$$;

CREATE OR REPLACE FUNCTION public.next_intervention_code() RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT 'INT-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.intervention_code_seq')::text,4,'0');
$$;

-- Create online order (client checkout) — decrements stock
CREATE OR REPLACE FUNCTION public.create_online_order(
  _customer_name TEXT, _customer_phone TEXT, _customer_email TEXT,
  _delivery_mode public.delivery_mode, _delivery_address TEXT, _delivery_fee_usd NUMERIC,
  _items JSONB, _note TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid UUID := auth.uid();
  _oid UUID := gen_random_uuid();
  _code TEXT := public.next_order_code();
  _item JSONB;
  _stock INT; _name TEXT; _price NUMERIC(12,2);
  _sub NUMERIC(12,2) := 0; _line NUMERIC(12,2);
BEGIN
  IF _items IS NULL OR jsonb_array_length(_items)=0 THEN RAISE EXCEPTION 'empty_cart'; END IF;
  INSERT INTO public.online_orders(id, code, user_id, customer_name, customer_phone, customer_email, delivery_mode, delivery_address, delivery_fee_usd, subtotal_usd, total_usd, status, note)
    VALUES (_oid, _code, _uid, _customer_name, _customer_phone, _customer_email, _delivery_mode, _delivery_address, COALESCE(_delivery_fee_usd,0), 0, 0, 'pending', _note);
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT stock, name, sale_price INTO _stock, _name, _price FROM public.products WHERE id=(_item->>'product_id')::UUID FOR UPDATE;
    IF _stock IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;
    IF _stock < (_item->>'qty')::INT THEN RAISE EXCEPTION 'insufficient_stock:%', _name; END IF;
    _line := _price * (_item->>'qty')::INT;
    _sub := _sub + _line;
    UPDATE public.products SET stock = stock - (_item->>'qty')::INT WHERE id=(_item->>'product_id')::UUID;
    INSERT INTO public.stock_movements(product_id, delta, reason, ref_type, ref_id, user_id)
      VALUES ((_item->>'product_id')::UUID, -(_item->>'qty')::INT, 'sale', 'order', _oid, _uid);
    INSERT INTO public.order_items(order_id, product_id, product_name, qty, unit_price_usd, line_total_usd)
      VALUES (_oid, (_item->>'product_id')::UUID, _name, (_item->>'qty')::INT, _price, _line);
  END LOOP;
  UPDATE public.online_orders SET subtotal_usd=_sub, total_usd=_sub+COALESCE(_delivery_fee_usd,0) WHERE id=_oid;
  IF _uid IS NOT NULL THEN DELETE FROM public.cart_items WHERE user_id=_uid; END IF;
  INSERT INTO public.activity_log(user_id, action, entity, entity_id, metadata)
    VALUES (_uid,'order.create','online_orders',_oid, jsonb_build_object('total_usd',_sub,'code',_code));
  RETURN _oid;
END; $$;

-- Receive purchase (increments stock)
CREATE OR REPLACE FUNCTION public.receive_purchase(_purchase_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid UUID := auth.uid(); _row RECORD; _it RECORD;
BEGIN
  IF NOT public.has_any_role(_uid, ARRAY['admin','manager']::public.app_role[]) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _row FROM public.purchases WHERE id=_purchase_id FOR UPDATE;
  IF _row.status='received' THEN RAISE EXCEPTION 'already_received'; END IF;
  FOR _it IN SELECT * FROM public.purchase_items WHERE purchase_id=_purchase_id LOOP
    IF _it.product_id IS NOT NULL THEN
      UPDATE public.products SET stock=stock+_it.qty, cost_price=_it.unit_cost_usd WHERE id=_it.product_id;
      INSERT INTO public.stock_movements(product_id, delta, reason, ref_type, ref_id, user_id)
        VALUES (_it.product_id, _it.qty, 'purchase', 'purchase', _purchase_id, _uid);
    END IF;
  END LOOP;
  UPDATE public.purchases SET status='received', received_at=now() WHERE id=_purchase_id;
  INSERT INTO public.activity_log(user_id, action, entity, entity_id) VALUES (_uid,'purchase.receive','purchases',_purchase_id);
END; $$;
