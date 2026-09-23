import re
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional

class AppointmentRequestCreate(BaseModel):
    call_id: Optional[str] = Field(None, description="Associated call UUID if inside a call")
    patient_name: Optional[str] = Field(None, description="Full name of patient")
    patient_phone: Optional[str] = Field(None, description="Contact mobile number")
    patient_dob: Optional[str] = Field(None, description="Date of birth")
    reason: str = Field(..., description="Chief complaint or reason e.g. persistent cough")
    duration: Optional[str] = Field(None, description="Duration of symptoms")
    preferred_date: Optional[str] = Field(None, description="Preferred calendar date, ideally YYYY-MM-DD")
    preferred_time: Optional[str] = Field(None, description="Preferred time: Morning, Afternoon, Any")
    urgency: Optional[str] = Field("routine", description="routine or urgent")
    notes: Optional[str] = Field(None, description="Additional triage or symptom notes")

    @field_validator("patient_phone")
    @classmethod
    def normalize_phone(cls, v: Optional[str]) -> Optional[str]:
        # Store a normalized digit string (keep a single leading + if given as
        # international). Keeps matching consistent for later secure lookups.
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            return None
        digits = re.sub(r"[^\d]", "", stripped)
        return digits or None

    @field_validator("preferred_date")
    @classmethod
    def normalize_date(cls, v: Optional[str]) -> Optional[str]:
        # Best-effort normalize to YYYY-MM-DD. If the value can't be parsed,
        # leave it untouched rather than raising — the agent is instructed to
        # confirm ambiguous dates with the patient before submitting.
        if v is None:
            return v
        raw = v.strip()
        if not raw:
            return None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d %B %Y", "%d %b %Y", "%B %d %Y", "%b %d %Y"):
            try:
                return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return raw

class AppointmentLookup(BaseModel):
    # Secure lookup requires BOTH identifiers — never name alone.
    patient_name: str = Field(..., min_length=1, description="Patient's full name")
    patient_phone: str = Field(..., min_length=1, description="Patient's mobile number")

    @field_validator("patient_name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("patient_name is required for lookup")
        return v.strip()

    @field_validator("patient_phone")
    @classmethod
    def phone_to_digits(cls, v: str) -> str:
        digits = re.sub(r"[^\d]", "", v or "")
        if not digits:
            raise ValueError("patient_phone is required for lookup")
        return digits

class AppointmentRequestResponse(BaseModel):
    id: str
    call_id: Optional[str] = None
    reference_id: str
    patient_name: str
    patient_phone: Optional[str] = None
    patient_dob: Optional[str] = None
    reason: str
    duration: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    urgency: str
    status: str
    notes: Optional[str] = None
    created_at: str

class AppointmentUpdateRequest(BaseModel):
    status: Optional[str] = Field(None, description="pending_review, confirmed, cancelled, completed")
    preferred_date: Optional[str] = Field(None, description="Appointment date YYYY-MM-DD")
    preferred_time: Optional[str] = Field(None, description="Appointment slot time")
    notes: Optional[str] = Field(None, description="Staff or clinician notes")
    reason: Optional[str] = Field(None, description="Clinical reason or symptoms")
    urgency: Optional[str] = Field(None, description="routine or urgent")
    patient_name: Optional[str] = Field(None, description="Patient full name")
    patient_phone: Optional[str] = Field(None, description="Patient mobile number")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"pending_review", "confirmed", "cancelled", "completed", "pending"}
        if v not in allowed:
            raise ValueError(f"status must be one of {sorted(allowed)}")
        return "pending_review" if v == "pending" else v

    @field_validator("preferred_date")
    @classmethod
    def normalize_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        raw = v.strip()
        if not raw:
            return None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d %B %Y", "%d %b %Y", "%B %d %Y", "%b %d %Y"):
            try:
                return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return raw

