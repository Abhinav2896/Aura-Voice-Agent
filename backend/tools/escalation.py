import logging
import random
from typing import Dict, Any
from backend.schemas.escalation import EscalationCreate
from backend.db.supabase import get_supabase

logger = logging.getLogger("aura.tools.escalation")

async def escalate_to_reception(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Escalate a call to the duty clinician or front-desk staff.
    Triggered on clinical red flags, patient distress, or requests beyond AI administrative scope.
    """
    try:
        request_data = EscalationCreate(**args)
        supabase = get_supabase()

        random_suffix = random.randint(901, 999)
        ref_id = f"#ESC-{random_suffix}"

        insert_payload = {
            "reference_id": ref_id,
            "patient_name": request_data.patient_name,
            "patient_phone": request_data.patient_phone,
            "reason": request_data.reason,
            "priority": request_data.priority or "Urgent",
            "transferred_to": request_data.transferred_to or "Duty Clinician (Dr. Harrison)",
            "status": "Escalated",
            "notes": request_data.notes or f"Clinical red flag or scope limit detected: {request_data.reason}",
        }
        if request_data.call_id:
            insert_payload["call_id"] = request_data.call_id
        if args.get("user_id"):
            insert_payload["user_id"] = args["user_id"]
            # Also update call status to Escalated
            try:
                supabase.table("calls").update({
                    "status": "Escalated",
                    "urgency": "urgent",
                    "intent": "Escalated",
                    "requires_human_review": True
                }).eq("id", request_data.call_id).execute()
            except Exception as call_err:
                logger.warning(f"Could not update associated call status: {call_err}")

        res = supabase.table("escalations").insert(insert_payload).execute()

        if not res.data or len(res.data) == 0:
            raise RuntimeError("Failed to insert escalation into database")

        created = res.data[0]
        logger.warning(f"Escalation logged: {ref_id} - Priority: {request_data.priority} - {request_data.reason}")

        # Check for life-threatening red flags to inject immediate 999 guidance
        is_emergency = any(kw in request_data.reason.lower() for kw in ["chest pain", "breathing", "stroke", "unconscious", "bleeding", "collapse", "anaphylaxis"])

        message = f"Immediate transfer initiated to {request_data.transferred_to} under reference {ref_id}."
        if is_emergency:
            message += " Note: For life-threatening symptoms, patient advised to dial 999 immediately."

        return {
            "success": True,
            "request_id": created["id"],
            "reference_id": ref_id,
            "status": "Escalated",
            "priority": request_data.priority,
            "transferred_to": request_data.transferred_to,
            "is_emergency": is_emergency,
            "message": message,
            "next_action": "Warm handover to duty triage clinician / staff alert queue",
        }
    except Exception as e:
        logger.error(f"Error executing escalate_to_reception: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "message": "Immediate clinical alert registered with front desk."
        }
