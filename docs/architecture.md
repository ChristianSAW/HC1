# Warmth — Architecture

## Tech Stack

| Layer | Library / Tool |
|-------|---------------|
| UI framework | React 18 |
| Language | TypeScript |
| Build tool | Vite |
| Routing | React Router v6 |
| Server state | TanStack Query (React Query) — available but most pages use `useEffect` directly |
| Backend / DB | Supabase (Postgres + Auth + Storage) |
| Component library | shadcn/ui |
| Styling | Tailwind CSS |
| Date utilities | date-fns |

---

## Folder Structure

```
src/
├── App.tsx                    # Root component, routing, providers
├── main.tsx                   # React DOM entry point
│
├── pages/                     # One file per route
│   ├── Auth.tsx
│   ├── ResetPassword.tsx
│   ├── Dashboard.tsx
│   ├── People.tsx
│   ├── ContactDetail.tsx
│   ├── ContactForm.tsx
│   ├── Circles.tsx
│   ├── CircleDetail.tsx
│   ├── Reflect.tsx
│   ├── Profile.tsx
│   └── NotFound.tsx
│
├── components/
│   ├── AppLayout.tsx          # Shell with bottom nav + <Outlet />
│   ├── BottomNav.tsx          # Tab bar navigation
│   ├── NavLink.tsx            # Active-aware nav item
│   ├── ContactCard.tsx        # Reusable contact card
│   └── ui/                    # shadcn/ui primitives (button, card, dialog, etc.)
│
├── hooks/
│   ├── useAuth.tsx            # Auth state hook
│   └── use-mobile.tsx         # Viewport width hook
│
├── lib/
│   ├── constants.ts           # HAAS_TAGS, BAY_AREA_LOCATIONS, ENERGY_LEVELS
│   ├── nudges.ts              # Nudge logic and scoring functions
│   ├── defaultContacts.ts     # 9 seed contacts for onboarding
│   └── utils.ts               # cn() helper
│
└── integrations/
    └── supabase/
        ├── client.ts          # createClient() singleton
        └── types.ts           # Generated DB types (Database, Tables<>, etc.)
```

---

## Routing

Defined in `src/App.tsx` using React Router v6.

**Public routes** (no auth required):
- `/auth` — login / signup / forgot password
- `/reset-password` — password reset after magic link

**Protected routes** (require authenticated session):

All protected routes are nested under a `ProtectedRoute` wrapper that renders `AppLayout` (which includes the bottom nav).

| Path | Component |
|------|-----------|
| `/` | `Dashboard` |
| `/people` | `People` |
| `/people/new` | `ContactForm` |
| `/people/:id` | `ContactDetail` |
| `/people/:id/edit` | `ContactForm` |
| `/circles` | `Circles` |
| `/circles/:id` | `CircleDetail` |
| `/reflect` | `Reflect` |
| `/profile` | `Profile` |

**Catch-all:** `*` → `NotFound`

---

## Auth Pattern

`useAuth()` (`src/hooks/useAuth.tsx`):

1. Calls `supabase.auth.getSession()` on mount to hydrate state immediately
2. Subscribes to `supabase.auth.onAuthStateChange` to stay in sync
3. Exposes `{ user, session, loading, signOut }`

`ProtectedRoute` in `App.tsx`:
- While `loading` is true, renders a centered loading message to prevent flash
- If `user` is null after load, redirects to `/auth`
- Otherwise renders children

---

## Data Fetching

Pages fetch directly from Supabase inside `useEffect` calls. There is no global store or shared cache between pages — each page manages its own loading state.

Pattern used in most pages:

```ts
const [contacts, setContacts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .then(({ data }) => {
      setContacts(data ?? []);
      setLoading(false);
    });
}, [user]);
```

TanStack Query is installed but not currently used for data fetching — it is available via the `QueryClientProvider` in `App.tsx`.

---

## Key Utilities

### `cn()` — `src/lib/utils.ts`

Merges Tailwind classes using `clsx` + `tailwind-merge`. Used throughout components:

```ts
cn("base-class", condition && "conditional-class", className)
```

### `isDefaultContact()` — `src/lib/defaultContacts.ts`

```ts
isDefaultContact(id: string): boolean
// Returns true if id starts with "default_"
```

Used to disable edit/delete actions on seed contacts.

---

## Sample Data (Onboarding)

`src/lib/defaultContacts.ts` provides 9 seed contacts shown when a user has no real contacts in Supabase.

- IDs are prefixed with `default_` (e.g., `"default_priya"`)
- Stored in `localStorage` under the key `"warmth_default_contacts"`
- Cleared when the user creates their first real contact
- `isDefaultContact(id)` gates destructive actions (edit/delete disabled for defaults)

Helper functions: `saveDefaultContacts()`, `loadDefaultContacts()`, `clearDefaultContacts()`
