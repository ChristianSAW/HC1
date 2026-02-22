# Warmth — Features

## Auth (`/auth`)

**File:** `src/pages/Auth.tsx`

Email/password authentication via Supabase Auth.

- **Login** — email + password form; submits to `supabase.auth.signInWithPassword`
- **Signup** — same form with toggle; submits to `supabase.auth.signUp`
- **Forgot password** — email field triggers `supabase.auth.resetPasswordForEmail`, sends magic link
- On success, Supabase session is established and the app redirects to `/`

---

## Dashboard (`/`)

**File:** `src/pages/Dashboard.tsx`

Weekly relationship overview, organized into prioritized sections:

| Section | Source function | Criteria |
|---------|----------------|----------|
| Weekly Outreach (top 5) | `getWeeklyOutreach()` | Scored by recency + depth |
| Going Cold | `getGoingCold()` | No interaction in 30+ days |
| Close Friends at Risk | `getCloseFriendsAtRisk()` | depth ≥ 4, 14+ days |
| Long Distance | `getLongDistance()` | Location outside Bay Area |
| Local | `getLocal()` | Location in Bay Area |

Contacts are loaded from Supabase (or default contacts for new users) and passed through nudge functions from `src/lib/nudges.ts`. Each contact shows a nudge badge when applicable.

---

## People (`/people`)

**File:** `src/pages/People.tsx`

Full contact list with search and filtering.

- **Search** — filters by name, tag, or location (case-insensitive substring match)
- **Contact cards** — each shows avatar, name, location, nudge badge, and tags
- **Sample contacts** — shown when user has no real contacts (9 seed contacts from `src/lib/defaultContacts.ts`)
- **Add contact** — button navigates to `/people/new`

---

## Contact Detail (`/people/:id`)

**File:** `src/pages/ContactDetail.tsx`

Full profile view for a single contact.

- Displays all contact fields: name, location, relationship depth, energy level, tags, notes, shared interests, follow-ups, important dates, phone, email, LinkedIn
- **Interaction history** — list of past interactions with type, date, and notes
- **Reach out** — logs a new interaction (type + notes); updates `last_interaction_date`
- **Edit** — links to `/people/:id/edit`
- **Delete** — removes contact from Supabase with confirmation; disabled for default contacts

---

## Contact Form (`/people/new`, `/people/:id/edit`)

**File:** `src/pages/ContactForm.tsx`

Create or edit a contact.

**Fields:**
- Name (required)
- Photo URL
- Location
- Phone, Email, LinkedIn
- Relationship depth (1–5 slider)
- Energy level (Positive / Neutral / Draining)
- Where met
- Tags — chip selector with `HAAS_TAGS` suggestions from `src/lib/constants.ts`
- Shared interests, Follow-ups, Important dates, Notes

On submit: `upsert` to Supabase `contacts` table. Redirects to contact detail on success.

---

## Circles (`/circles`)

**File:** `src/pages/Circles.tsx`

Tag-based groupings of contacts.

- Lists all circles with name, description, and member count
- **Create circle** — name + optional description; inserts to `circles` table
- **Delete circle** — removes circle and its `contact_circles` join rows
- Clicking a circle navigates to `/circles/:id`

---

## Circle Detail (`/circles/:id`)

**File:** `src/pages/CircleDetail.tsx`

Manage members of a single circle.

- Shows all contacts currently in the circle as `ContactCard` components
- **Add members** — searchable list of contacts not yet in the circle
- **Remove member** — deletes row from `contact_circles`
- All operations write to the `contact_circles` join table

---

## Reflect (`/reflect`)

**File:** `src/pages/Reflect.tsx`

Weekly reflection prompts.

Three questions (answered as comma-separated or freeform text):
1. Who made your week better?
2. Who did you neglect?
3. Who do you want to invest in long-term?

- Reflection is keyed by `week_of` (Monday of current week)
- If a reflection for the current week exists, form pre-populates for editing
- **Save** — upserts to `reflections` table
- **History** — lists past reflections in reverse chronological order

---

## Profile (`/profile`)

**File:** `src/pages/Profile.tsx`

User account page.

- Displays email and display name
- Stats: contact count, circle count, reflection count (fetched from Supabase)
- **Sign out** — calls `supabase.auth.signOut()` via `useAuth()`

---

## Reset Password (`/reset-password`)

**File:** `src/pages/ResetPassword.tsx`

Handles the Supabase password reset flow after a magic link is clicked.

- Reads the session from the URL hash
- Shows new password form
- Submits via `supabase.auth.updateUser({ password })`

---

## Navigation

**File:** `src/components/BottomNav.tsx`, `src/components/AppLayout.tsx`

- Bottom tab bar visible on all protected pages
- Five tabs: Home (`/`), People (`/people`), Circles (`/circles`), Reflect (`/reflect`), Profile (`/profile`)
- Active tab highlighted with primary color
- `AppLayout` wraps all protected routes and renders the bottom nav plus an `<Outlet />`
