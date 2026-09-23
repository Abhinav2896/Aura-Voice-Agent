-- ============================================================================
-- Migration: 20260920000001_create_patients_and_profile_trigger.sql
-- Description: Patient profile table linked 1:1 to auth.users, with automatic
--              profile creation trigger on auth user signup.
-- ============================================================================

-- 1. Patient profile table, keyed 1:1 to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.patients (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name           TEXT NOT NULL DEFAULT '',
    phone               TEXT,
    dob                 TEXT,                     -- DD/MM/YYYY, matches existing free-text style
    address             TEXT,
    nominated_pharmacy  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Auto-create a profile row when a new auth user registers.
-- Pulls optional fields from the signup metadata (raw_user_meta_data).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.patients (id, full_name, phone, dob)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        NEW.raw_user_meta_data ->> 'phone',
        NEW.raw_user_meta_data ->> 'dob'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patients_updated_at ON public.patients;
CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
