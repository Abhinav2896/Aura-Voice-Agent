from pydantic import BaseModel, Field
from typing import Optional

class EscalationCreate(BaseModel):
    call_id: Optional[str] = Field(None, description="Associated call UUID")
    patient_name: str = Field("Emma Clarke", description="Patient name")
    patient_phone: Optional[str] = Field("07700 900321", description="Contact phone")
    reason: str = Field(..., description="Red flag symptom or clinical escalation reason")
    priority: str = Field("Urgent", description="'Urgent', 'High', 'Medium', 'Routine'")
    transferred_to: str = Field("Duty Clinician (Dr. Harrison)", description="Staff role/clinician handed over to")
    notes: Optional[str] = Field(None, description="Clinical context or immediate instructions")

class EscalationResponse(BaseModel):
    id: str
    call_id: Optional[str] = None
    reference_id: str
    patient_name: str
    patient_phone: Optional[str] = None
    reason: str
    priority: str
    transferred_to: str
    status: str
    notes: Optional[str] = None
    created_at: str
