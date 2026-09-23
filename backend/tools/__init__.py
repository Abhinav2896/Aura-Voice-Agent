from .appointments import create_appointment_request, get_my_appointment
from .prescriptions import create_prescription_request
from .enquiries import create_admin_request
from .practice import get_practice_information
from .escalation import escalate_to_reception
from .calls import save_call, save_call_summary

# Tool dispatcher registry mapping function name to callable
TOOL_REGISTRY = {
    "book_appointment": create_appointment_request,
    "create_appointment_request": create_appointment_request,
    "get_my_appointment": get_my_appointment,
    "request_prescription": create_prescription_request,
    "create_prescription_request": create_prescription_request,
    "submit_admin_enquiry": create_admin_request,
    "create_admin_request": create_admin_request,
    "get_practice_info": get_practice_information,
    "get_practice_information": get_practice_information,
    "escalate_to_staff": escalate_to_reception,
    "escalate_to_reception": escalate_to_reception,
    "save_call": save_call,
    "save_call_summary": save_call_summary,
}

async def execute_tool(tool_name: str, args: dict) -> dict:
    handler = TOOL_REGISTRY.get(tool_name)
    if not handler:
        return {
            "success": False,
            "error": f"Unknown tool: {tool_name}",
            "message": f"Tool '{tool_name}' is not registered."
        }
    return await handler(args)
