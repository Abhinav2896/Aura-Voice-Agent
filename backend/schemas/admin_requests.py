from pydantic import BaseModel, Field
from typing import Optional

class AdminRequestCreate(BaseModel):
    call_id: Optional[str] = Field(None, description="Associated call UUID")
    patient_name: str = Field("Michael Chang", description="Patient or caller name")
    patient_phone: Optional[str] = Field("07700 900789", description="Contact phone")
    category: str = Field("general", description="'opening_hours', 'test_results', 'referral', or 'general'")
    query: str = Field(..., description="Query asked by patient")
    response_summary: Optional[str] = Field(None, description="Summary of answer provided or action taken")
    status: Optional[str] = Field("answered", description="'answered', 'follow_up_required', 'pending_staff'")

class AdminRequestResponse(BaseModel):
    id: str
    call_id: Optional[str] = None
    reference_id: str
    patient_name: str
    patient_phone: Optional[str] = None
    category: str
    query: str
    response_summary: Optional[str] = None
    status: str
    created_at: str
