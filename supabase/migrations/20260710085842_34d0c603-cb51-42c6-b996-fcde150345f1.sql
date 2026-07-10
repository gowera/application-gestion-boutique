
-- Add missing roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technicien';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'livreur';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
