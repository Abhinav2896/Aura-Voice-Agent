import logging
from typing import Dict, Any, List, Optional
from backend.schemas.calls import CallCreate, CallMessageSchema
from backend.db.supabase import get_supabase

logger = logging.getLogger("aura.tools.calls")

async def save_call(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Save complete call record and optional transcript messages to Supabase.
    """
    try:
        supabase = get_supabase()
        call_in = CallCreate(**data)

        # Insert call record
        insert_data = {
            "caller_name": call_in.caller_name,
            "caller_phone": call_in.caller_phone,
            "intent": call_in.intent,
            "summary": call_in.summary or "",
            "duration_seconds": call_in.duration_seconds,
            "duration_display": call_in.duration_display,
            "status": call_in.status,
            "urgency": call_in.urgency,
            "requires_human_review": call_in.requires_human_review,
            "extracted_data": call_in.extracted_data or {},
        }
        if data.get("user_id"):
            insert_data["user_id"] = data["user_id"]

        res = supabase.table("calls").insert(insert_data).execute()
        if not res.data or len(res.data) == 0:
            raise RuntimeError("Failed to insert call record")

        saved_call = res.data[0]
        call_id = saved_call["id"]

        # Insert messages if present
        if call_in.messages:
            msg_rows = [
                {
                    "call_id": call_id,
                    "role": m.role,
                    "content": m.content,
                    **({"user_id": data["user_id"]} if data.get("user_id") else {})
                }
                for m in call_in.messages
            ]
            supabase.table("call_messages").insert(msg_rows).execute()

        logger.info(f"Call #{saved_call.get('call_number')} saved: {call_id}")
        return {
            "success": True,
            "call_id": call_id,
            "call_number": saved_call.get("call_number"),
            "status": saved_call["status"],
            "call": saved_call
        }
    except Exception as e:
        logger.error(f"Error saving call: {e}", exc_info=True)
        return {"success": False, "error": str(e)}

async def save_call_summary(call_id: str, summary_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update an existing call with extracted summary and structured fields.
    """
    try:
        supabase = get_supabase()
        update_data = {
            "summary": summary_data.get("summary"),
            "intent": summary_data.get("intent", "Appointment"),
            "urgency": summary_data.get("urgency", "routine"),
            "requires_human_review": summary_data.get("requires_human_review", True),
            "extracted_data": summary_data,
        }
        res = supabase.table("calls").update(update_data).eq("id", call_id).execute()
        return {"success": True, "call_id": call_id, "data": res.data}
    except Exception as e:
        logger.error(f"Error updating call summary: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
