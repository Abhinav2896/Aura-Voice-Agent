-- ============================================================================
-- Migration: 20260920000002_add_user_id_to_records.sql
-- Description: Add nullable user_id column to calls and request tables
-- ============================================================================

-- Nullable user_id (null = guest) on every record table. Mirrors the existing call_id FK style.
ALTER TABLE public.calls                 ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.call_messages         ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.appointment_requests  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.prescription_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.admin_requests        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.escalations           ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calls_user_id                 ON public.calls(user_id);
CREATE INDEX IF NOT EXISTS idx_apt_req_user_id               ON public.appointment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rx_req_user_id                ON public.prescription_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_req_user_id             ON public.admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_escalations_user_id           ON public.escalations(user_id);
CREATE INDEX IF NOT EXISTS idx_call_messages_user_id         ON public.call_messages(user_id);
