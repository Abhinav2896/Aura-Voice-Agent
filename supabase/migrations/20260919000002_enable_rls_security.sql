-- ============================================================================
-- Migration: 20260919000002_enable_rls_security.sql
-- Description: Enable Row Level Security (RLS) across all tables with service_role
--              full access and secure role-based policies.
-- ============================================================================

-- 1. Enable RLS on all 9 tables
ALTER TABLE public.practice_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "service_role_practice_information" ON public.practice_information;
DROP POLICY IF EXISTS "anon_read_practice_information" ON public.practice_information;

DROP POLICY IF EXISTS "service_role_knowledge_documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "anon_read_knowledge_documents" ON public.knowledge_documents;

DROP POLICY IF EXISTS "service_role_knowledge_chunks" ON public.knowledge_chunks;
DROP POLICY IF EXISTS "anon_read_knowledge_chunks" ON public.knowledge_chunks;

DROP POLICY IF EXISTS "service_role_calls" ON public.calls;
DROP POLICY IF EXISTS "service_role_call_messages" ON public.call_messages;
DROP POLICY IF EXISTS "service_role_appointment_requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "service_role_prescription_requests" ON public.prescription_requests;
DROP POLICY IF EXISTS "service_role_admin_requests" ON public.admin_requests;
DROP POLICY IF EXISTS "service_role_escalations" ON public.escalations;

-- 3. Service Role full access policies (for backend operations)
CREATE POLICY "service_role_practice_information"
ON public.practice_information FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_knowledge_documents"
ON public.knowledge_documents FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_knowledge_chunks"
ON public.knowledge_chunks FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_calls"
ON public.calls FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_call_messages"
ON public.call_messages FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_appointment_requests"
ON public.appointment_requests FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_prescription_requests"
ON public.prescription_requests FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_admin_requests"
ON public.admin_requests FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_escalations"
ON public.escalations FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 4. Public read policies for public practice information and knowledge base
CREATE POLICY "anon_read_practice_information"
ON public.practice_information FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "anon_read_knowledge_documents"
ON public.knowledge_documents FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "anon_read_knowledge_chunks"
ON public.knowledge_chunks FOR SELECT TO anon, authenticated
USING (true);
