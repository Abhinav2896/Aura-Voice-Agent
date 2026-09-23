-- ============================================================================
-- Migration: 20260918000001_create_core_schema.sql
-- Description: Enable pgvector and create core tables for Aura Voice Agent
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Practice Information table
CREATE TABLE IF NOT EXISTS public.practice_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Medical Practice',
    tagline TEXT DEFAULT 'Care • Community • Healthier Tomorrows',
    phone TEXT DEFAULT '020 7946 0123',
    address TEXT DEFAULT '124 St Mary''s Road, London, SE1 5TY',
    opening_hours JSONB NOT NULL DEFAULT '{
        "monday_friday": "08:00 - 18:30",
        "saturday": "09:00 - 13:00",
        "sunday": "Closed",
        "out_of_hours": "Call NHS 111"
    }'::jsonb,
    emergency_info TEXT DEFAULT 'If you are experiencing a life-threatening emergency, call 999 or attend A&E immediately.',
    services_offered TEXT[] DEFAULT ARRAY[
        'GP Consultations',
        'Repeat Prescriptions',
        'Blood Tests',
        'Chronic Disease Reviews',
        'Vaccinations & Immunisations',
        'Cervical Screening'
    ],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Knowledge Documents & Chunks for RAG
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'appointments', 'prescriptions', 'practice_info', 'test_results', 'emergency', 'referrals'
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast cosine similarity vector search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding 
ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- Match knowledge chunks RPC function for FastAPI RAG retrieval
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks (
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 4
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.document_id,
        kc.content,
        kc.metadata,
        1 - (kc.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_chunks kc
    WHERE kc.embedding IS NOT NULL
      AND 1 - (kc.embedding <=> query_embedding) > match_threshold
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 4. Calls table
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_number SERIAL,
    caller_name TEXT NOT NULL DEFAULT 'Sarah Wilson',
    caller_phone TEXT DEFAULT '07700 900123',
    intent TEXT NOT NULL DEFAULT 'Appointment', -- 'Appointment', 'Prescription', 'Escalated', 'Admin'
    summary TEXT DEFAULT '',
    duration_seconds INT NOT NULL DEFAULT 0,
    duration_display TEXT NOT NULL DEFAULT '0:00',
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Completed', 'Escalated'
    extracted_data JSONB DEFAULT '{}'::jsonb,
    urgency TEXT DEFAULT 'routine', -- 'routine', 'urgent', 'emergency'
    requires_human_review BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_intent ON public.calls (intent);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls (status);

-- 5. Call Messages table (transcripts)
CREATE TABLE IF NOT EXISTS public.call_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_messages_call_id ON public.call_messages (call_id);
