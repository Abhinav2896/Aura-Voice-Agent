import logging
import re
import secrets
from datetime import datetime, time, timedelta
from typing import Dict, Any, Optional
from backend.schemas.appointments import AppointmentRequestCreate, AppointmentLookup
from backend.db.supabase import get_supabase

logger = logging.getLogger("aura.tools.appointments")


def _mask_phone(phone: str) -> str:
    """Mask all but the last two digits for safe logging/display."""
    if not phone:
        return ""
    digits = re.sub(r"[^\d]", "", phone)
    if len(digits) <= 2:
        return "•" * len(digits)
    return "•" * (len(digits) - 2) + digits[-2:]


def parse_time_str(raw: Optional[str]) -> Optional[time]:
    """Parse time string like '11:00 AM', '11 AM', '14:30', 'Morning', 'Afternoon' into a standard time object."""
    if not raw:
        return None
    s = str(raw).strip().lower()

    # 1. Prioritize exact numeric times (e.g. '11:00 AM', '11 AM', '2:30 PM', '14:00', 'morning 11am')
    match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", s)
    if match and (match.group(3) or ":" in s or int(match.group(1)) in range(7, 24)):
        h = int(match.group(1))
        m = int(match.group(2)) if match.group(2) else 0
        ampm = match.group(3)
        if ampm == "pm" and h < 12:
            h += 12
        elif ampm == "am" and h == 12:
            h = 0

        # Round minutes to standard 30-min intervals (00 or 30)
        if m < 15:
            m = 0
        elif m < 45:
            m = 30
        else:
            m = 0
            h = (h + 1) % 24
        return time(h, m)

    # 2. General slot keywords if no exact hour was given
    if "afternoon" in s or "pm" in s:
        return time(14, 0)
    if "morning" in s or "am" in s:
        return time(9, 0)
    if "any" in s:
        return time(9, 0)

    return None



def resolve_appointment_slot(preferred_date: Optional[str], requested_time_str: Optional[str], existing_booked_times: list) -> Dict[str, Any]:
    """
    Check for appointment conflicts on the preferred date.
    If the requested slot is already taken, automatically shift forward to the next available 30-minute slot.
    """
    booked_set = set()
    for t_str in existing_booked_times:
        parsed = parse_time_str(t_str)
        if parsed:
            dt = datetime.combine(datetime.today(), parsed)
            booked_set.add(dt.strftime("%I:%M %p"))

    parsed_req = parse_time_str(requested_time_str)
    if not parsed_req:
        parsed_req = time(9, 0)

    # Enforce clinic hours (08:30 AM to 06:00 PM)
    if parsed_req.hour < 8 or (parsed_req.hour == 8 and parsed_req.minute < 30):
        parsed_req = time(9, 0)
    elif parsed_req.hour >= 18:
        parsed_req = time(17, 0)

    current_dt = datetime.combine(datetime.today(), parsed_req)
    req_formatted = current_dt.strftime("%I:%M %p")

    # If slot is free, book requested slot
    if req_formatted not in booked_set:
        return {
            "final_time": req_formatted,
            "was_shifted": False,
            "original_time": requested_time_str or req_formatted,
            "shift_mins": 0,
        }

    # Slot is taken: shift forward by 30-minute increments
    shift_count = 0
    while current_dt.strftime("%I:%M %p") in booked_set and shift_count < 20:
        current_dt += timedelta(minutes=30)
        shift_count += 1
        if current_dt.hour >= 18:
            break

    final_formatted = current_dt.strftime("%I:%M %p")
    return {
        "final_time": final_formatted,
        "was_shifted": True,
        "original_time": requested_time_str or req_formatted,
        "shift_mins": shift_count * 30,
    }


async def create_appointment_request(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate input, check for slot collision, automatically shift by 30 mins if taken,
    insert into Supabase, and return authoritative confirmation.
    """
    try:
        # Validate input with Pydantic (also normalizes phone + date)
        request_data = AppointmentRequestCreate(**args)
        supabase = get_supabase()

        # Check existing appointment requests on the same date for slot collisions
        booked_times = []
        if request_data.preferred_date:
            try:
                existing_res = (
                    supabase.table("appointment_requests")
                    .select("preferred_time, status")
                    .eq("preferred_date", request_data.preferred_date)
                    .neq("status", "cancelled")
                    .neq("status", "rejected")
                    .execute()
                )
                if existing_res.data:
                    booked_times = [r["preferred_time"] for r in existing_res.data if r.get("preferred_time")]
            except Exception as e:
                logger.warning(f"Could not check existing appointment slots: {e}")

        # Resolve 30-minute slot and auto-shift if taken
        slot_info = resolve_appointment_slot(
            request_data.preferred_date,
            request_data.preferred_time,
            booked_times
        )
        final_time = slot_info["final_time"]
        was_shifted = slot_info["was_shifted"]
        original_time = slot_info["original_time"]

        # Generate reference code (server-owned). Uses `secrets` (CSPRNG) and a
        # larger alphanumeric space so references are not enumerable — a 4-digit
        # numeric code was ~8.9k values and could be brute-forced via the guest
        # lookup. Format stays #APT-XXXXXX (uppercase base32-ish, no ambiguous chars).
        _REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I
        ref_id = "#APT-" + "".join(secrets.choice(_REF_ALPHABET) for _ in range(6))

        notes_suffix = (
            f" [Auto-shifted +{slot_info['shift_mins']}m from {original_time} due to slot conflict]"
            if was_shifted else ""
        )

        insert_payload = {
            "reference_id": ref_id,
            "patient_name": request_data.patient_name,
            "patient_phone": request_data.patient_phone,
            "patient_dob": request_data.patient_dob,
            "reason": request_data.reason,
            "duration": request_data.duration,
            "preferred_date": request_data.preferred_date,
            "preferred_time": final_time,
            "urgency": request_data.urgency or "routine",
            "status": "pending_review",
            "notes": (request_data.notes or f"Voice Agent Request - {request_data.reason} ({request_data.duration or 'recent'})") + notes_suffix,
        }
        if request_data.call_id:
            insert_payload["call_id"] = request_data.call_id
        if args.get("user_id"):
            insert_payload["user_id"] = args["user_id"]

        res = supabase.table("appointment_requests").insert(insert_payload).execute()

        if not res.data or len(res.data) == 0:
            raise RuntimeError("Failed to insert appointment into database")

        created = res.data[0]
        logger.info(
            f"Appointment request created: {ref_id} for {request_data.patient_name} at {final_time} "
            f"(shifted={was_shifted}, mobile {_mask_phone(request_data.patient_phone or '')})"
        )

        if was_shifted:
            message = (
                f"The requested slot at {original_time} on {request_data.preferred_date} was already booked. "
                f"The appointment has been automatically scheduled for the next available slot at {final_time} "
                f"under reference {ref_id}. Please inform the patient that their slot was moved by 30 minutes to {final_time}."
            )
            next_action = f"Scheduled for {final_time} (shifted +{slot_info['shift_mins']}m from {original_time}) - triage review"
        else:
            message = (
                f"Appointment request for '{request_data.reason}' on {request_data.preferred_date} at {final_time} "
                f"has been recorded under reference {ref_id} and submitted to the practice clinical triage team for review."
            )
            next_action = f"Scheduled for {final_time} - triage review"

        return {
            "success": True,
            "request_id": created["id"],
            "reference_id": ref_id,
            "status": "pending_review",
            "preferred_date": request_data.preferred_date,
            "preferred_time": final_time,
            "was_shifted": was_shifted,
            "original_time": original_time,
            "shift_mins": slot_info.get("shift_mins", 0),
            "message": message,
            "next_action": next_action,
        }
    except Exception as e:
        # Log the full error server-side; return a generic message so internal
        # detail (schema, DB errors) is never surfaced to the client/model.
        logger.error(f"Error executing create_appointment_request: {e}", exc_info=True)
        return {
            "success": False,
            "message": "Failed to log appointment request in database. Please contact reception directly."
        }


async def get_my_appointment(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Secure lookup of an existing appointment request.
    - If authenticated patient (has user_id): directly retrieves their own recent requests.
    - If guest caller: requires BOTH reference_id (#APT-XXXX) and mobile number for verification.
    Never leaks medical reason to unauthorized parties.
    """
    supabase = get_supabase()
    user_id = args.get("user_id")

    # 1. Authenticated Patient Flow
    if user_id:
        try:
            res = (
                supabase.table("appointment_requests")
                .select("reference_id, status, reason, preferred_date, preferred_time, notes, created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(3)
                .execute()
            )
            rows = res.data or []
            if not rows:
                return {
                    "success": True,
                    "found": False,
                    "message": "You don't have any recent appointment requests on file. Would you like me to book a new appointment for you?",
                }
            latest = rows[0]
            slot_msg = ""
            if latest.get("preferred_date") and latest.get("preferred_time"):
                slot_msg = f" for {latest.get('preferred_date')} at {latest.get('preferred_time')}"
            return {
                "success": True,
                "found": True,
                "appointment": {
                    "reference_id": latest.get("reference_id"),
                    "status": latest.get("status"),
                    "reason": latest.get("reason"),
                    "preferred_date": latest.get("preferred_date"),
                    "preferred_time": latest.get("preferred_time"),
                    "notes": latest.get("notes"),
                },
                "message": f"I found your appointment request {latest.get('reference_id')}{slot_msg}. Its current status is {latest.get('status')}.",
            }
        except Exception as e:
            logger.error(f"Error fetching appointments for user {user_id}: {e}", exc_info=True)

    # 2. Reference ID lookup (Guest or specified reference)
    ref_id = args.get("reference_id")
    if ref_id and isinstance(ref_id, str):
        cleaned_ref = ref_id.strip()
        if not cleaned_ref.startswith("#"):
            cleaned_ref = f"#{cleaned_ref}"
        phone = args.get("patient_phone", "")
        phone_digits_input = re.sub(r"[^\d]", "", phone or "")

        # A reference code alone is NOT sufficient to identify a caller — it is a
        # low-entropy, human-readable value. Require the mobile number as a second
        # factor for every guest reference lookup (no bypass when phone is absent),
        # matching the /api/guest/lookup endpoint's contract.
        if len(phone_digits_input) < 4:
            return {
                "success": False,
                "found": False,
                "message": "To look up your request I also need the mobile number used when it was submitted. Could you confirm the last part of your number?",
            }

        try:
            res = (
                supabase.table("appointment_requests")
                .select("reference_id, status, preferred_date, preferred_time, patient_phone")
                .eq("reference_id", cleaned_ref)
                .limit(1)
                .execute()
            )
            rows = res.data or []
            if rows:
                record = rows[0]
                stored_digits = re.sub(r"[^\d]", "", record.get("patient_phone") or "")
                # Both factors must match. Note: we do NOT return clinical fields
                # (reason / notes) to a guest path — only status + slot, so a
                # correct-code+phone guess still never leaks symptom detail.
                if phone_digits_input[-4:] == stored_digits[-4:]:
                    slot_msg = ""
                    if record.get("preferred_date") and record.get("preferred_time"):
                        slot_msg = f" on {record.get('preferred_date')} at {record.get('preferred_time')}"
                    return {
                        "success": True,
                        "found": True,
                        "appointment": {
                            "reference_id": record.get("reference_id"),
                            "status": record.get("status"),
                            "preferred_date": record.get("preferred_date"),
                            "preferred_time": record.get("preferred_time"),
                        },
                        "message": f"Request {record.get('reference_id')}{slot_msg} is currently {record.get('status')}.",
                    }
            # Indistinguishable response whether the code is wrong or the phone
            # doesn't match — avoids confirming which references exist.
        except Exception as e:
            logger.error(f"Error checking reference {cleaned_ref}: {e}")

    # 3. If guest provided name + phone without reference code
    try:
        lookup = AppointmentLookup(**args)
        # Search by name + phone
        res = (
            supabase.table("appointment_requests")
            .select("reference_id, status, reason, preferred_date, preferred_time, patient_name, patient_phone")
            .ilike("patient_name", lookup.patient_name)
            .execute()
        )
        rows = res.data or []

        def phone_digits(v: str) -> str:
            return re.sub(r"[^\d]", "", v or "")

        matches = [r for r in rows if phone_digits(r.get("patient_phone", "")) == lookup.patient_phone]
        if matches:
            m = matches[0]
            return {
                "success": True,
                "found": True,
                "appointment": {
                    "reference_id": m.get("reference_id"),
                    "status": m.get("status"),
                    "preferred_date": m.get("preferred_date"),
                    "preferred_time": m.get("preferred_time"),
                },
                "message": f"I found your request {m.get('reference_id')}. Its current status is {m.get('status')}.",
            }
    except Exception:
        pass

    return {
        "success": False,
        "found": False,
        "message": "To look up your appointment request, could you please confirm your reference number (e.g. #APT-1048) and the mobile number used when submitting it?",
    }
