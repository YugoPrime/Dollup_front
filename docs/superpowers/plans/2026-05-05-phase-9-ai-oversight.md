# Phase 9 — AI Oversight Admin

**Date:** 2026-05-05 (planning)
**Lane:** `dollup-admin` (built in Phase 8)
**Priority:** Post-Phase 8
**Estimate:** ~1 week
**Depends on:** Phase 8 (dollup-admin shell), AI agent build (separate effort tracked elsewhere)

## Goal
Real-time supervisory dashboard over the AI agent that handles inbound DMs, support, ad ops, inventory automation. User must be able to: see what AI did, see what AI is about to do, override, and audit.

## Why
Endgame is "AI does 90%, user marks paid + preps order." That requires the user to TRUST the AI. Trust requires visibility. Without oversight UI, the user can't safely delegate.

## Surfaces
1. **Activity feed** — chronological log of every AI action (DM reply, ad copy posted, inventory sync, order created, refund issued). Filter by type, channel, customer, date.
2. **Pending escalations** — queue of cases AI flagged for human review (low confidence, refund > threshold, abuse signals, complex returns)
3. **Conversation viewer** — full thread per customer (DM / WhatsApp / email) with AI reasoning trace per turn
4. **Override controls** — pause AI globally / per-channel / per-customer; take over a conversation
5. **Confidence dashboard** — daily metrics: replies sent, escalations, refunds issued, revenue attributed, customer sat (if measured)
6. **Approval mode** — toggle requiring human approval before AI takes any action (training mode for first weeks)
7. **Audit log** — immutable trail for compliance / disputes; CSV export

## Backend requirements
- `ai_actions` table: `id, type, channel, customer_id, action_payload, confidence, status, escalated, reasoning_trace, created_at`
- AI agent writes to `ai_actions` on every action
- `ai_overrides` table: `scope (global|channel|customer), target, action (pause|approval), expires_at`
- AI agent reads `ai_overrides` on every tick
- Webhook from agent → admin on escalation (start with polling 5s, upgrade to SSE if needed)

## Steps (high-level — expand on kickoff)
1. Define `ai_actions` and `ai_overrides` schemas + migrations
2. Backend admin routes: `GET /admin/ai/actions`, `GET /admin/ai/escalations`, `POST /admin/ai/override`, `POST /admin/ai/takeover`
3. Build activity feed UI (table + filters + detail drawer)
4. Build escalation queue with claim/resolve flow
5. Build conversation viewer (threaded, per turn shows AI prompt + response + confidence)
6. Wire override controls (admin writes `ai_overrides`, agent honors on next tick)
7. Confidence dashboard with charts (Recharts or similar)
8. Approval mode toggle — agent posts intent, blocks until approved
9. Audit log read-only with CSV export

## Acceptance
- Every AI action visible in feed within 5s
- Escalations surface within 30s of trigger
- Take-over a conversation in ≤ 2 clicks
- Pause global / per-channel / per-customer all work and propagate to agent within 30s
- Audit log exportable to CSV (date range filter)
- Approval mode blocks all AI actions until reviewed (when toggled)

## Out of scope
- Building the AI agent itself (separate project)
- Multi-agent orchestration UI
- Voice / phone channel integration

## Handoff notes
- Reference: `dollup-prd-v2.md` at workspace root for chatbot/AI architecture intent
- AI agent will likely use LangGraph or similar framework — admin UI agnostic of framework choice
- Real-time: start polling 5s, upgrade to SSE/WS later if needed
- Approval mode is critical for first 2–4 weeks of AI rollout — design for it from day 1
