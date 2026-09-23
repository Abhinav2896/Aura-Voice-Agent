-- ============================================================================
-- Migration: 20260918000002_create_request_tables.sql
-- Description: Create appointment, prescription, admin enquiries, and escalation tables
-- ============================================================================

-- 1. Appointment Requests
CREATE TABLE IF NOT EXISTS public.appointment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
    reference_id TEXT UNIQUE NOT NULL, -- e.g. '#APT-1048'
    patient_name TEXT NOT NULL DEFAULT 'Sarah Wilson',
    patient_phone TEXT DEFAULT '07700 900123',
    patient_dob TEXT DEFAULT '14/05/1984',
    reason TEXT NOT NULL,
    duration TEXT,
    preferred_time TEXT DEFAULT 'Morning',
    urgency TEXT DEFAULT 'routine',
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apt_req_status ON public.appointment_requests (status);
CREATE INDEX IF NOT EXISTS idx_apt_req_created_at ON public.appointment_requests (created_at DESC);

-- 2. Prescription Requests
CREATE TABLE IF NOT EXISTS public.prescription_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
    reference_id TEXT UNIQUE NOT NULL, -- e.g. '#RX-8921'
    patient_name TEXT NOT NULL DEFAULT 'John Parker',
    patient_phone TEXT DEFAULT '07700 900456',
    patient_dob TEXT DEFAULT '22/11/1972',
    medication TEXT NOT NULL,
    dosage TEXT DEFAULT 'Standard Repeat',
    pharmacy_preference TEXT DEFAULT 'Boots High St (Nominated)',
    status TEXT NOT NULL DEFAULT 'pending_signature' CHECK (status IN ('pending_signature', 'approved', 'rejected', 'dispensed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rx_req_status ON public.prescription_requests (status);
CREATE INDEX IF NOT EXISTS idx_rx_req_created_at ON public.prescription_requests (created_at DESC);

-- 3. Admin Enquiries / Requests
CREATE TABLE IF NOT EXISTS public.admin_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
    reference_id TEXT UNIQUE NOT NULL, -- e.g. '#ADM-2045'
    patient_name TEXT NOT NULL DEFAULT 'Michael Chang',
    patient_phone TEXT DEFAULT '07700 900789',
    category TEXT NOT NULL, -- 'opening_hours', 'test_results', 'referral', 'general'
    query TEXT NOT NULL,
    response_summary TEXT,
    status TEXT NOT NULL DEFAULT 'answered' CHECK (status IN ('answered', 'follow_up_required', 'pending_staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_req_created_at ON public.admin_requests (created_at DESC);

-- 4. Escalations
CREATE TABLE IF NOT EXISTS public.escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
    reference_id TEXT UNIQUE NOT NULL, -- e.g. '#ESC-901'
    patient_name TEXT NOT NULL DEFAULT 'Emma Clarke',
    patient_phone TEXT DEFAULT '07700 900321',
    reason TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Urgent' CHECK (priority IN ('Urgent', 'High', 'Medium', 'Routine')),
    transferred_to TEXT NOT NULL DEFAULT 'Duty Clinician (Dr. Harrison)',
    status TEXT NOT NULL DEFAULT 'Escalated' CHECK (status IN ('Escalated', 'In Review', 'Resolved')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalations_status ON public.escalations (status);
CREATE INDEX IF NOT EXISTS idx_escalations_created_at ON public.escalations (created_at DESC);
