import logging
import random
from typing import Dict, Any
from backend.schemas.prescriptions import PrescriptionRequestCreate
from backend.db.supabase import get_supabase

logger = logging.getLogger("aura.tools.prescriptions")

async def create_prescription_request(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate repeat prescription request and insert into Supabase for GP signature.
    Safety constraint: AI records the request only, does not prescribe medication.
    """
    try:
        request_data = PrescriptionRequestCreate(**args)
        supabase = get_supabase()

        random_suffix = random.randint(8920, 9999)
        ref_id = f"#RX-{random_suffix}"

        insert_payload = {
            "reference_id": ref_id,
            "patient_name": request_data.patient_name,
            "patient_phone": request_data.patient_phone,
            "patient_dob": request_data.patient_dob,
            "medication": request_data.medication,
            "dosage": request_data.dosage or "Standard repeat",
            "pharmacy_preference": request_data.pharmacy_preference or "Nominated Pharmacy",
            "status": "pending_signature",
            "notes": request_data.notes or f"Repeat request received via Aura Voice Agent. Awaiting GP EPS digital authorization.",
        }
        if request_data.call_id:
            insert_payload["call_id"] = request_data.call_id
        if args.get("user_id"):
            insert_payload["user_id"] = args["user_id"]

        res = supabase.table("prescription_requests").insert(insert_payload).execute()

        if not res.data or len(res.data) == 0:
            raise RuntimeError("Failed to insert prescription request into database")

        created = res.data[0]
        logger.info(f"Prescription request created: {ref_id} for {request_data.medication}")

        return {
            "success": True,
            "request_id": created["id"],
            "reference_id": ref_id,
            "status": "pending_signature",
            "message": f"Repeat request for {request_data.medication} recorded under reference {ref_id}. Sent to GP electronic signature queue.",
            "next_action": "Sent to GP electronic signature queue in EPS",
        }
    except Exception as e:
        logger.error(f"Error executing create_prescription_request: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to log prescription request. Please order through the NHS App or contact surgery."
        }
