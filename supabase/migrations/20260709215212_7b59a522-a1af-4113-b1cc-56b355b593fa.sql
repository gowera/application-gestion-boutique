
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','manager','caissier','vendeur','comptable');
CREATE TYPE public.product_status AS ENUM ('active','inactive','on_order');
CREATE TYPE public.sale_status AS ENUM ('completed','cancelled','refunded');
CREATE TYPE public.sale_channel AS ENUM ('pos','online');
CREATE TYPE public.payment_method AS ENUM ('cash','mobile_money','card','bank_transfer','credit','mixed');
CREATE TYPE public.currency_code AS ENUM ('USD','CDF');
CREATE TYPE public.movement_reason AS ENUM ('sale','sale_cancel','purchase','manual_in','manual_out','correction','return');
CREATE TYPE public.quote_status AS ENUM ('new','read','replied','closed');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles));
$$;

CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SETTINGS ============
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shop_name TEXT NOT NULL DEFAULT 'CONETEC',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  primary_currency public.currency_code NOT NULL DEFAULT 'USD',
  usd_to_cdf_rate NUMERIC(14,4) NOT NULL DEFAULT 2800,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  invoice_prefix TEXT NOT NULL DEFAULT 'CNT',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.settings (id) VALUES (1);
GRANT SELECT ON public.settings TO authenticated, anon;
GRANT UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read_all" ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_update" ON public.settings FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read_all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_staff_manage" ON public.categories FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand TEXT,
  description TEXT,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  low_stock_threshold INT,
  status public.product_status NOT NULL DEFAULT 'active',
  images TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.products (category_id);
CREATE INDEX ON public.products (status);
GRANT SELECT ON public.products TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read_all" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_staff_manage" ON public.products FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STOCK MOVEMENTS ============
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  delta INT NOT NULL,
  reason public.movement_reason NOT NULL,
  ref_type TEXT,
  ref_id UUID,
  note TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.stock_movements (product_id);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_mov_staff_read" ON public.stock_movements FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur','comptable']::public.app_role[])
);
CREATE POLICY "stock_mov_staff_insert" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
);

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,  -- >0 = client owes shop
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_staff_all" ON public.customers FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur','comptable']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur']::public.app_role[]));
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CUSTOMER LEDGER ============
CREATE TABLE public.customer_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  delta NUMERIC(12,2) NOT NULL,  -- +debt, -payment
  reason TEXT NOT NULL,
  ref_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.customer_ledger (customer_id);
GRANT SELECT, INSERT ON public.customer_ledger TO authenticated;
GRANT ALL ON public.customer_ledger TO service_role;
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_staff_read" ON public.customer_ledger FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','comptable']::public.app_role[])
);
CREATE POLICY "ledger_staff_insert" ON public.customer_ledger FOR INSERT TO authenticated WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier']::public.app_role[])
);

-- ============ CASH SESSIONS ============
CREATE TABLE public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(12,2),
  expected_amount NUMERIC(12,2),
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_own_or_admin" ON public.cash_sessions FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[])
);
CREATE POLICY "cash_insert_self" ON public.cash_sessions FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur']::public.app_role[])
);
CREATE POLICY "cash_update_own" ON public.cash_sessions FOR UPDATE TO authenticated USING (
  user_id = auth.uid() OR public.has_role(auth.uid(),'admin')
);

-- ============ SALES ============
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  channel public.sale_channel NOT NULL DEFAULT 'pos',
  status public.sale_status NOT NULL DEFAULT 'completed',
  subtotal_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.sales (created_at DESC);
CREATE INDEX ON public.sales (customer_id);
GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_staff_read" ON public.sales FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur','comptable']::public.app_role[])
);
CREATE POLICY "sales_staff_write" ON public.sales FOR INSERT TO authenticated WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur']::public.app_role[])
);
CREATE POLICY "sales_admin_update" ON public.sales FOR UPDATE TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
);

-- ============ SALE ITEMS ============
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  unit_price_usd NUMERIC(12,2) NOT NULL,
  discount_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total_usd NUMERIC(12,2) NOT NULL
);
CREATE INDEX ON public.sale_items (sale_id);
CREATE INDEX ON public.sale_items (product_id);
GRANT SELECT, INSERT ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_items_staff_read" ON public.sale_items FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur','comptable']::public.app_role[])
);
CREATE POLICY "sale_items_staff_write" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur']::public.app_role[])
);

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency public.currency_code NOT NULL,
  amount_usd NUMERIC(12,2) NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payments (sale_id);
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_staff_read" ON public.payments FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur','comptable']::public.app_role[])
);
CREATE POLICY "payments_staff_write" ON public.payments FOR INSERT TO authenticated WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur']::public.app_role[])
);

-- ============ EXPENSE CATEGORIES + EXPENSES ============
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.expense_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expcat_read" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "expcat_manage" ON public.expense_categories FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[]));

INSERT INTO public.expense_categories (name) VALUES
 ('Transport'),('Achat matériel'),('Carburant'),('Internet'),('Électricité'),
 ('Eau'),('Réparation'),('Communication'),('Fournitures'),('Salaire'),('Loyer'),('Autre');

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency public.currency_code NOT NULL DEFAULT 'USD',
  amount_usd NUMERIC(12,2) NOT NULL,
  method public.payment_method NOT NULL DEFAULT 'cash',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  proof_url TEXT,
  spent_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.expenses (spent_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_staff_read" ON public.expenses FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[])
);
CREATE POLICY "expenses_staff_write" ON public.expenses FOR INSERT TO authenticated WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[])
);
CREATE POLICY "expenses_staff_update" ON public.expenses FOR UPDATE TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','comptable']::public.app_role[])
);
CREATE POLICY "expenses_admin_delete" ON public.expenses FOR DELETE TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
);

-- ============ QUOTE REQUESTS (public form) ============
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service TEXT NOT NULL,
  message TEXT,
  status public.quote_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.quote_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_anyone_create" ON public.quote_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "quotes_staff_read" ON public.quote_requests FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','vendeur']::public.app_role[])
);
CREATE POLICY "quotes_staff_update" ON public.quote_requests FOR UPDATE TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager','vendeur']::public.app_role[])
);

-- ============ ACTIVITY LOG ============
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.activity_log (created_at DESC);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_admin_read" ON public.activity_log FOR SELECT TO authenticated USING (
  public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
);
CREATE POLICY "activity_insert_self" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ SALE CODE GENERATOR ============
CREATE SEQUENCE public.sale_code_seq;
CREATE OR REPLACE FUNCTION public.next_sale_code()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT invoice_prefix FROM public.settings WHERE id=1) || '-' || to_char(now(),'YYYYMMDD') || '-' || lpad(nextval('public.sale_code_seq')::text, 4, '0');
$$;

-- ============ POS SALE CREATION (transactional) ============
CREATE OR REPLACE FUNCTION public.create_pos_sale(
  _customer_id UUID,
  _items JSONB,        -- [{product_id, qty, unit_price_usd, discount_usd}]
  _payments JSONB,     -- [{method, amount, currency, reference}]
  _discount_usd NUMERIC DEFAULT 0,
  _note TEXT DEFAULT NULL,
  _session_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _sale_id UUID := gen_random_uuid();
  _code TEXT;
  _item JSONB;
  _pay JSONB;
  _subtotal NUMERIC(12,2) := 0;
  _line_total NUMERIC(12,2);
  _current_stock INT;
  _product_name TEXT;
  _total NUMERIC(12,2);
  _paid NUMERIC(12,2) := 0;
  _rate NUMERIC(14,4);
  _amount_usd NUMERIC(12,2);
  _credit NUMERIC(12,2);
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['admin','manager','caissier','vendeur']::public.app_role[]) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'empty_cart'; END IF;

  SELECT usd_to_cdf_rate INTO _rate FROM public.settings WHERE id=1;
  _code := public.next_sale_code();

  -- validate + decrement stock, accumulate subtotal
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT stock, name INTO _current_stock, _product_name
      FROM public.products WHERE id = (_item->>'product_id')::UUID FOR UPDATE;
    IF _current_stock IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;
    IF _current_stock < (_item->>'qty')::INT THEN
      RAISE EXCEPTION 'insufficient_stock:%', _product_name;
    END IF;
    _line_total := ((_item->>'qty')::INT * (_item->>'unit_price_usd')::NUMERIC)
                 - COALESCE((_item->>'discount_usd')::NUMERIC, 0);
    _subtotal := _subtotal + _line_total;

    UPDATE public.products
      SET stock = stock - (_item->>'qty')::INT,
          updated_at = now()
      WHERE id = (_item->>'product_id')::UUID;

    INSERT INTO public.stock_movements(product_id, delta, reason, ref_type, ref_id, user_id)
      VALUES ((_item->>'product_id')::UUID, -(_item->>'qty')::INT, 'sale', 'sale', _sale_id, _uid);
  END LOOP;

  _total := GREATEST(_subtotal - COALESCE(_discount_usd,0), 0);

  INSERT INTO public.sales(id, code, customer_id, user_id, session_id, channel, status,
                           subtotal_usd, discount_usd, total_usd, paid_usd, credit_usd, note)
    VALUES (_sale_id, _code, _customer_id, _uid, _session_id, 'pos', 'completed',
            _subtotal, COALESCE(_discount_usd,0), _total, 0, 0, _note);

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT name INTO _product_name FROM public.products WHERE id = (_item->>'product_id')::UUID;
    _line_total := ((_item->>'qty')::INT * (_item->>'unit_price_usd')::NUMERIC)
                 - COALESCE((_item->>'discount_usd')::NUMERIC, 0);
    INSERT INTO public.sale_items(sale_id, product_id, product_name, qty, unit_price_usd, discount_usd, line_total_usd)
      VALUES (_sale_id, (_item->>'product_id')::UUID, _product_name,
              (_item->>'qty')::INT, (_item->>'unit_price_usd')::NUMERIC,
              COALESCE((_item->>'discount_usd')::NUMERIC,0), _line_total);
  END LOOP;

  -- payments
  IF _payments IS NOT NULL THEN
    FOR _pay IN SELECT * FROM jsonb_array_elements(_payments) LOOP
      IF (_pay->>'currency') = 'CDF' THEN
        _amount_usd := ROUND((_pay->>'amount')::NUMERIC / NULLIF(_rate,0), 2);
      ELSE
        _amount_usd := (_pay->>'amount')::NUMERIC;
      END IF;
      _paid := _paid + _amount_usd;
      INSERT INTO public.payments(sale_id, method, amount, currency, amount_usd, reference)
        VALUES (_sale_id, (_pay->>'method')::public.payment_method,
                (_pay->>'amount')::NUMERIC, (_pay->>'currency')::public.currency_code,
                _amount_usd, _pay->>'reference');
    END LOOP;
  END IF;

  _credit := GREATEST(_total - _paid, 0);

  UPDATE public.sales SET paid_usd = _paid, credit_usd = _credit WHERE id = _sale_id;

  IF _credit > 0 THEN
    IF _customer_id IS NULL THEN RAISE EXCEPTION 'credit_requires_customer'; END IF;
    INSERT INTO public.customer_ledger(customer_id, delta, reason, ref_id, user_id)
      VALUES (_customer_id, _credit, 'sale_credit', _sale_id, _uid);
    UPDATE public.customers SET balance = balance + _credit WHERE id = _customer_id;
  END IF;

  INSERT INTO public.activity_log(user_id, action, entity, entity_id, metadata)
    VALUES (_uid, 'sale.create', 'sales', _sale_id, jsonb_build_object('total_usd',_total,'code',_code));

  RETURN _sale_id;
END; $$;

REVOKE ALL ON FUNCTION public.create_pos_sale(UUID, JSONB, JSONB, NUMERIC, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pos_sale(UUID, JSONB, JSONB, NUMERIC, TEXT, UUID) TO authenticated;

-- ============ CANCEL SALE ============
CREATE OR REPLACE FUNCTION public.cancel_sale(_sale_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _row RECORD;
  _item RECORD;
BEGIN
  IF NOT public.has_any_role(_uid, ARRAY['admin','manager']::public.app_role[]) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _row FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF _row.status <> 'completed' THEN RAISE EXCEPTION 'not_cancellable'; END IF;

  FOR _item IN SELECT * FROM public.sale_items WHERE sale_id = _sale_id LOOP
    UPDATE public.products SET stock = stock + _item.qty WHERE id = _item.product_id;
    INSERT INTO public.stock_movements(product_id, delta, reason, ref_type, ref_id, user_id)
      VALUES (_item.product_id, _item.qty, 'sale_cancel', 'sale', _sale_id, _uid);
  END LOOP;

  IF _row.credit_usd > 0 AND _row.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_ledger(customer_id, delta, reason, ref_id, user_id)
      VALUES (_row.customer_id, -_row.credit_usd, 'sale_cancel', _sale_id, _uid);
    UPDATE public.customers SET balance = balance - _row.credit_usd WHERE id = _row.customer_id;
  END IF;

  UPDATE public.sales SET status = 'cancelled' WHERE id = _sale_id;
  INSERT INTO public.activity_log(user_id, action, entity, entity_id) VALUES (_uid,'sale.cancel','sales',_sale_id);
END; $$;
REVOKE ALL ON FUNCTION public.cancel_sale(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_sale(UUID) TO authenticated;

-- ============ CUSTOMER PAYMENT ============
CREATE OR REPLACE FUNCTION public.record_customer_payment(_customer_id UUID, _amount NUMERIC, _note TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _lid UUID := gen_random_uuid();
BEGIN
  IF NOT public.has_any_role(_uid, ARRAY['admin','manager','caissier']::public.app_role[]) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  INSERT INTO public.customer_ledger(id, customer_id, delta, reason, user_id)
    VALUES (_lid, _customer_id, -_amount, COALESCE(_note,'payment'), _uid);
  UPDATE public.customers SET balance = balance - _amount WHERE id = _customer_id;
  INSERT INTO public.activity_log(user_id, action, entity, entity_id, metadata)
    VALUES (_uid,'customer.payment','customers',_customer_id, jsonb_build_object('amount',_amount));
  RETURN _lid;
END; $$;
REVOKE ALL ON FUNCTION public.record_customer_payment(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(UUID, NUMERIC, TEXT) TO authenticated;

-- ============ STOCK ADJUSTMENT ============
CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id UUID, _delta INT, _reason public.movement_reason, _note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _cur INT;
BEGIN
  IF NOT public.has_any_role(_uid, ARRAY['admin','manager']::public.app_role[]) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT stock INTO _cur FROM public.products WHERE id=_product_id FOR UPDATE;
  IF _cur IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;
  IF _cur + _delta < 0 THEN RAISE EXCEPTION 'negative_stock'; END IF;
  UPDATE public.products SET stock = stock + _delta, updated_at=now() WHERE id=_product_id;
  INSERT INTO public.stock_movements(product_id, delta, reason, note, user_id)
    VALUES (_product_id, _delta, _reason, _note, _uid);
  INSERT INTO public.activity_log(user_id, action, entity, entity_id, metadata)
    VALUES (_uid,'stock.adjust','products',_product_id, jsonb_build_object('delta',_delta,'reason',_reason));
END; $$;
REVOKE ALL ON FUNCTION public.adjust_stock(UUID, INT, public.movement_reason, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_stock(UUID, INT, public.movement_reason, TEXT) TO authenticated;
