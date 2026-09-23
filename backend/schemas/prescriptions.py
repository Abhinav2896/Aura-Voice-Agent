from pydantic import BaseModel, Field
from typing import Optional

class PrescriptionRequestCreate(BaseModel):
    call_id: Optional[str] = Field(None, description="Associated call UUID")
    patient_name: str = Field("John Parker", description="Patient name")
    patient_phone: Optional[str] = Field("07700 900456", description="Contact phone")
    patient_dob: Optional[str] = Field("22/11/1972", description="Date of birth")
    medication: str = Field(..., description="Medication requested (e.g. Amlodipine 5mg)")
    dosage: Optional[str] = Field("Standard repeat", description="Dosage and instructions")
    pharmacy_preference: Optional[str] = Field("Boots High St (Nominated)", description="EPS nominated pharmacy")
    notes: Optional[str] = Field(None, description="Notes on repeat status or review date")

class PrescriptionRequestResponse(BaseModel):
    id: str
    call_id: Optional[str] = None
    reference_id: str
    patient_name: str
    patient_phone: Optional[str] = None
    patient_dob: Optional[str] = None
    medication: str
    dosage: Optional[str] = None
    pharmacy_preference: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: str
