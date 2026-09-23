# Phone Masking and PII Handling

## Problem

Aura handles patient-identifying data: names, phone numbers, dates of birth,
and free-text about health concerns. Phone numbers in particular flow back to
the caller in tool results (e.g. "we have a number ending 1234 on file"). If a
lookup echoed a full stored number to whoever is on the call, it would leak the
patient's contact details to anyone who guessed a reference id.

## The invariant

> **Stored phone numbers are masked before they are read back to a caller.
> PII is only ever synthetic in the repo, and full PII is never returned to an
> unauthenticated lookup.**

## How Aura implements it

- `backend/tools/appointments.py` defines `_mask_phone()`, which reduces a
  stored number to a masked form (only the last digits are shown) before it is
  returned in a tool result to the caller.
- Appointment/prescription lookups return the masked number as a *confirmation
  hint*, not the raw stored value. See `doc-appointment-lookup-security.md` for
  how the lookup itself is gated.
- All PII in the repository (seed data, examples, tests) is synthetic. Phone
  numbers use the Ofcom-reserved fictitious ranges (`07700 900xxx`,
  `020 7946 0xxx`) that can never route to a real person.
- Logs record events and identifiers, not full PII payloads. Error responses
  are sanitized (see the health endpoint and environment doc) so PII and
  internal detail are not returned to clients.

## Common failure modes to avoid

- **Returning the raw stored phone number in a tool result.** Always pass it
  through `_mask_phone()` for caller-facing output.
- **Adding real phone numbers/names to seed or test data.** Use the reserved
  fictitious ranges only.
- **Logging the full request body of a patient lookup.** Log the reference id
  and outcome, not the caller's name/DOB/number.
- **Widening a lookup to return more PII than needed to confirm identity.**

## How to preserve this control

1. Any new caller-facing field derived from stored contact data must be masked.
2. Keep seed/test PII synthetic and within reserved ranges.
3. Keep error/health responses sanitized; log detail server-side only.
