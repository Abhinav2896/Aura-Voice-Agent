import logging
from typing import Dict, Any
from backend.db.supabase import get_supabase
from backend.services.rag import search_practice_knowledge

logger = logging.getLogger("aura.tools.practice")

async def get_practice_information(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieve practice details (opening hours, address, services) or perform vector RAG search.
    """
    try:
        topic = args.get("topic", "general").lower()
        query = args.get("query", topic)
        supabase = get_supabase()

        # Retrieve core practice info
        res = supabase.table("practice_information").select("*").limit(1).execute()
        practice = res.data[0] if res.data else {
            "name": "Medical Practice",
            "phone": "020 7946 0123",
            "address": "124 St Mary's Road, London, SE1 5TY",
            "opening_hours": {
                "monday_friday": "08:00 - 18:30",
                "saturday": "09:00 - 13:00",
                "sunday": "Closed",
                "out_of_hours": "Call NHS 111"
            },
            "emergency_info": "For life-threatening emergencies, call 999 or attend A&E immediately."
        }

        # Perform RAG vector search for specific query if provided
        rag_context = ""
        if query and len(query) > 3:
            chunks = await search_practice_knowledge(query, match_threshold=0.35, match_count=3)
            if chunks:
                rag_context = "\n---\n".join([c["content"] for c in chunks])

        return {
            "success": True,
            "practice_name": practice.get("name", "Medical Practice"),
            "phone": practice.get("phone"),
            "address": practice.get("address"),
            "opening_hours": practice.get("opening_hours"),
            "emergency_guidance": practice.get("emergency_info"),
            "services_offered": practice.get("services_offered", []),
            "relevant_knowledge": rag_context or "General surgery policies apply."
        }
    except Exception as e:
        logger.error(f"Error executing get_practice_information: {e}", exc_info=True)
        return {
            "success": False,
            "practice_name": "Medical Practice",
            "opening_hours": "Monday to Friday 08:00 to 18:30, Saturday 09:00 to 13:00, Sunday Closed. Out of hours: NHS 111.",
            "phone": "020 7946 0123"
        }
