import re
import secrets
import logging
from datetime import date
from typing import Optional
from backend.services.extraction import extract_call_details
from backend.db.supabase import get_supabase

logger = logging.getLogger("aura.services.summary")

async def process_post_call_summary(
    call_id: str,
    transcript: str,
    active_user_id: Optional[str] = None,
    duration_seconds: Optional[int] = None,
    duration_display: Optional[str] = None,
):
    """
    Run post-call extraction with Gemini 3.5 Flash-Lite and update Supabase call record.

    For guest calls (no verified account), the caller's real name/phone captured by
    the scribe is backfilled onto the call record so the admin log shows the actual
    patient instead of the neutral "Guest Caller" placeholder. Authenticated calls
    keep their verified account name and phone untouched.
    """
    try:
        extracted = await extract_call_details(transcript)
        supabase = get_supabase()

        intent_map = {
            "appointment_request": "Appointment",
            "prescription_request": "Prescription",
            "clinical_escalation": "Escalated",
            "admin_enquiry": "Admin",
        }
        db_intent = intent_map.get(extracted.intent, "Appointment")
        db_status = "Escalated" if extracted.urgency in ["urgent", "emergency"] else "Completed"

        update_payload = {
            "summary": extracted.summary,
            "intent": db_intent,
            "status": db_status,
            "urgency": extracted.urgency,
            "requires_human_review": extracted.requires_human_review,
            "extracted_data": extracted.model_dump(),
        }
        if duration_seconds is not None:
            update_payload["duration_seconds"] = duration_seconds
        if duration_display is not None:
            update_payload["duration_display"] = duration_display

        # Guests only: backfill the identity the scribe heard so the admin log
        # shows the real caller. Never overwrite a verified account's name/phone.
        if not active_user_id:
            if extracted.patient_name:
                update_payload["caller_name"] = extracted.patient_name
            if extracted.mobile_number:
                update_payload["caller_phone"] = extracted.mobile_number

        res = supabase.table("calls").update(update_payload).eq("id", call_id).execute()
        logger.info(f"Post-call summary updated for call {call_id}")

        # CLINICAL FAIL-SAFE: If an appointment request was agreed during the call
        # but the LLM omitted the real-time tool call, auto-recover and create the
        # appointment_requests row so the clinical queue NEVER loses a patient request.
        if extracted.intent == "appointment_request" and (extracted.patient_name or active_user_id):
            try:
                existing_appt = supabase.table("appointment_requests").select("id").eq("call_id", call_id).execute()
                if not existing_appt.data:
                    logger.warning(f"Post-call recovery: Auto-creating missing appointment request for call {call_id}")
                    ref_match = re.search(r"#APT-[A-Z0-9]+", transcript, re.IGNORECASE)
                    if ref_match:
                        ref_id = ref_match.group(0).upper()
                    else:
                        _REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
                        ref_id = "#APT-" + "".join(secrets.choice(_REF_ALPHABET) for _ in range(6))

                    appt_payload = {
                        "reference_id": ref_id,
                        "call_id": call_id,
                        "patient_name": extracted.patient_name or "Guest Caller",
                        "patient_phone": extracted.mobile_number or (update_payload.get("caller_phone") or ""),
                        "reason": extracted.reason or "GP Consultation",
                        "preferred_date": extracted.preferred_date or str(date.today()),
                        "preferred_time": extracted.preferred_time or "Morning",
                        "urgency": extracted.urgency or "routine",
                        "status": "pending_review",
                        "notes": f"Voice Agent Request - {extracted.reason or 'Consultation'} [Auto-recovered]",
                    }
                    if active_user_id:
                        appt_payload["user_id"] = active_user_id
                    supabase.table("appointment_requests").insert(appt_payload).execute()
                    logger.info(f"Auto-recovered appointment request {ref_id} for call {call_id}")
            except Exception as appt_err:
                logger.error(f"Error auto-recovering appointment request: {appt_err}")

        # CLINICAL FAIL-SAFE for prescription requests:
        if extracted.intent == "prescription_request" and (extracted.patient_name or active_user_id):
            try:
                existing_rx = supabase.table("prescription_requests").select("id").eq("call_id", call_id).execute()
                if not existing_rx.data:
                    logger.warning(f"Post-call recovery: Auto-creating missing prescription request for call {call_id}")
                    ref_match = re.search(r"#RX-[A-Z0-9]+", transcript, re.IGNORECASE)
                    if ref_match:
                        ref_id = ref_match.group(0).upper()
                    else:
                        _REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
                        ref_id = "#RX-" + "".join(secrets.choice(_REF_ALPHABET) for _ in range(6))

                    rx_payload = {
                        "reference_id": ref_id,
                        "call_id": call_id,
                        "patient_name": extracted.patient_name or "Guest Caller",
                        "patient_phone": extracted.mobile_number or (update_payload.get("caller_phone") or ""),
                        "medication_name": extracted.reason or "Repeat Medication",
                        "status": "pending_review",
                    }
                    if active_user_id:
                        rx_payload["user_id"] = active_user_id
                    supabase.table("prescription_requests").insert(rx_payload).execute()
                    logger.info(f"Auto-recovered prescription request {ref_id} for call {call_id}")
            except Exception as rx_err:
                logger.error(f"Error auto-recovering prescription request: {rx_err}")

        return {"success": True, "extracted": extracted.model_dump(), "data": res.data}
    except Exception as e:
        logger.error(f"Error processing post-call summary: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
