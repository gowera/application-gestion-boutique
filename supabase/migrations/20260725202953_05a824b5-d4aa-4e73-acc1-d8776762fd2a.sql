CREATE TABLE public.product_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX product_reviews_product_idx ON public.product_reviews(product_id);
GRANT SELECT ON public.product_reviews TO anon;
GRANT INSERT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published reviews" ON public.product_reviews FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can submit a review" ON public.product_reviews FOR INSERT WITH CHECK (rating BETWEEN 1 AND 5 AND length(author_name) BETWEEN 2 AND 80 AND (comment IS NULL OR length(comment) <= 1000));
CREATE POLICY "Staff can manage reviews" ON public.product_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can delete reviews" ON public.product_reviews FOR DELETE TO authenticated USING (true);