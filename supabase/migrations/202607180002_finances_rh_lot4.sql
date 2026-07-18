ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_terminated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS termination_reason TEXT,
  ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ;

ALTER TABLE public.salary_payments
  ADD COLUMN IF NOT EXISTS period_month TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_token TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

CREATE OR REPLACE FUNCTION public.invalidate_salary_confirmation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND COALESCE(OLD.confirmation_token, '') IS DISTINCT FROM COALESCE(NEW.confirmation_token, '') THEN
    NEW.confirmation_token := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invalidate_salary_confirmation ON public.salary_payments;
CREATE TRIGGER trg_invalidate_salary_confirmation
BEFORE UPDATE ON public.salary_payments
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_salary_confirmation();
