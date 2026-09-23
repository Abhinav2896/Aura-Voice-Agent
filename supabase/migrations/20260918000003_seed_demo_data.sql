-- ============================================================================
-- Migration: 20260918000003_seed_demo_data.sql
-- Description: Seed synthetic demonstration data for Aura Voice Agent
-- ============================================================================

-- 1. Seed Practice Information
INSERT INTO public.practice_information (id, name, tagline, phone, address, opening_hours, emergency_info, services_offered)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Medical Practice',
    'Care • Community • Healthier Tomorrows',
    '020 7946 0123',
    '124 St Mary''s Road, London, SE1 5TY',
    '{
        "monday_friday": "08:00 - 18:30",
        "saturday": "09:00 - 13:00",
        "sunday": "Closed",
        "out_of_hours": "Call NHS 111 (Free from landlines and mobiles)"
    }'::jsonb,
    'If you are experiencing severe chest pain, difficulty breathing, suspected stroke, or severe bleeding, please dial 999 immediately or attend the nearest Accident & Emergency (A&E) department.',
    ARRAY[
        'Routine and Urgent GP Consultations',
        'Electronic Repeat Prescriptions (EPS)',
        'Phlebotomy and Routine Blood Tests',
        'Chronic Disease Management (Asthma, Diabetes, Hypertension)',
        'Childhood Immunisations & Travel Vaccinations',
        'Cervical Screening & Women''s Health'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    opening_hours = EXCLUDED.opening_hours;

-- 2. Seed Knowledge Documents
INSERT INTO public.knowledge_documents (id, title, category, source)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Surgery Opening Hours & Out-of-Hours', 'practice_info', 'Practice Handbook v4'),
    ('b0000000-0000-0000-0000-000000000002', 'Appointment Booking & Clinical Triage Policy', 'appointments', 'Clinical Governance Guide'),
    ('b0000000-0000-0000-0000-000000000003', 'Electronic Repeat Prescription Guidance', 'prescriptions', 'Pharmacy Operations Policy'),
    ('b0000000-0000-0000-0000-000000000004', 'Test Results & Phlebotomy Information', 'test_results', 'Pathology Lab Protocol'),
    ('b0000000-0000-0000-0000-000000000005', 'Emergency Red Flags & Immediate Safety Protocol', 'emergency', 'Urgent Triage SOP')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Realistic Calls (Matching the 10 calls for dashboard)
INSERT INTO public.calls (id, call_number, caller_name, caller_phone, intent, summary, duration_seconds, duration_display, status, urgency, requires_human_review, created_at)
VALUES
    ('c0000000-0000-0000-0000-000000001047', 1047, 'Sarah Wilson', '07700 900123', 'Appointment', 'Request for GP appointment – persistent cough for 2 weeks. Preferred morning slot.', 134, '2:14', 'Pending', 'routine', true, now() - INTERVAL '15 minutes'),
    ('c0000000-0000-0000-0000-000000001046', 1046, 'John Parker', '07700 900456', 'Prescription', 'Repeat prescription for Amlodipine 5mg. Nominated pharmacy Boots High St confirmed.', 108, '1:48', 'Pending', 'routine', false, now() - INTERVAL '35 minutes'),
    ('c0000000-0000-0000-0000-000000001045', 1045, 'Emma Clarke', '07700 900321', 'Escalated', 'Chest tightness and shortness of breath – escalated immediately to duty clinician.', 206, '3:26', 'Escalated', 'urgent', true, now() - INTERVAL '1 hour'),
    ('c0000000-0000-0000-0000-000000001044', 1044, 'Michael Chang', '07700 900789', 'Admin', 'Enquiry regarding surgery opening hours on Saturday and phlebotomy availability.', 72, '1:12', 'Completed', 'routine', false, now() - INTERVAL '2 hours'),
    ('c0000000-0000-0000-0000-000000001043', 1043, 'David Evans', '07700 900890', 'Appointment', 'Childhood immunisation 8-week check booked with Practice Nurse.', 115, '1:55', 'Completed', 'routine', false, now() - INTERVAL '3 hours'),
    ('c0000000-0000-0000-0000-000000001042', 1042, 'Rachel Adams', '07700 900234', 'Admin', 'Enquiry about routine blood test results from pathology. Advised lab turnaround is 3-5 working days.', 84, '1:24', 'Completed', 'routine', false, now() - INTERVAL '4 hours'),
    ('c0000000-0000-0000-0000-000000001041', 1041, 'Hannah Wright', '07700 900567', 'Prescription', 'Repeat prescription for Salbutamol inhaler. Validated against repeat authorization.', 98, '1:38', 'Pending', 'routine', false, now() - INTERVAL '5 hours'),
    ('c0000000-0000-0000-0000-000000001040', 1040, 'George Miller', '07700 900678', 'Appointment', 'Requested face-to-face appointment for mild knee pain following weekend sport.', 142, '2:22', 'Pending', 'routine', true, now() - INTERVAL '6 hours'),
    ('c0000000-0000-0000-0000-000000001039', 1039, 'Lucy Patel', '07700 900901', 'Escalated', 'Child fever with rash and lethargy – warm handover to paediatric on-call GP.', 185, '3:05', 'Escalated', 'urgent', true, now() - INTERVAL '7 hours'),
    ('c0000000-0000-0000-0000-000000001038', 1038, 'Thomas Brown', '07700 900012', 'Admin', 'Enquiry on how to register a new family member online via NHS App.', 65, '1:05', 'Completed', 'routine', false, now() - INTERVAL '8 hours')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Appointment Requests
INSERT INTO public.appointment_requests (id, call_id, reference_id, patient_name, reason, duration, preferred_time, status, notes)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000001047', '#APT-1047', 'Sarah Wilson', 'Persistent cough', '2 weeks', 'Morning (09:00 - 11:00)', 'pending_review', 'Patient reports dry cough, no fever, no haemoptysis. Prefers morning slot.'),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000001043', '#APT-1043', 'David Evans', '8-week baby immunisations and physical check', 'Routine', 'Morning (10:30)', 'confirmed', 'Booked with Nurse Practitioner Jenny.'),
    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000001040', '#APT-1040', 'George Miller', 'Right knee pain after 5k run', '4 days', 'Afternoon (14:00 - 16:00)', 'pending_review', 'Mild swelling, weight bearing, requesting routine review.')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Prescription Requests
INSERT INTO public.prescription_requests (id, call_id, reference_id, patient_name, medication, dosage, pharmacy_preference, status, notes)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000001046', '#RX-8921', 'John Parker', 'Amlodipine', '5mg once daily (28 tablets)', 'Boots High St (Nominated)', 'pending_signature', 'Repeat authorization active until Dec 2026. Blood pressure checked last month.'),
    ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000001041', '#RX-8922', 'Hannah Wright', 'Salbutamol 100mcg Inhaler', '2 puffs as required', 'Lloyds Pharmacy (Nominated)', 'approved', 'Authorized by Dr. Harrison, EPS message transmitted.')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Admin Enquiries
INSERT INTO public.admin_requests (id, call_id, reference_id, patient_name, category, query, response_summary, status)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000001044', '#ADM-2044', 'Michael Chang', 'opening_hours', 'What time does the practice open on Saturdays?', 'Informed that the surgery is open Saturday 09:00 - 13:00 for pre-booked appointments only.', 'answered'),
    ('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000001042', '#ADM-2042', 'Rachel Adams', 'test_results', 'When will my routine blood test results be back?', 'Informed that routine blood tests typically take 3 to 5 working days to be reviewed by a GP.', 'answered'),
    ('f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000001038', '#ADM-2038', 'Thomas Brown', 'registration', 'How to register a new family member online?', 'Guided to complete the GMS1 registration form via the practice website or NHS App.', 'answered')
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Escalations
INSERT INTO public.escalations (id, call_id, reference_id, patient_name, reason, priority, transferred_to, status, notes)
VALUES
    ('fa000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000001045', '#ESC-901', 'Emma Clarke', 'Chest tightness, radiating pain to left shoulder', 'Urgent', 'Duty Clinician (Dr. Harrison)', 'Escalated', 'Patient advised to sit calmly while immediate clinician call connected; red flag alert triggered.'),
    ('fa000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000001039', '#ESC-902', 'Lucy Patel', 'High fever in 14-month infant with non-blanching spots', 'Urgent', 'On-call Paediatric GP', 'Resolved', 'Clinician accepted immediate transfer. Parents directed to Urgent Care Centre.')
ON CONFLICT (id) DO NOTHING;
