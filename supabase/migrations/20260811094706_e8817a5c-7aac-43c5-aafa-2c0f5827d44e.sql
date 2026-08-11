ALTER TABLE public.online_orders ADD COLUMN IF NOT EXISTS stock_applied boolean NOT NULL DEFAULT false;

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS x_url text;

CREATE OR REPLACE FUNCTION public.create_online_order(_customer_name text, _customer_phone text, _customer_email text, _delivery_mode delivery_mode, _delivery_address text, _delivery_fee_usd numeric, _items jsonb, _note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT stock, name, sale_price INTO _stock, _name, _price FROM public.products WHERE id=(_item->>'product_id')::UUID;
    IF _stock IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;
    IF _stock < (_item->>'qty')::INT THEN RAISE EXCEPTION 'insufficient_stock:%', _name; END IF;
    _line := _price * (_item->>'qty')::INT;
    _sub := _sub + _line;
    INSERT INTO public.order_items(order_id, product_id, product_name, qty, unit_price_usd, line_total_usd)
      VALUES (_oid, (_item->>'product_id')::UUID, _name, (_item->>'qty')::INT, _price, _line);
  END LOOP;
  UPDATE public.online_orders SET subtotal_usd=_sub, total_usd=_sub+COALESCE(_delivery_fee_usd,0) WHERE id=_oid;
  IF _uid IS NOT NULL THEN DELETE FROM public.cart_items WHERE user_id=_uid; END IF;
  INSERT INTO public.activity_log(user_id, action, entity, entity_id, metadata)
    VALUES (_uid,'order.create','online_orders',_oid, jsonb_build_object('total_usd',_sub,'code',_code));
  RETURN _oid;
END; $function$;

CREATE OR REPLACE FUNCTION public.apply_order_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _it RECORD; _uid UUID := auth.uid();
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' AND NEW.stock_applied = false THEN
    FOR _it IN SELECT * FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
      UPDATE public.products SET stock = GREATEST(stock - _it.qty, 0), updated_at = now() WHERE id = _it.product_id;
      INSERT INTO public.stock_movements(product_id, delta, reason, ref_type, ref_id, user_id)
        VALUES (_it.product_id, -_it.qty, 'sale', 'order', NEW.id, _uid);
    END LOOP;
    NEW.stock_applied := true;
  ELSIF NEW.status IN ('cancelled','refunded') AND OLD.status IS DISTINCT FROM NEW.status AND OLD.stock_applied = true THEN
    FOR _it IN SELECT * FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
      UPDATE public.products SET stock = stock + _it.qty, updated_at = now() WHERE id = _it.product_id;
      INSERT INTO public.stock_movements(product_id, delta, reason, ref_type, ref_id, user_id)
        VALUES (_it.product_id, _it.qty, 'sale_cancel', 'order', NEW.id, _uid);
    END LOOP;
    NEW.stock_applied := false;
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_apply_order_stock ON public.online_orders;
CREATE TRIGGER trg_apply_order_stock BEFORE UPDATE ON public.online_orders FOR EACH ROW EXECUTE FUNCTION public.apply_order_stock();