CREATE TABLE IF NOT EXISTS public.message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp','sms','note')),
  body TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_replies TO authenticated;
GRANT ALL ON public.message_replies TO service_role;

ALTER TABLE public.message_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read replies" ON public.message_replies FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','vendeur','caissier']::public.app_role[]));

CREATE POLICY "staff insert replies" ON public.message_replies FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','vendeur','caissier']::public.app_role[]));

CREATE INDEX IF NOT EXISTS message_replies_quote_idx ON public.message_replies(quote_request_id, created_at DESC);