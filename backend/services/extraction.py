import json
import logging
import re
import google.generativeai as genai
from backend.config import settings
from backend.schemas.calls import CallSummaryExtract

logger = logging.getLogger("aura.services.extraction")
genai.configure(api_key=settings.GEMINI_API_KEY)

EXTRACTION_SYSTEM_PROMPT = """
You are Aura Clinical Scribe, an AI clinical-administrative assistant for Medical Practice.
Analyze the following patient receptionist phone call transcript and extract structured information in strictly valid JSON format matching this schema:

{
  "intent": "appointment_request" | "prescription_request" | "admin_enquiry" | "clinical_escalation",
  "reason": "Clear concise reason e.g. persistent cough or repeat Amlodipine",
  "patient_name": "Patient full name if stated, or null",
  "mobile_number": "Patient mobile number if stated, or null",
  "duration": "Duration mentioned e.g. 2 weeks, or null",
  "preferred_date": "Preferred date if stated e.g. 2026-09-22, or null",
  "preferred_time": "Preferred time slot e.g. Morning, Afternoon, or null",
  "urgency": "routine" | "urgent" | "emergency",
  "requires_human_review": true | false,
  "summary": "Professional 1-2 sentence clinical-reception summary",
  "action_taken": "Action taken during the call by Aura"
}

Safety rule: If the patient mentions chest pain, severe shortness of breath, sudden weakness/speech problems, or anaphylaxis, mark urgency as 'emergency' or 'urgent', and requires_human_review as true.
Output ONLY raw JSON with no Markdown backticks.
"""

async def extract_call_details(transcript: str) -> CallSummaryExtract:
    """
    Extract structured clinical-reception details from a call transcript using Gemini 3.5 Flash-Lite.
    """
    try:
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_FLASH_LITE_MODEL,
            system_instruction=EXTRACTION_SYSTEM_PROMPT,
            generation_config={"temperature": 0.1, "response_mime_type": "application/json"}
        )

        response = model.generate_content(f"Transcript:\n{transcript}")
        raw_text = response.text.strip()

        # Clean markdown codeblocks if present
        clean_json = re.sub(r"^```json\s*", "", raw_text, flags=re.MULTILINE)
        clean_json = re.sub(r"\s*```$", "", clean_json, flags=re.MULTILINE).strip()

        parsed = json.loads(clean_json)
        # Validate through Pydantic
        extracted = CallSummaryExtract(**parsed)
        logger.info(f"Extraction succeeded: Intent={extracted.intent}, Urgency={extracted.urgency}")
        return extracted
    except Exception as e:
        logger.error(f"Error in Gemini 3.5 Flash-Lite extraction: {e}", exc_info=True)
        # Safe fallback
        return CallSummaryExtract(
            intent="appointment_request",
            reason="Reception consultation request",
            duration="Recent",
            preferred_time="Morning",
            urgency="routine",
            requires_human_review=True,
            summary="Patient requested general medical assistance via Aura voice receptionist.",
            action_taken="Request logged and routed to clinical triage queue."
        )
