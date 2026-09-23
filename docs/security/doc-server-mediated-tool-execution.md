# Server-Mediated Tool Execution

## Problem

Aura lets a large language model (Gemini Live) drive a conversation that can
create appointment requests, prescription requests, admin enquiries, and
clinical escalations — all of which write to the database. If the model (or a
client pretending to be the model) could execute those actions directly, a
prompt injection or a malicious client could fabricate records, call internal
functions, or reach data it should not.

## The invariant

> **Gemini can *request* an action. Only FastAPI decides whether it runs.**

The model never touches the database. Every privileged action is a *request*
that the backend independently validates and executes.

## Data flow

```
Browser (mic/text)
   │  audio / text frames over WSS
   ▼
FastAPI  /api/live/ws   ── relays audio to ──►  Gemini Live
   ▲                                               │
   │        toolCall (functionCalls)               │
   │◄──────────────────────────────────────────────┘
   │
   ▼  execute_tool(name, args)   ← backend decides here
TOOL_REGISTRY  →  validated tool handler (Pydantic)
   ▼
Supabase (service-role client, server-side only)
```

## How Aura implements it

- The Gemini Live relay lives in `backend/main.py` (`live_websocket_endpoint`).
  When Gemini emits a `toolCall`, the backend intercepts each `functionCall`,
  logs it, and calls `execute_tool(tool_name, args)` in
  `backend/tools/__init__.py`. The model's message is data, not an instruction
  to the database.
- `execute_tool` looks the name up in `TOOL_REGISTRY`. Unknown names return a
  structured `{"success": false, "error": "Unknown tool: …"}` and run nothing.
- Each handler re-validates its arguments with a Pydantic schema
  (`backend/schemas/*`) before any insert. Invalid or missing required fields
  raise and are returned as a failure, not written.
- Server-owned fields (`id`, `reference_id`, `status`, `created_at`,
  `call_id` binding, `user_id`) are set by the server, never taken from the
  model. See `doc-tool-authorization-and-allowlist.md`.

## What each layer controls

- **Browser:** may stream audio/text and receive audio/transcripts/tool-result
  notifications. It cannot name a tool or write to the database directly.
- **Gemini:** may request an allowlisted tool with arguments. It cannot choose
  the reference id, status, or record ownership, and cannot run SQL or Python.
- **FastAPI:** validates the tool name, validates the arguments, injects the
  server-owned `call_id`/`user_id`, executes the handler, and returns a result.
- **Supabase:** receives only parameterized table operations from the trusted
  backend client.

## Common failure modes to avoid

- **Adding a tool to `TOOL_REGISTRY` without a Pydantic schema.** Every handler
  must validate its input; an unvalidated handler is an injection surface.
- **Trusting model-supplied `status`/`reference_id`/`user_id`.** These are
  server-owned. A handler that writes a model-supplied status breaks the
  "server decides" invariant.
- **Exposing an internal helper (e.g. `save_call`) through the public HTTP
  tool endpoint.** See the allowlist doc — internal tools must stay off the
  public allowlist even though they are in the registry.

## How to preserve this control

1. New tools: declare them in `AURA_TOOL_DECLARATIONS` (schema for the model),
   register the handler in `TOOL_REGISTRY`, and validate args with Pydantic.
2. Keep all database access inside handlers/services that use the backend
   service-role client — never let the browser or model reach Supabase directly.
3. Keep server-owned fields server-generated.
