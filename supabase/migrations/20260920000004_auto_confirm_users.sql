-- ============================================================================
-- Migration: 20260920000004_auto_confirm_users.sql
-- Description: Automatically confirm email for all new user registrations
--              so link confirmation is never required.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_user
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_new_user();

-- Ensure any previously unconfirmed users are confirmed
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
