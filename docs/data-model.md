# Warmth — Data Model

All tables live in the Supabase `public` schema. Generated TypeScript types are in `src/integrations/supabase/types.ts`.

---

## `profiles`

Extends the Supabase `auth.users` table. Created automatically on signup via a Supabase trigger.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | FK → `auth.users.id` (PK) |
| `display_name` | `text \| null` | User's chosen name |
| `avatar_url` | `text \| null` | Profile photo URL |
| `created_at` | `timestamptz` | Auto-set |
| `updated_at` | `timestamptz` | Auto-set |

---

## `contacts`

Core table. One row per person the user tracks.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, auto-generated |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `name` | `text` | Required |
| `photo_url` | `text \| null` | Avatar image URL |
| `location` | `text \| null` | City / region (used for Bay Area detection) |
| `phone` | `text \| null` | |
| `email` | `text \| null` | |
| `linkedin` | `text \| null` | |
| `relationship_depth` | `int4 \| null` | 1–5 scale; 4+ = close friend |
| `energy_level` | `text \| null` | `"Positive"`, `"Neutral"`, or `"Draining"` |
| `tags` | `text[] \| null` | Array of tag strings from `HAAS_TAGS` |
| `where_met` | `text \| null` | |
| `shared_interests` | `text \| null` | |
| `follow_ups` | `text \| null` | |
| `important_dates` | `text \| null` | |
| `notes` | `text \| null` | |
| `last_interaction_date` | `date \| null` | ISO date string; drives all nudge logic |
| `created_at` | `timestamptz` | Auto-set |
| `updated_at` | `timestamptz` | Auto-set |

**TypeScript interface** (used by nudge functions in `src/lib/nudges.ts`):

```ts
export interface Contact {
  id: string;
  name: string;
  last_interaction_date?: string | null;
  relationship_depth?: number | null;
  location?: string | null;
  photo_url?: string | null;
  tags?: string[] | null;
  [key: string]: any;
}
```

---

## `interactions`

Log of interactions with a contact. Appended each time the user taps "Reach out."

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, auto-generated |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `contact_id` | `uuid` | FK → `contacts.id` |
| `interaction_type` | `text \| null` | e.g., "Coffee", "Call", "Text" |
| `interaction_date` | `date` | Defaults to today |
| `notes` | `text \| null` | |
| `created_at` | `timestamptz` | Auto-set |

---

## `circles`

Named groups created by the user. Analogous to contact lists or tags.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, auto-generated |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `name` | `text` | Required |
| `description` | `text \| null` | |
| `created_at` | `timestamptz` | Auto-set |
| `updated_at` | `timestamptz` | Auto-set |

---

## `contact_circles`

Join table linking contacts to circles. A contact can belong to multiple circles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, auto-generated |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `contact_id` | `uuid` | FK → `contacts.id` |
| `circle_id` | `uuid` | FK → `circles.id` |
| `created_at` | `timestamptz` | Auto-set |

---

## `reflections`

Weekly reflection entries. One row per week per user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, auto-generated |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `week_of` | `date` | Monday of the reflection week (unique per user) |
| `made_week_better` | `text[] \| null` | Q1 answers: who made your week better? |
| `neglected` | `text[] \| null` | Q2 answers: who did you neglect? |
| `invest_long_term` | `text[] \| null` | Q3 answers: who to invest in long term? |
| `notes` | `text \| null` | Optional freeform notes |
| `created_at` | `timestamptz` | Auto-set |
| `updated_at` | `timestamptz` | Auto-set |

---

## Relationships Summary

```
auth.users
  └── profiles (1:1)
  └── contacts (1:many)
        └── interactions (1:many)
        └── contact_circles (many:many via circles)
  └── circles (1:many)
  └── reflections (1:many)
```

---

## TypeScript Usage

**Accessing table row types:**

```ts
import { Tables } from "@/integrations/supabase/types";

type Contact = Tables<"contacts">;
type Circle = Tables<"circles">;
type Reflection = Tables<"reflections">;
```

**Querying with full type safety:**

```ts
import { supabase } from "@/integrations/supabase/client";

const { data } = await supabase
  .from("contacts")
  .select("*")
  .eq("user_id", user.id);
// data is Tables<"contacts">[] | null
```
