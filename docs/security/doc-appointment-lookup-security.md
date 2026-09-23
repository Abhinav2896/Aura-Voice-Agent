# Appointment Lookup Security

## Problem

`get_my_appointment` lets a caller retrieve details of an existing
appointment/prescription request. This is exactly the kind of endpoint that
leaks data if it is too trusting: given only a reference id, an attacker could
enumerate other people's bookings. A lookup must confirm the caller is the
person the record belongs to before returning details.

## The invariant

> **A lookup returns a record only when the caller proves ownership: an
> authenticated user id, or a matching reference id + phone, or a matching
> name + phone. It never returns a record on a reference id alone.**

## How Aura implements it

`backend/tools/appointments.py` — `get_my_appointment` supports three paths,
in order of trust:

1. **Authenticated user id** — when the session carries a verified `user_id`
   (backend-injected, not model-supplied), the lookup is scoped to that user's
   own records.
2. **Reference id + phone** — a guest must supply *both* the reference id and a
   phone number that matches the record. The reference id alone is not enough.
3. **Name + phone fallback** — matches on name plus phone when no reference id
   is available.

Any phone number returned in the result is masked via `_mask_phone()`
(`doc-phone-masking-and-pii.md`) — the caller gets a confirmation hint, not the
raw stored number.

## Why this shape

- The reference id is a low-entropy, human-readable value (`#APT-1234`). Treating
  it as a secret would be wrong; requiring a *second* factor (phone) that the
  legitimate caller knows defeats enumeration.
- The authenticated path is strongest because ownership is proven by a verified
  JWT, and the `user_id` used for scoping comes from the backend, never the model.

## Common failure modes to avoid

- **Returning a record on reference id alone.** Always require the second
  factor for guest lookups.
- **Scoping the authenticated path with a model-supplied user id.** The id must
  be the backend-verified one.
- **Returning the unmasked stored phone.** Mask caller-facing numbers.
- **Leaking "record exists but phone didn't match" vs "no record" in a way that
  enables enumeration.** Keep the not-found/!match responses indistinguishable
  where practical.

## How to preserve this control

1. Keep the two-factor requirement for all guest lookups.
2. Keep authenticated scoping tied to the backend-verified user id.
3. Keep caller-facing phone numbers masked.
