# Warmth — Project Context for Claude

## 1. Project Overview

**Warmth** is a relationship tracker for MBA students at the Haas School of Business. It helps users maintain outreach cadence with contacts via nudges, circles, and weekly reflection. The core insight: relationships decay without intentional maintenance; Warmth surfaces who to reach out to and when.

---

## 2. Development Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run test     # Run Vitest suite
npm run lint     # ESLint
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Routing | React Router v6 |
| Backend / Auth | Supabase (Postgres + Auth) |
| Component Library | shadcn/ui + Radix UI primitives |
| Styling | Tailwind CSS |
| Date Math | date-fns |
| Data Fetching | Direct Supabase calls (TanStack Query installed, not yet used) |

---

## 4. Folder Structure

```
src/
  pages/          # One file per route
  components/     # AppLayout, BottomNav, ContactCard
    ui/           # shadcn primitives
  hooks/          # useAuth.tsx, use-mobile.tsx
  lib/            # nudges.ts, constants.ts, defaultContacts.ts, utils.ts
  integrations/
    supabase/     # client.ts, types.ts
docs/             # Technical reference docs
warmth-spec.md    # Product/strategy spec
```

---

## 5. Routing & Auth

**Public routes:** `/auth`, `/reset-password`

**Protected routes:** All others — wrapped in `ProtectedRoute` → `AppLayout`

### `useAuth()` (`src/hooks/useAuth.tsx`)
- Wraps `supabase.auth.onAuthStateChange` + `getSession`
- Exposes `{ user, session, loading, signOut }`

### `ProtectedRoute`
- Shows loading spinner while `loading: true`
- Redirects to `/auth` if no user

---

## 6. Data Fetching Pattern

- Direct Supabase calls inside `useEffect` per page; no global store
- All queries scoped to `user_id` from `useAuth()`
- Pattern: `await supabase.from(...).select() / .insert() / .upsert() / .delete()`

---

## 7. Data Model (Supabase Tables)

| Table | Key Columns |
|---|---|
| `profiles` | `id` (FK → auth.users), `display_name`, `avatar_url` |
| `contacts` | `name`, `location`, `relationship_depth` (1–5), `energy_level`, `tags` (text[]), `last_interaction_date`, `phone`, `email`, `linkedin`, `notes` |
| `interactions` | `contact_id` (FK), `interaction_type`, `interaction_date`, `notes` |
| `circles` | `user_id` (FK), `name`, `description` |
| `contact_circles` | join: `contact_id` + `circle_id` + `user_id` |
| `reflections` | `week_of` (date), `made_week_better` / `neglected` / `invest_long_term` (text[]) |

Full TypeScript types: `src/integrations/supabase/types.ts` — use `Tables<"contacts">` etc.

---

## 8. Nudge Logic (`src/lib/nudges.ts`)

### `getNudgeBadge(contact)` — priority order:
1. No `last_interaction_date` → `"🔥 Reach out"`
2. `depth >= 4` AND `days >= 14` → `"⭐ Priority"`
3. Long distance AND `days >= 30` → `"🌎 Check in"`
4. `days >= 21` → `"💛 Nudge"`
5. `null` (no badge)

### `getWeeklyOutreach()`
Scores contacts (days capped at 90 + depth bonus + overdue bonus), returns top 5.

### Category Functions
- `getGoingCold` — not contacted in 30+ days
- `getCloseFriendsAtRisk` — depth ≥ 4, not contacted in 14+ days
- `getLongDistance` — non-Bay-Area location
- `getLocal` — Bay Area location

---

## 9. Constants (`src/lib/constants.ts`)

**`HAAS_TAGS`** — Section A–F, Tech Club, Finance Club, Entrepreneurship, Consortium, International, Bay Area, East Coast, West Coast, Home, Close Friend, Recruiting, Mentor, Study Group

**`BAY_AREA_LOCATIONS`** — Berkeley, San Francisco, Oakland, Palo Alto, San Jose, Mountain View, Sunnyvale, Fremont, Walnut Creek

**`ENERGY_LEVELS`** — `"Positive"` | `"Neutral"` | `"Draining"`

---

## 10. Sample / Default Contacts (`src/lib/defaultContacts.ts`)

- 9 seed contacts with IDs prefixed `default_`
- Stored in `localStorage` key `"warmth_default_contacts"`
- Shown when user has no real Supabase contacts
- `isDefaultContact(id)` — returns `true` if `id.startsWith("default_")`; gates edit/delete operations

---

## 11. Design System

| Token | Value |
|---|---|
| Primary | terracotta `hsl(16 55% 52%)` |
| Secondary | olive `hsl(82 20% 55%)` |
| Background | cream `hsl(30 33% 96%)` |
| Body Font | Inter (weights 300–600) |
| Heading Font | Source Serif 4 |
| Base Border Radius | `0.75rem` |
| Card Radius | `rounded-2xl` |
| Dark Mode | Class-based (`.dark`); same CSS variable names, shifted HSL |

Full reference: `docs/theme.md`

---

## 12. Key Utilities

- `cn(...classes)` — `src/lib/utils.ts` — clsx + tailwind-merge
- `isDefaultContact(id)` — `src/lib/defaultContacts.ts`

---

## 13. Workflow Preferences

- Confirm before push, force-push, or any destructive git operation
- Prefer editing existing files over creating new ones
- Keep solutions minimal; no over-engineering
- Do not add docstrings, comments, or type annotations to unchanged code
- Do not add backwards-compatibility shims for removed code
- Do not create helpers or abstractions for one-time operations

---

## 14. Reference Docs

| File | Contents |
|---|---|
| `docs/theme.md` | Full design system (colors, fonts, spacing, dark mode) |
| `docs/features.md` | All screens and user flows |
| `docs/architecture.md` | Tech stack, folder structure, patterns |
| `docs/data-model.md` | DB schema + TypeScript types |
| `docs/nudge-logic.md` | Nudge rules, scoring algorithm, badge hierarchy |
| `warmth-spec.md` | Product vision and strategy spec |
