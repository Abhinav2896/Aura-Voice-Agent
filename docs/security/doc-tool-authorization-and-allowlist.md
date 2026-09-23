# Tool Authorization and Allowlist

## Problem

Aura exposes tools two ways: the Gemini Live relay can request them during a
call, and there is an HTTP endpoint (`/api/tools/{tool_name}`) used by the app.
The full `TOOL_REGISTRY` includes internal helpers (e.g. saving a call record)
that should never be callable by an arbitrary HTTP client. Without a gate, the
HTTP endpoint would expose every registered tool, including internal ones.

## The invariant

> **The registry defines what *exists*; a separate public allowlist defines
> what an untrusted HTTP client may *invoke*. Internal tools are in the registry
> but not on the allowlist.**

## How Aura implements it

- `backend/tools/__init__.py` holds `TOOL_REGISTRY` (all tools) and
  `execute_tool(name, args)`, which validates the name against the registry and
  runs the handler. Unknown names return a structured failure.
- `backend/main.py` defines `PUBLIC_TOOL_ALLOWLIST` and gates
  `/api/tools/{tool_name}`: a name not on the allowlist is rejected before any
  handler runs. Internal tools (call persistence, etc.) are deliberately kept
  off the allowlist.
- Every handler validates its arguments with a Pydantic schema and sets
  server-owned fields itself (reference ids like `#APT-…`/`#RX-…`/`#ADM-…`,
  `status`, timestamps, and the `call_id`/`user_id` binding). The caller/model
  cannot choose these.

## Two layers of authorization

1. **What may run at all** — `execute_tool` + `TOOL_REGISTRY`. A name not in
   the registry never runs.
2. **What an HTTP client may trigger** — `PUBLIC_TOOL_ALLOWLIST`. A registered
   but non-allowlisted tool is reachable only by trusted server code, not by the
   public endpoint.

## Common failure modes to avoid

- **Adding a new internal tool to the allowlist "to test it."** If it writes
  privileged data or is an internal helper, keep it off the allowlist.
- **Letting a handler trust a model/client-supplied `reference_id`, `status`,
  or `user_id`.** These are server-owned; generate them server-side.
- **Skipping the Pydantic schema for a new tool.** Unvalidated args are an
  injection surface (`doc-server-mediated-tool-execution.md`).

## How to preserve this control

1. Register new tools in `TOOL_REGISTRY` with a Pydantic schema.
2. Add to `PUBLIC_TOOL_ALLOWLIST` only tools that are safe for an untrusted
   HTTP client to invoke.
3. Keep reference ids, status, and ownership server-generated.
