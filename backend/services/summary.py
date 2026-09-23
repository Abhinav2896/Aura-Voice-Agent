import logging
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
        return {"success": True, "extracted": extracted.model_dump(), "data": res.data}
    except Exception as e:
        logger.error(f"Error processing post-call summary: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
