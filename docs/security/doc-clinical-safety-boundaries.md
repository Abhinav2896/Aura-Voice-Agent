# Clinical Safety Boundaries

## Problem

Aura is a voice receptionist for a GP/medical practice. Callers may describe
symptoms, ask for medical advice, or be in genuine distress. An AI receptionist
that offered diagnoses, dosing, or triage decisions would be unsafe and outside
its role. The system must stay firmly in the receptionist lane and escalate
rather than advise.

## The invariant

> **Aura handles reception tasks — booking requests, prescription requests,
> enquiries, and escalation. It does not diagnose, advise on treatment, or make
> clinical decisions. Anything clinical is routed to a human.**

## How Aura implements it

- The system instruction (`AURA_SYSTEM_INSTRUCTION` in
  `backend/services/live_token.py`) frames Aura as a receptionist and directs
  it to take requests and escalate rather than give medical advice.
- The tool surface is deliberately non-clinical: create appointment request,
  create prescription request, create admin enquiry, and clinical **escalation**
  (`#ESC-…`) — a handoff, not an assessment. There is no "diagnose" or "advise"
  tool.
- Requests are exactly that — *requests* with a `status` the practice's staff
  act on. Aura does not approve, prioritise clinically, or fulfil them itself.
- Reference ids (`#APT-`, `#RX-`, `#ADM-`, `#ESC-`) make every interaction a
  trackable handoff to a human, not a closed-loop clinical action.

## Boundaries this is NOT

- It is not a safety-critical triage system and must not be presented as one.
- It does not replace NHS 111, 999, or a clinician. Urgent/emergency situations
  must be directed to real emergency services — this belongs in the system
  instruction and any caller-facing copy.

## Common failure modes to avoid

- **Adding a tool or prompt that has Aura give dosing, diagnosis, or triage
  advice.** Keep the surface to intake + escalation.
- **Auto-approving or clinically prioritising requests.** Status transitions
  that imply a clinical decision belong to practice staff, not the model.
- **Softening the escalation path.** Distress/emergency must route to a human /
  emergency services, not into a booking flow.

## How to preserve this control

1. Keep the receptionist framing in the system instruction.
2. Keep the tool surface intake-and-escalate only; no clinical-decision tools.
3. Keep emergencies pointed at real emergency services in prompt and UI copy.
