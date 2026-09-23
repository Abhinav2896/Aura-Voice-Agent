import asyncio
import logging
from backend.db.supabase import get_supabase
from backend.services.embeddings import generate_embedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_knowledge")

KNOWLEDGE_CHUNKS = [
    # 1. Surgery Opening Hours & Out-of-Hours
    {
        "document_id": "b0000000-0000-0000-0000-000000000001",
        "content": "The surgery is open Monday to Friday from 08:00 to 18:30. On Saturdays, the surgery is open from 09:00 to 13:00 for pre-booked appointments only. The surgery is closed on Sundays and Bank Holidays. For urgent medical advice when the practice is closed, call NHS 111, which is free from landlines and mobile phones 24/7.",
        "metadata": {"topic": "opening_hours", "category": "practice_info", "days": "Mon-Fri 08:00-18:30, Sat 09:00-13:00"}
    },
    {
        "document_id": "b0000000-0000-0000-0000-000000000001",
        "content": "Medical Practice is located at 124 St Mary's Road, London, SE1 5TY. Our general telephone number is 020 7946 0123. Email enquiries can be sent to reception@medicalpractice.nhs.uk.",
        "metadata": {"topic": "contact", "category": "practice_info", "address": "124 St Mary's Road, London"}
    },
    # 2. Appointment Booking & Clinical Triage Policy
    {
        "document_id": "b0000000-0000-0000-0000-000000000002",
        "content": "Routine GP appointments can be booked up to two weeks in advance with choices of morning (08:30 - 12:30) and afternoon (14:00 - 18:00) clinics. All appointment requests undergo clinical triage by our reception team and duty GP. Urgent same-day slots are released every morning at 08:00 for acute conditions that cannot wait.",
        "metadata": {"topic": "appointments", "category": "booking_policy", "advance": "2 weeks"}
    },
    {
        "document_id": "b0000000-0000-0000-0000-000000000002",
        "content": "Patients presenting with persistent cough lasting for two weeks or more, unexplained weight loss, or persistent symptoms should request a routine face-to-face or telephone consultation for physical evaluation and chest auscultation. Home visits are reserved strictly for bed-bound or severely frail patients.",
        "metadata": {"topic": "persistent_cough", "category": "clinical_triage", "symptom": "cough"}
    },
    # 3. Electronic Repeat Prescription Guidance
    {
        "document_id": "b0000000-0000-0000-0000-000000000003",
        "content": "Repeat prescription requests take 48 hours (two working days) to be authorized by a GP. All signed prescriptions are transmitted electronically via the NHS Electronic Prescription Service (EPS) directly to the patient's nominated pharmacy, such as Boots High St or Lloyds. Aura logs requests for GP signature but never dispenses or prescribes medicine directly.",
        "metadata": {"topic": "repeat_prescriptions", "category": "pharmacy", "turnaround": "48 hours"}
    },
    {
        "document_id": "b0000000-0000-0000-0000-000000000003",
        "content": "Patients on regular repeat medicines like Amlodipine, Atorvastatin, or Salbutamol require an annual medication and blood pressure review. If your repeat authorization has expired, the duty doctor will review your notes before issuing an interim supply.",
        "metadata": {"topic": "medication_review", "category": "pharmacy", "review": "annual"}
    },
    # 4. Test Results & Phlebotomy Information
    {
        "document_id": "b0000000-0000-0000-0000-000000000004",
        "content": "Routine blood test, urine, and swab results normally take 3 to 5 working days to return from the hospital pathology laboratory. Imaging and ultrasound scans typically take 7 to 10 working days. Results are reviewed by the requesting GP and will be visible on the NHS App once reviewed.",
        "metadata": {"topic": "blood_tests", "category": "test_results", "turnaround": "3-5 days"}
    },
    {
        "document_id": "b0000000-0000-0000-0000-000000000004",
        "content": "Phlebotomy blood tests at the surgery run Monday to Friday from 08:30 to 11:30 by appointment. If your doctor requested a fasting blood test (e.g. fasting glucose or lipids), please do not eat or drink anything other than plain water for 12 hours prior to your blood test appointment.",
        "metadata": {"topic": "phlebotomy", "category": "clinics", "fasting": "12 hours"}
    },
    # 5. Emergency Red Flags & Immediate Safety Protocol
    {
        "document_id": "b0000000-0000-0000-0000-000000000005",
        "content": "For life-threatening emergencies, dial 999 immediately or attend the nearest Accident & Emergency (A&E) department. Critical red flags include: severe crushing central chest pain, acute shortness of breath, sudden facial weakness, arm weakness or slurred speech (FAST stroke signs), severe bleeding, or collapse.",
        "metadata": {"topic": "emergency", "category": "safety", "number": "999"}
    },
    {
        "document_id": "b0000000-0000-0000-0000-000000000005",
        "content": "If you experience signs of anaphylaxis such as throat tightness, difficulty breathing, or swollen lips and tongue, call 999 immediately. Aura voice receptionist will immediately warm-transfer red flag calls to the practice duty clinician.",
        "metadata": {"topic": "anaphylaxis", "category": "safety", "protocol": "immediate_escalation"}
    }
]

async def seed_chunks():
    supabase = get_supabase()
    logger.info("Cleaning existing knowledge chunks...")
    supabase.table("knowledge_chunks").delete().neq("content", "").execute()

    for idx, chunk in enumerate(KNOWLEDGE_CHUNKS, start=1):
        logger.info(f"Generating embedding for chunk {idx}/{len(KNOWLEDGE_CHUNKS)}: {chunk['metadata']['topic']}...")
        embedding = await generate_embedding(chunk["content"])

        payload = {
            "document_id": chunk["document_id"],
            "content": chunk["content"],
            "metadata": chunk["metadata"],
            "embedding": embedding
        }
        res = supabase.table("knowledge_chunks").insert(payload).execute()
        if res.data:
            logger.info(f"Chunk {idx} inserted successfully.")
        else:
            logger.error(f"Failed to insert chunk {idx}")

    logger.info("All knowledge chunks embedded and stored in Supabase with pgvector!")

if __name__ == "__main__":
    asyncio.run(seed_chunks())
