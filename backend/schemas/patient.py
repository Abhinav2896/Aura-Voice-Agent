from typing import Optional
from pydantic import BaseModel, Field

class PatientProfile(BaseModel):
    id: str
    full_name: str = ""
    phone: Optional[str] = None
    dob: Optional[str] = None
    address: Optional[str] = None
    nominated_pharmacy: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class PatientProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    address: Optional[str] = None
    nominated_pharmacy: Optional[str] = None

class GuestLookupRequest(BaseModel):
    reference_id: str = Field(..., description="Reference ID (e.g., #APT-1048, #RX-8921)")
    phone: str = Field(..., description="Patient mobile phone number for verification")

class GuestLookupResponse(BaseModel):
    found: bool
    reference_id: str
    request_type: str
    status: str
    preferred_time: Optional[str] = None
    created_at: Optional[str] = None
    message: str
