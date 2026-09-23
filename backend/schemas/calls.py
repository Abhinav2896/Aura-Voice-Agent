from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class CallMessageSchema(BaseModel):
    id: Optional[str] = None
    call_id: Optional[str] = None
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str
    created_at: Optional[str] = None

class CallCreate(BaseModel):
    caller_name: str = "Sarah Wilson"
    caller_phone: Optional[str] = "07700 900123"
    intent: str = "Appointment"
    summary: Optional[str] = ""
    duration_seconds: int = 0
    duration_display: str = "0:00"
    status: str = "Pending"
    urgency: str = "routine"
    requires_human_review: bool = True
    extracted_data: Optional[Dict[str, Any]] = None
    messages: Optional[List[CallMessageSchema]] = None

class CallUpdate(BaseModel):
    summary: Optional[str] = None
    duration_seconds: Optional[int] = None
    duration_display: Optional[str] = None
    status: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    intent: Optional[str] = None
    urgency: Optional[str] = None
    requires_human_review: Optional[bool] = None

class CallResponse(BaseModel):
    id: str
    call_number: int
    caller_name: str
    caller_phone: Optional[str] = None
    intent: str
    summary: Optional[str] = None
    duration_seconds: int
    duration_display: str
    status: str
    extracted_data: Optional[Dict[str, Any]] = None
    urgency: str
    requires_human_review: bool
    created_at: str
    messages: Optional[List[CallMessageSchema]] = None

class CallSummaryExtract(BaseModel):
    intent: str = Field(..., description="Main caller intent: 'appointment_request', 'prescription_request', 'admin_enquiry', 'clinical_escalation'")
    reason: str = Field(..., description="Primary reason for call or symptom description")
    patient_name: Optional[str] = Field(None, description="Patient full name if given")
    mobile_number: Optional[str] = Field(None, description="Patient mobile number if given")
    duration: Optional[str] = Field(None, description="Reported duration of symptoms/issue")
    preferred_date: Optional[str] = Field(None, description="Preferred appointment date if given")
    preferred_time: Optional[str] = Field(None, description="Preferred appointment slot e.g. morning/afternoon")
    urgency: str = Field("routine", description="'routine', 'urgent', or 'emergency'")
    requires_human_review: bool = Field(True, description="Whether staff review is needed")
    summary: str = Field(..., description="Concise clinical-administrative summary of the call")
    action_taken: str = Field(..., description="Action taken by the voice agent during the call")
