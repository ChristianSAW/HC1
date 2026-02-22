
# Warmth — A Relationship OS for MBA Students

## Overview
A mobile-first web app that helps MBA students intentionally build and maintain meaningful relationships. Warm earth tones, calm design, personal and human — never corporate.

## Visual Design
- **Palette**: Terracotta, warm beige, soft olive, cream backgrounds, charcoal text
- **Style**: Rounded cards, generous whitespace, soft shadows, friendly typography
- **Feel**: Like a personal journal meets a habit tracker — not a CRM

## Backend (Lovable Cloud + Supabase)
- Email authentication (sign up / login / password reset)
- Database for users, contacts, circles, interactions, and reflections
- Row-level security so each user's data is private

---

## Feature 1: Contact Profiles
Each contact stores:
- **Basic info**: Name, photo, phone, email, LinkedIn, location
- **Tags**: Multi-select from preloaded Haas tags (Section A–F, Tech Club, Finance Club, etc.) plus custom tags
- **Context**: Where you met, shared interests, important dates
- **Relationship tracking**: Depth (1–5 scale), energy level (Positive/Neutral/Draining), last interaction date
- **Notes**: Free-form notes, conversation memory log, follow-up items

Add/edit contacts via clean mobile-friendly forms. Contact detail page shows everything at a glance.

## Feature 2: Relationship Dashboard (Home Screen)
Mobile-first scrollable card interface showing:
- 🔥 **Going cold** — People with no contact in 30+ days
- ⭐ **Close friends at risk** — High-depth contacts you haven't reached out to recently
- 🌎 **Long-distance** — People outside Bay Area
- 📍 **Local** — Bay Area contacts
- 🎯 **This week's outreach** — 3–5 suggested people to reach out to

Each card shows name, photo, last contact date, and a prominent "Reach Out" button that logs an interaction.

## Feature 3: Smart Nudges
Simple rule-based flags (no AI):
- No contact in 21+ days → gentle nudge
- Close friend (depth 4–5) + no contact in 14+ days → priority flag
- Long-distance + no contact in 30+ days → flag

Nudges surface on the dashboard and as badge counts. No push notifications for MVP.

## Feature 4: Groups & Circles
- Create and manage circles (Section, Tech Club, Consortium, Home Friends, Mentors, etc.)
- Each contact can belong to multiple circles
- Circle view shows all members with a contact gap indicator (days since last interaction)
- Preloaded Haas-specific circle suggestions

## Feature 5: Weekly Reflection
Simple weekly prompt screen:
- "Who made your week better?"
- "Who did you neglect?"
- "Who do you want to invest in long term?"

Quick-tag people from your contacts for each question. Reflections are saved and viewable in a simple history.

---

## Navigation
Bottom tab bar (mobile-first):
1. **Home** — Dashboard
2. **People** — Full contact list with search and filter
3. **Circles** — Group view
4. **Reflect** — Weekly reflection
5. **Profile** — Settings and account

## Pages
- Login / Sign Up
- Dashboard (Home)
- Contact List (searchable, filterable by tag/circle)
- Contact Detail / Edit
- Add Contact
- Circles List
- Circle Detail
- Reflection Prompt
- Reflection History
- Settings / Profile
