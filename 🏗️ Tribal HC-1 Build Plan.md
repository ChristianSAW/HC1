🏗️ Tribal HC-1 Build Plan
What You're Working With
The repo is a Lovable-scaffolded React + TypeScript + Vite frontend connected to Supabase for backend/auth/DB. The warmth-circle-builder naming and warmth-spec.md suggest the first hypothesis you're testing is a visual representation of your relationship network — concentric "warmth circles" showing closeness/interaction frequency. This maps directly to what the Notion notes describe as your "initial belief that visual representation of your network/interaction data would be the lever to change behavior."

Phase 1 — Foundation (Week 1–2)
Goal: Stable local dev environment + auth + DB schema
The first thing to lock down is getting off the Lovable-only workflow and into a repeatable local setup. Run npm i && npm run dev and confirm the Vite dev server is clean. Then establish your Supabase schema — this is the most critical decision you'll make early because the data model defines everything downstream.
Minimum tables to define now:

users (Supabase auth handles this, but add profile columns)
contacts (name, relationship type, last interaction date, interaction frequency)
interactions (user_id, contact_id, channel, timestamp, content_summary)
relationship_scores (computed health/warmth score per contact, updated async)

Set up Row Level Security (RLS) policies in Supabase so each user only sees their own data — this is non-negotiable given the sensitivity of relationship data and will save you pain later.

Phase 2 — Core Data Layer (Week 2–3)
Goal: Get user data in, even manually
Before you solve the hard data-access problem (platform APIs, OAuth, scraping), let users manually seed their own contacts. This unblocks the entire front-end and lets you test the core value prop without being gated on data portability.
Build:

Contact import flow (manual entry form, maybe CSV upload)
Basic interaction logging (simple "I talked to X today" input)
Supabase edge functions for any async score computation

This also directly tests the insight from your customer interviews — "early signal that users might actually want to own their own interaction data." Manual entry is the wedge.

Phase 3 — Warmth Circle UI (Week 3–4)
Goal: The visual representation that changes behavior
This is the core HC-1 feature per the spec name. Build the network visualization using a library like D3.js or Recharts (already in your stack likely via shadcn). The concentric circle metaphor works well: innermost circle = people you talk to weekly, outer rings = monthly, quarterly, drifting.
Key interactions to build:

Click a contact to see interaction history and a "reach out" nudge
Color-coding by relationship health score
Time decay — contacts visually drift outward if you haven't interacted recently

This is the behavioral lever. The visual drift is what creates the proactive nudge without requiring a push notification.

Phase 4 — AI Layer (Week 4–5)
Goal: Surface the "right signals at the right time"
Now that you have data and a UI, layer in the AI. Since you're already set up with Claude (per CLAUDE.md in the repo), use the Anthropic API to:

Generate a brief "relationship summary" per contact (what you talked about, when, shared context)
Suggest a reach-out prompt ("You haven't talked to X in 6 weeks — they recently mentioned a job change")
Score relationship health based on interaction patterns

Keep this lightweight for HC-1. The AI should feel like a smart assistant surfacing context, not a chatbot.

Phase 5 — User Testing & Iteration (Week 5–6)
Goal: Validate the core hypothesis with real users
You already have 13 Haas interviewees. Get 3–5 of them into the app with their own manually-entered data and run a structured week-long test. The specific thing you're trying to answer per the Notion page:

Does the visual representation actually shift behavior from reactive to proactive?
Do users feel value from owning and seeing their relationship data?
What is the "must-have" first feature — nudges, health score, or something else?

Track: did they open the app unprompted? Did they reach out to someone because of it?

Key Technical Decisions to Make Now
Data access strategy — the Notion notes call this your bottleneck. For HC-1, don't fight it. Manual entry + CSV is enough to test the hypothesis. Save OAuth/platform integrations for HC-2.
AI model calls — run them server-side via Supabase Edge Functions, not client-side. Never expose API keys in the frontend (your .env file being committed to the repo is something to double-check — make sure it's in .gitignore properly).
Lovable vs. local — Lovable is great for rapid scaffolding but you'll want to own the codebase directly as complexity grows. The AGENT.md and CLAUDE.md files suggest you're already thinking about agentic coding workflows, which is the right call.

Suggested GitHub Issues to Create

feat: define and migrate Supabase schema (contacts, interactions, scores)
feat: manual contact entry flow
feat: warmth circle visualization (D3/canvas)
feat: relationship health score computation
feat: AI-generated relationship summaries via Anthropic API
feat: reach-out nudge UI
chore: move API keys to env, audit .gitignore
research: evaluate OAuth options for Gmail/iMessage for HC-2