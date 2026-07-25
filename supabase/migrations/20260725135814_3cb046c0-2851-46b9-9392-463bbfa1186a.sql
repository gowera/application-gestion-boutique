
CREATE TABLE public.document_counters (
  doc_type text NOT NULL CHECK (doc_type IN ('facture','recu')),
  year int NOT NULL,
  last_number int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (doc_type, year)
);
GRANT SELECT ON public.document_counters TO authenticated;
GRANT ALL ON public.document_counters TO service_role;
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counters_read_staff" ON public.document_counters FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur','comptable']::public.app_role[]));

CREATE TABLE public.document_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (doc_type IN ('facture','recu')),
  doc_number int NOT NULL,
  code text NOT NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_name text,
  total_usd numeric(12,2) NOT NULL DEFAULT 0,
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_type, doc_number),
  UNIQUE (code)
);
GRANT SELECT, INSERT ON public.document_registry TO authenticated;
GRANT ALL ON public.document_registry TO service_role;
ALTER TABLE public.document_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registry_read_staff" ON public.document_registry FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur','comptable']::public.app_role[]));
CREATE POLICY "registry_insert_staff" ON public.document_registry FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','caissier','vendeur']::public.app_role[]));

CREATE INDEX document_registry_created_at_idx ON public.document_registry (created_at DESC);
CREATE INDEX document_registry_sale_id_idx ON public.document_registry (sale_id);
CREATE INDEX document_registry_code_idx ON public.document_registry (code);

CREATE OR REPLACE FUNCTION public.issue_document_number(
  _doc_type text,
  _sale_id uuid DEFAULT NULL,
  _customer_name text DEFAULT NULL,
  _total_usd numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _year int := extract(year from now())::int;
  _n int;
  _prefix text;
  _code text;
  _id uuid := gen_random_uuid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['admin','manager','caissier','vendeur']::public.app_role[]) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _doc_type NOT IN ('facture','recu') THEN RAISE EXCEPTION 'invalid_type'; END IF;

  INSERT INTO public.document_counters(doc_type, year, last_number)
    VALUES (_doc_type, _year, 1)
    ON CONFLICT (doc_type, year)
    DO UPDATE SET last_number = public.document_counters.last_number + 1, updated_at = now()
    RETURNING last_number INTO _n;

  _prefix := CASE _doc_type WHEN 'facture' THEN 'FACT' ELSE 'RECU' END;
  _code := _prefix || '-' || _year::text || '-' || lpad(_n::text, 5, '0');

  INSERT INTO public.document_registry(id, doc_type, doc_number, code, sale_id, customer_name, total_usd, generated_by)
    VALUES (_id, _doc_type, _n, _code, _sale_id, _customer_name, COALESCE(_total_usd, 0), _uid);

  RETURN jsonb_build_object('id', _id, 'code', _code, 'number', _n, 'doc_type', _doc_type, 'year', _year);
END; $$;
