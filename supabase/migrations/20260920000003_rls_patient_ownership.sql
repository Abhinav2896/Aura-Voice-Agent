-- ============================================================================
-- Migration: 20260920000003_rls_patient_ownership.sql
-- Description: RLS policies for patient profile and record ownership
-- ============================================================================

-- 1. Enable RLS on patients table
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 2. Service role full access on patients
DROP POLICY IF EXISTS patients_service_all ON public.patients;
CREATE POLICY patients_service_all ON public.patients
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Patient can read and update ONLY their own profile
DROP POLICY IF EXISTS patients_select_own ON public.patients;
CREATE POLICY patients_select_own ON public.patients
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS patients_update_own ON public.patients;
CREATE POLICY patients_update_own ON public.patients
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Per-user read on record tables (defense-in-depth; backend still mediates in model A)
DROP POLICY IF EXISTS calls_select_own ON public.calls;
CREATE POLICY calls_select_own ON public.calls
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS call_messages_select_own ON public.call_messages;
CREATE POLICY call_messages_select_own ON public.call_messages
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS apt_req_select_own ON public.appointment_requests;
CREATE POLICY apt_req_select_own ON public.appointment_requests
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS rx_req_select_own ON public.prescription_requests;
CREATE POLICY rx_req_select_own ON public.prescription_requests
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS admin_req_select_own ON public.admin_requests;
CREATE POLICY admin_req_select_own ON public.admin_requests
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS escalations_select_own ON public.escalations;
CREATE POLICY escalations_select_own ON public.escalations
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
