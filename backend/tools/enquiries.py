import logging
import random
from typing import Dict, Any
from backend.schemas.admin_requests import AdminRequestCreate
from backend.db.supabase import get_supabase

logger = logging.getLogger("aura.tools.enquiries")

async def create_admin_request(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Record an administrative enquiry (opening hours, test results policy, registrations).
    """
    try:
        request_data = AdminRequestCreate(**args)
        supabase = get_supabase()

        random_suffix = random.randint(2045, 9999)
        ref_id = f"#ADM-{random_suffix}"

        insert_payload = {
            "reference_id": ref_id,
            "patient_name": request_data.patient_name,
            "patient_phone": request_data.patient_phone,
            "category": request_data.category,
            "query": request_data.query,
            "response_summary": request_data.response_summary or "Information provided from practice knowledge base.",
            "status": request_data.status or "answered",
        }
        if request_data.call_id:
            insert_payload["call_id"] = request_data.call_id
        if args.get("user_id"):
            insert_payload["user_id"] = args["user_id"]

        res = supabase.table("admin_requests").insert(insert_payload).execute()

        if not res.data or len(res.data) == 0:
            raise RuntimeError("Failed to insert admin enquiry into database")

        created = res.data[0]
        logger.info(f"Admin request recorded: {ref_id} - {request_data.query}")

        return {
            "success": True,
            "request_id": created["id"],
            "reference_id": ref_id,
            "status": created["status"],
            "message": f"Administrative enquiry logged under reference {ref_id}.",
            "next_action": "Completed and logged in patient query audit",
        }
    except Exception as e:
        logger.error(f"Error executing create_admin_request: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to log admin enquiry."
        }
