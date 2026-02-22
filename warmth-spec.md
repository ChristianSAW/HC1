# Warmth — Relationship OS for MBA Students (Haas MVP)

## 1) One-liner

Warmth is a calm, human-first relationship tracker that helps Haas MBA students stay genuinely connected with the people who matter most — without it feeling like work.

---

## 2) Problem

Pain points surfaced from user research:

- Difficulty connecting outside your closest circle (local ties, impermanence of MBA)
- Time allocation is overwhelming — unclear where to invest relationship energy
- Cold outreach feels transactional and inauthentic
- Struggle to keep relationships warm organically without being spammy or adding cognitive load
- Lack of motivation when reciprocation feels one-sided
- Hard to balance multiple groups (section, clubs, home friends, recruiters)
- So much going on → hard to initiate; default mode is reactive, not proactive
- Lack of recent contact is often the only signal something has drifted
- Many relationships feel surface-level despite proximity
- Taking close friends for granted
- Forgetting details about people (birthdays, life events, context)
- Juggling local Bay Area relationships vs. home relationships
- Managing long-distance relationships across time zones and life stages

**Additional notes:**
- Follow-through is a recurring theme: returning a message, staying organized, building trust through consistency
- Struggle to find people at a similar life stage — desire to reach out even when it feels awkward
- "My personal happiness" is an underlying motivator — relationships are deeply tied to well-being during the MBA

---

## 3) Target User & Jobs-to-be-Done

**Primary user:** Berkeley Haas full-time MBA student (Year 1 or Year 2), juggling academics, recruiting, clubs, and social life. Highly mobile, high-achieving, relationship-oriented but time-constrained.

**Jobs-to-be-done:**

- When I haven't talked to a close friend in a while, I want a gentle reminder, so I can reach out before it gets awkward.
- When I'm overwhelmed with everything going on, I want a short list of who to prioritize this week, so I can focus my limited social energy.
- When I meet someone new at Haas, I want to capture key details quickly, so I can remember what makes them interesting.
- When I'm about to reach out to someone, I want to recall what we last talked about, so I can make the conversation feel personal and warm.
- When I reflect on my week, I want to see who I connected with and who I missed, so I can feel intentional about my relationships.
- When a contact is at a different life stage or location, I want to maintain a consistent (if low-frequency) connection, so we don't drift apart.
- When I feel like I always initiate, I want to understand the health of a relationship over time, so I can decide where to keep investing.
- When recruiting season is over, I want to transition professional contacts into genuine relationships, so they don't just disappear.
- When I'm taking close friends for granted, I want a nudge that surfaces them, so I can show up for the people who matter most.
- When I have five minutes between classes, I want to log a quick interaction, so I don't lose the habit of staying connected.

---

## 4) Non-Goals (Explicitly NOT in MVP)

- No heavy AI assistant or AI-generated messages
- No contact syncing (no LinkedIn import, no Google Contacts, no phone contacts)
- No complex analytics or relationship scoring dashboards
- No deep integrations (calendar, iMessage, Slack, email)
- No "sales CRM" pipeline language (no stages, no pipeline views, no deal tracking)
- No notification system beyond in-app nudges (no push notifications in MVP)
- No collaboration or shared contact views

---

## 5) MVP Scope

### 5.1 Core Entities

**User**
- id, email, name, avatar_url, created_at

**Contact (Person)**
- id, user_id, name, photo_url, phone, email, linkedin_url
- location (city/region)
- tags (array — maps to circles)
- where_met
- shared_interests (text)
- important_dates (birthday, etc.)
- last_interaction_date
- relationship_depth (1–5 scale)
- energy_after_interaction (positive / neutral / draining)
- notes (freeform)
- follow_up_notes

**Interaction (Check-in log)**
- id, user_id, contact_id
- interaction_type (coffee, text, call, event, etc.)
- date
- notes
- energy (positive / neutral / draining)
- created_at

**Circle / Group**
- id, user_id, name (e.g. "Section A", "Tech Club", "Home")
- Implemented via tags on contacts (no separate table required in MVP)

**Reminder / Nudge**
- Rule-based, derived at query time from last_interaction_date + relationship_depth
- No separate table in MVP; computed on the fly

---

### 5.2 Core Flows

**Add a person (< 60 seconds)**
1. Tap "+" on the People screen
2. Enter name (required), optionally add photo, location, tags
3. Optionally set relationship depth (default 3)
4. Tap Save — contact appears in list immediately

**Log an interaction (< 30 seconds)**
1. Open contact detail OR tap "Reach Out" from the contact list
2. Select interaction type (coffee / text / call / event / other)
3. Optionally add a note
4. Tap Log — last_interaction_date updates, nudge clears

**View "who's getting cold" dashboard**
1. Open Home screen
2. See cards sorted by nudge urgency (overdue contacts first)
3. Tap a card to open contact detail or tap "Reach Out" to log directly
4. Nudge badge disappears once interaction is logged

**Browse by circles**
1. Open Circles screen
2. Select a tag/circle (e.g. "Section A")
3. See all contacts in that circle, sorted by last interaction
4. Tap any contact to view detail

**Weekly reflection**
1. Prompted on a chosen day (or triggered manually from Home)
2. See a scroll of all contacts — quickly mark "reached out", "want to reconnect", or skip
3. Generates a short "suggested outreach" list for the coming week (3–5 people)

---

### 5.3 Screens (Mobile-First)

| Screen | What it shows |
|---|---|
| Login | Email/password or magic link auth; minimal, warm brand intro |
| Home / Dashboard | "Who's getting cold" cards sorted by nudge urgency; weekly suggested outreach list (3–5); quick-log button |
| People (Contact list) | All contacts, searchable by name / tag / location; nudge badges visible; "+ Add" button |
| Contact Detail | Photo, name, location, tags, depth, last interaction, interaction history, follow-up notes; "Log Interaction" button |
| Add / Edit Contact | Form: name, photo, location, tags (circle chips), depth slider, where met, notes |
| Log Interaction | Quick form: type selector, date (defaults today), optional note, energy tag |
| Circles | Tag-based groupings; tap to filter contact list |
| Weekly Reflection | Scrollable contact cards with quick-action buttons; outputs suggested outreach list |
| Settings | Profile, notification preferences (future), sign out |

---

### 5.4 Nudge Rules (Simple Logic)

All rules are computed from `last_interaction_date` and contact metadata. No ML or AI.

| Condition | Action |
|---|---|
| No contact in 21+ days (any contact) | Show "Check in soon" badge |
| relationship_depth ≥ 4 + no contact in 14+ days | Show "Getting cold" badge (higher urgency) |
| location is not Bay Area + no contact in 30+ days | Show "Long distance drift" badge |
| No interaction ever logged | Show "Say hello" badge after 7 days |

Badge hierarchy (if multiple apply): show highest urgency only.
Weekly suggested list = top 3–5 contacts sorted by urgency score (days overdue × depth weight).

---

### 5.5 UX Principles

- **Calm and human** — warm colors, friendly typography, no corporate chrome
- **Low cognitive load** — every screen has one primary action; no dashboard overload
- **Small, actionable lists** — the weekly outreach list is 3–5 people max, not 50
- **Authenticity over automation** — nudges prompt, they don't auto-send; no drafted messages unless the user asks
- **Forgiveness** — snoozing a nudge or skipping a week is fine; no guilt mechanics
- **Speed** — adding a contact or logging an interaction should never feel like filling out a form

---

### 5.6 Haas-Specific Defaults

Pre-populated tag options (user can add custom ones):

**Sections:** Section A, Section B, Section C, Section D, Section E, Section F

**Clubs:** Tech Club, Finance Club, Entrepreneurship, Consortium, International, MBAA, Net Impact, Real Estate Club, Marketing Club, Social Sector

**Geography:** Bay Area, East Coast, West Coast, International, Home

**Relationship type:** Close Friend, Mentor, Mentee, Study Group, Recruiting Contact, Professor

---

## 6) Success Metrics (MVP)

| Metric | Target / Notes |
|---|---|
| Weekly active users (WAU) | ≥ 60% of registered users after week 2 |
| Contacts added per user | ≥ 10 within first week |
| Interactions logged per week per user | ≥ 3 |
| % of nudges acted on (interaction logged within 7 days) | ≥ 40% |
| Reduction in "30+ days no contact" count over 4 weeks | Measurable downward trend per user |
| Week 1 → Week 4 retention | ≥ 50% |
| Add-contact flow completion rate | ≥ 80% (started → saved) |
| Weekly reflection completion rate | ≥ 30% of WAU |
| Self-reported relationship satisfaction (optional survey) | Baseline at onboarding; re-survey at week 4 |

---

## 7) Future Roadmap

| Phase | Feature | User problem solved | Complexity | Notes / Risks |
|---|---|---|---|---|
| Next | Push notifications (nudges) | Users miss in-app nudges | S | Requires native wrapper or PWA; may feel spammy if uncalibrated |
| Next | Snooze / dismiss nudge | Prevents nudge fatigue | S | Simple UX addition |
| Next | Import from CSV | Reduces cold-start friction | M | Need to handle messy data; define required fields |
| Next | Message drafting templates (no AI) | Blank-page paralysis on outreach | M | Keep tone warm; avoid generic templates |
| Later | Calendar integration | Surface optimal times to connect | M | Calendar API complexity; privacy concerns |
| Later | Reminders via push (iOS) | Proactive nudges outside the app | M | Requires native app or deep PWA |
| Later | AI-assisted message drafts (opt-in) | Faster personalized outreach | L | Must feel human; risk of over-automation |
| Later | Lightweight "trust builder" playbooks | Users unsure how to deepen relationships | M | Needs content strategy; must not feel prescriptive |
| Later | Smart resurfacing of shared context | Conversations feel generic | L | Requires richer interaction logs; NLP complexity |
| Later | Events mode (conferences, recruiting) | High-volume new contacts at events | M | Batch add flow; temporary vs. permanent contacts |
| Later | Relationship map / social graph viz | Understanding network shape | L | Cool but low utility in MVP; complexity high |
| Much later | Native iOS app | Better UX, notifications, contacts access | L | Cost and maintenance; wait for validated PMF |
| Much later | LinkedIn / Google Contacts integration | Reduce manual data entry | L | OAuth complexity; privacy; data quality |
| Much later | Collaboration mode (shared contacts) | Couples, families, co-founders | L | Different use case; requires permission model |
| Much later | Privacy controls + local-first data | User data sovereignty | L | Architecture change; validate demand first |

---

## 8) Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Product feels like a CRM / transactional | Tone and copy emphasize care, not management; no pipeline language; warm visual design |
| Data privacy concerns | Clear privacy policy at onboarding; no data selling; local-first option on roadmap |
| Setup friction causes early churn | Fast add flow (< 60 sec); Haas-specific defaults pre-loaded; optional onboarding walkthrough |
| Over-notifying leads to nudge blindness | Cap nudges at 5 visible at a time; weekly digest vs. daily pings; easy snooze |
| Users stop logging interactions | Make logging feel lightweight (one tap from contact list); celebrate streaks subtly |
| Feels one-sided if others don't reciprocate | Frame around personal intention, not reciprocity; reflection mode normalizes asymmetry |
| Low discovery / adoption at Haas | Seed with early adopters in one section; word of mouth; ambassador program |

---

## 9) Positioning & Messaging

### Elevator Pitch

Warmth is a personal relationship tracker built for people who care deeply about staying connected — but keep letting it slip. It's not a CRM. It's a quiet reminder that the people you like are worth a few minutes of your week.

### 5 Key Differentiators vs. a CRM

1. **Human-first language** — "catch up" not "follow up"; "people" not "leads"
2. **Calm by design** — no dashboards, no scores, no streak anxiety
3. **Relationship depth, not pipeline stage** — tracks emotional quality, not sales funnel position
4. **Nudges, not automations** — suggests, never sends on your behalf
5. **Built for real relationships** — friends, mentors, section-mates; not prospects or clients

### 5 Example Microcopy Lines

- *"Marcus hasn't heard from you in 18 days. Worth a text?"*
- *"You've got 3 people worth checking in with this week. Start with one."*
- *"Added. What made you want to stay in touch with her?"*
- *"Quick — how'd that coffee with Priya go?"*
- *"No pressure. Just a nudge."*

---

## 10) Appendix: Example Data

### Sample Contacts

**1. Priya Nair**
- Location: Berkeley (Section A)
- Tags: Section A, Study Group, Close Friend
- Relationship depth: 5
- Where met: Orientation week
- Last interaction: 16 days ago (coffee)
- Notes: Interested in climate tech; introduced me to three people in her network
- Nudge: "Getting cold" (depth ≥ 4, > 14 days)

**2. Marcus Chen**
- Location: San Francisco
- Tags: Tech Club, Bay Area
- Relationship depth: 4
- Where met: Tech Club kickoff event
- Last interaction: 30 days ago (Slack message)
- Notes: PM at Google before Haas; good person to talk to about APM recruiting
- Nudge: "Check in soon" (> 21 days)

**3. James Whitfield**
- Location: Palo Alto
- Tags: Mentor, Bay Area
- Relationship depth: 2
- Where met: Alumni mentorship program
- Last interaction: 68 days ago (intro call)
- Notes: Partner at Andreessen; said to reach out after semester 1 ends
- Nudge: "Long distance drift" (> 30 days, not a close contact yet)

---

### Sample Interaction Logs

1. **Priya Nair** — Feb 5, 2026 — Coffee at Free Speech Movement Café — *"Caught up on winter break, talked about her summer internship search. She's stressed about consulting recruiting. Follow up: send her the Bain contact I mentioned."* — Energy: Positive
2. **Marcus Chen** — Jan 22, 2026 — Slack message — *"Quick ping to share a product management article. He replied with a recommendation back."* — Energy: Positive
3. **Aisha Okonkwo** — Jan 28, 2026 — Phone call — *"She called to debrief after Consortium event. Long conversation about belonging and the MBA experience."* — Energy: Positive
4. **Sophie Laurent** — Jan 10, 2026 — Group dinner — *"Finance Club happy hour. Caught up briefly — she's headed to NYC for a superday next week."* — Energy: Neutral
5. **James Whitfield** — Dec 15, 2025 — Video call — *"Intro call via alumni program. He was generous with his time; said to reach back out in spring with a specific ask."* — Energy: Positive

---

### Sample Circles

1. **Section A** — 65 classmates; core academic cohort; highest interaction frequency
2. **Tech Club** — ~40 members; shared interest in product and startups; regular Thursday events
3. **Close Friends** — 8 people; mix of section-mates and pre-MBA friends in the Bay Area
4. **Home** — 12 people; family and long-time friends outside the MBA bubble
5. **Mentors** — 4 people; alumni and professionals; lower frequency, higher intentionality
