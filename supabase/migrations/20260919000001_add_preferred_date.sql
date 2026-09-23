-- Add preferred_date to appointment_requests for the step-by-step booking workflow.
-- Additive and idempotent: preserves all existing rows. Stored as TEXT so a
-- best-effort-normalized (but imperfect) value from the voice agent never fails
-- the insert; the backend normalizes to YYYY-MM-DD before writing when it can.
-- The patient's mobile number continues to be stored in the existing
-- patient_phone column. preferred_time remains the time-of-day slot.

ALTER TABLE appointment_requests
  ADD COLUMN IF NOT EXISTS preferred_date TEXT;
