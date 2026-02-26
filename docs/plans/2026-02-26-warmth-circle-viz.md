# Warmth Circle Visualization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a toggleable concentric-circle visualization to the Dashboard that places contacts in rings by interaction recency and lets users log a reach-out by tapping a contact node.

**Architecture:** Pure SVG + React, no new dependencies. A `getWarmthRing` helper is added to `nudges.ts` to classify contacts into rings 1–4. A new `WarmthCircleViz` component renders the SVG and manages a selected-contact sheet. Dashboard gets a `List | Circle` toggle that swaps between the existing view and the viz.

**Tech Stack:** React 18, TypeScript, Vitest + jsdom, shadcn Sheet, date-fns (already installed), Supabase client (already wired)

---

## Ring Definitions

| Ring | Days since last contact | Ring radius (SVG units) | Node fill |
|---|---|---|---|
| 1 — Weekly | 0–7 | 65 | `hsl(82 30% 70%)` (olive) |
| 2 — Monthly | 8–30 | 120 | `hsl(30 40% 72%)` (warm sand) |
| 3 — Quarterly | 31–90 | 168 | `hsl(38 85% 68%)` (amber) |
| 4 — Drifting | 90+ or never | 205 | `hsl(16 55% 65%)` (terracotta) |

SVG viewBox is `0 0 440 440`, center `(220, 220)`.

---

## Task 1: Add `getWarmthRing` to nudges.ts

**Files:**
- Modify: `src/lib/nudges.ts`
- Create: `src/test/nudges.test.ts`

**Step 1: Write the failing test**

Create `src/test/nudges.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getWarmthRing } from "@/lib/nudges";

describe("getWarmthRing", () => {
  const fakeNow = new Date("2026-02-26");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 4 when no last_interaction_date", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: null })).toBe(4);
  });

  it("returns 1 for contact seen today", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2026-02-26" })).toBe(1);
  });

  it("returns 1 for contact seen 7 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2026-02-19" })).toBe(1);
  });

  it("returns 2 for contact seen 8 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2026-02-18" })).toBe(2);
  });

  it("returns 2 for contact seen 30 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2026-01-27" })).toBe(2);
  });

  it("returns 3 for contact seen 31 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2026-01-26" })).toBe(3);
  });

  it("returns 3 for contact seen 90 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2025-11-28" })).toBe(3);
  });

  it("returns 4 for contact seen 91 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2025-11-27" })).toBe(4);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- --reporter=verbose src/test/nudges.test.ts
```

Expected: FAIL — `getWarmthRing is not a function`

**Step 3: Add `getWarmthRing` to `src/lib/nudges.ts`**

Add this export after the `getNudgeBadge` function:

```typescript
export function getWarmthRing(contact: Contact): 1 | 2 | 3 | 4 {
  if (!contact.last_interaction_date) return 4;
  const days = differenceInDays(new Date(), new Date(contact.last_interaction_date));
  if (days <= 7) return 1;
  if (days <= 30) return 2;
  if (days <= 90) return 3;
  return 4;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/test/nudges.test.ts
```

Expected: 8 passing

**Step 5: Commit**

```bash
git add src/lib/nudges.ts src/test/nudges.test.ts
git commit -m "feat: add getWarmthRing helper with tests"
```

---

## Task 2: Add `getRingNodes` positioning helper and test it

**Files:**
- Create: `src/lib/circleLayout.ts`
- Create: `src/test/circleLayout.test.ts`

This is a pure function that takes a list of contacts grouped by ring and returns `{id, x, y, ring}` positions. Isolating it makes the SVG component trivial and keeps business logic testable.

**Step 1: Write the failing test**

Create `src/test/circleLayout.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getRingNodes, RING_RADII, SVG_CENTER } from "@/lib/circleLayout";
import type { Contact } from "@/lib/nudges";

const makeContact = (id: string): Contact => ({ id, name: id });

describe("getRingNodes", () => {
  it("returns empty array for no contacts", () => {
    expect(getRingNodes([])).toEqual([]);
  });

  it("places a single contact at top of its ring (angle = -π/2)", () => {
    const contact = makeContact("a");
    // ring 4 (no interaction date)
    const nodes = getRingNodes([contact]);
    expect(nodes).toHaveLength(1);
    const { x, y, ring } = nodes[0];
    const r = RING_RADII[4];
    expect(ring).toBe(4);
    expect(x).toBeCloseTo(SVG_CENTER + r * Math.cos(-Math.PI / 2), 1);
    expect(y).toBeCloseTo(SVG_CENTER + r * Math.sin(-Math.PI / 2), 1);
  });

  it("distributes two contacts in the same ring 180° apart", () => {
    const contacts: Contact[] = [
      { id: "a", name: "A", last_interaction_date: "2026-02-26" },
      { id: "b", name: "B", last_interaction_date: "2026-02-26" },
    ];
    // both ring 1 — note: test runs without fake timers so "today" may vary;
    // just verify angular separation
    const nodes = getRingNodes(contacts);
    // Both in ring 1 (same day = 0 days, ≤7)
    const ring1 = nodes.filter((n) => n.ring === 1);
    expect(ring1).toHaveLength(2);
    const dx = ring1[1].x - ring1[0].x;
    const dy = ring1[1].y - ring1[0].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // 180° apart on ring 1 → distance = 2 * r
    expect(dist).toBeCloseTo(2 * RING_RADII[1], 0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- --reporter=verbose src/test/circleLayout.test.ts
```

Expected: FAIL — cannot find module `@/lib/circleLayout`

**Step 3: Create `src/lib/circleLayout.ts`**

```typescript
import { differenceInDays } from "date-fns";
import type { Contact } from "./nudges";
import { getWarmthRing } from "./nudges";

export const SVG_SIZE = 440;
export const SVG_CENTER = SVG_SIZE / 2; // 220

export const RING_RADII: Record<1 | 2 | 3 | 4, number> = {
  1: 65,
  2: 120,
  3: 168,
  4: 205,
};

export interface RingNode {
  contact: Contact;
  ring: 1 | 2 | 3 | 4;
  x: number;
  y: number;
}

export function getRingNodes(contacts: Contact[]): RingNode[] {
  // Group contacts by ring
  const groups: Record<number, Contact[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const c of contacts) {
    groups[getWarmthRing(c)].push(c);
  }

  const nodes: RingNode[] = [];
  for (const ring of [1, 2, 3, 4] as const) {
    const ringContacts = groups[ring];
    const count = ringContacts.length;
    const r = RING_RADII[ring];
    ringContacts.forEach((contact, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2; // start from top
      nodes.push({
        contact,
        ring,
        x: SVG_CENTER + r * Math.cos(angle),
        y: SVG_CENTER + r * Math.sin(angle),
      });
    });
  }
  return nodes;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose src/test/circleLayout.test.ts
```

Expected: 3 passing

**Step 5: Commit**

```bash
git add src/lib/circleLayout.ts src/test/circleLayout.test.ts
git commit -m "feat: add getRingNodes layout helper with tests"
```

---

## Task 3: Build `WarmthCircleViz` component

**Files:**
- Create: `src/components/WarmthCircleViz.tsx`

No test here — this is a React rendering component. Manual visual verification in the browser.

**Step 1: Create `src/components/WarmthCircleViz.tsx`**

```tsx
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";
import { getNudgeBadge, type Contact } from "@/lib/nudges";
import { getRingNodes, SVG_SIZE, SVG_CENTER, RING_RADII } from "@/lib/circleLayout";

const RING_LABELS: Record<number, string> = {
  1: "Weekly",
  2: "Monthly",
  3: "Quarterly",
  4: "Drifting",
};

const RING_STROKE: Record<number, string> = {
  1: "hsl(82 20% 55% / 0.35)",
  2: "hsl(30 33% 60% / 0.35)",
  3: "hsl(38 70% 55% / 0.4)",
  4: "hsl(16 55% 52% / 0.45)",
};

const NODE_FILL: Record<number, string> = {
  1: "hsl(82 30% 70%)",
  2: "hsl(30 40% 72%)",
  3: "hsl(38 85% 68%)",
  4: "hsl(16 55% 65%)",
};

interface Props {
  contacts: Contact[];
  onReachOut: () => void;
}

const WarmthCircleViz = ({ contacts, onReachOut }: Props) => {
  const [selected, setSelected] = useState<Contact | null>(null);
  const nodes = getRingNodes(contacts);

  const handleReachOut = async () => {
    if (!selected) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("interactions").insert({
      contact_id: selected.id,
      user_id: user?.id,
      interaction_type: "reach_out",
    });
    if (!error) {
      await supabase
        .from("contacts")
        .update({ last_interaction_date: new Date().toISOString().split("T")[0] })
        .eq("id", selected.id);
      toast({ title: "Logged!", description: `Interaction with ${selected.name} recorded.` });
      setSelected(null);
      onReachOut();
    }
  };

  const daysSince = selected?.last_interaction_date
    ? differenceInDays(new Date(), new Date(selected.last_interaction_date))
    : null;

  return (
    <>
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="w-full max-w-md mx-auto"
        style={{ touchAction: "none" }}
      >
        {/* Rings */}
        {([1, 2, 3, 4] as const).map((ring) => (
          <g key={ring}>
            <circle
              cx={SVG_CENTER}
              cy={SVG_CENTER}
              r={RING_RADII[ring]}
              fill="none"
              stroke={RING_STROKE[ring]}
              strokeWidth={1.5}
            />
            <text
              x={SVG_CENTER + RING_RADII[ring] + 4}
              y={SVG_CENTER}
              fontSize={9}
              fill="hsl(var(--muted-foreground))"
              dominantBaseline="middle"
            >
              {RING_LABELS[ring]}
            </text>
          </g>
        ))}

        {/* Center — You */}
        <circle cx={SVG_CENTER} cy={SVG_CENTER} r={22} fill="hsl(var(--accent))" />
        <text
          x={SVG_CENTER}
          y={SVG_CENTER}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fontWeight="600"
          fill="hsl(var(--accent-foreground))"
        >
          You
        </text>

        {/* Contact nodes */}
        {nodes.map(({ contact, ring, x, y }) => {
          const initials = contact.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <g
              key={contact.id}
              onClick={() => setSelected(contact)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={x} cy={y} r={18} fill={NODE_FILL[ring]} />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fontWeight="600"
                fill="hsl(var(--foreground))"
              >
                {initials}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tap sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">{selected?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {selected && getNudgeBadge(selected) && (
              <Badge variant="secondary">{getNudgeBadge(selected)}</Badge>
            )}
            <p className="text-sm text-muted-foreground">
              {daysSince !== null
                ? `Last contact: ${daysSince} day${daysSince !== 1 ? "s" : ""} ago`
                : "No interactions recorded yet"}
            </p>
            <Button className="w-full" onClick={handleReachOut}>
              Reach Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default WarmthCircleViz;
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/components/WarmthCircleViz.tsx
git commit -m "feat: add WarmthCircleViz SVG component"
```

---

## Task 4: Add `List | Circle` toggle to Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Edit `src/pages/Dashboard.tsx`**

Add `viewMode` state and import `WarmthCircleViz`. The full updated file:

```tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ContactCard from "@/components/ContactCard";
import WarmthCircleViz from "@/components/WarmthCircleViz";
import {
  getGoingCold,
  getCloseFriendsAtRisk,
  getLongDistance,
  getLocal,
  getWeeklyOutreach,
  getNudgeBadge,
  type Contact,
} from "@/lib/nudges";

const Section = ({
  title,
  emoji,
  contacts,
  emptyText,
  onReachOut,
}: {
  title: string;
  emoji: string;
  contacts: Contact[];
  emptyText: string;
  onReachOut: () => void;
}) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      <span>{emoji}</span> {title}
      {contacts.length > 0 && (
        <span className="text-sm font-normal text-muted-foreground">({contacts.length})</span>
      )}
    </h2>
    {contacts.length === 0 ? (
      <p className="text-sm text-muted-foreground pl-1">{emptyText}</p>
    ) : (
      <div className="space-y-2">
        {contacts.slice(0, 5).map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            badge={getNudgeBadge(c) ?? undefined}
            onReachOut={onReachOut}
          />
        ))}
      </div>
    )}
  </section>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "circle">("list");

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("contacts")
      .select("id, name, photo_url, location, last_interaction_date, relationship_depth, tags")
      .eq("user_id", user.id);
    setContacts((data as Contact[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warmth</h1>
          <p className="text-muted-foreground mt-1">Nurture your relationships</p>
        </div>
        {contacts.length > 0 && (
          <div className="flex rounded-xl border overflow-hidden text-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("circle")}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === "circle"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Circle
            </button>
          </div>
        )}
      </header>

      {contacts.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-4xl">🌱</p>
          <p className="text-lg font-medium">Your network starts here</p>
          <p className="text-muted-foreground text-sm">
            Add your first contact to get personalized insights.
          </p>
        </div>
      ) : viewMode === "circle" ? (
        <WarmthCircleViz contacts={contacts} onReachOut={fetchContacts} />
      ) : (
        <div className="space-y-8">
          <Section
            emoji="🎯"
            title="This week's outreach"
            contacts={getWeeklyOutreach(contacts)}
            emptyText="You're all caught up!"
            onReachOut={fetchContacts}
          />
          <Section
            emoji="🔥"
            title="Going cold"
            contacts={getGoingCold(contacts)}
            emptyText="Everyone's warm!"
            onReachOut={fetchContacts}
          />
          <Section
            emoji="⭐"
            title="Close friends at risk"
            contacts={getCloseFriendsAtRisk(contacts)}
            emptyText="Your close friends are taken care of."
            onReachOut={fetchContacts}
          />
          <Section
            emoji="📍"
            title="Local"
            contacts={getLocal(contacts)}
            emptyText="No local contacts yet."
            onReachOut={fetchContacts}
          />
          <Section
            emoji="🌎"
            title="Long-distance"
            contacts={getLongDistance(contacts)}
            emptyText="No long-distance contacts."
            onReachOut={fetchContacts}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
```

**Step 2: Run the dev server and verify visually**

```bash
npm run dev
```

- Open `http://localhost:8080` (or whatever port Vite reports)
- Sign in and go to Dashboard
- Toggle should appear when contacts exist
- Click "Circle" — concentric rings with contact initials should appear
- Tap a contact node — bottom sheet should appear with name, badge, days since contact, and Reach Out button
- Click Reach Out — toast should fire and contact should refresh (moves to inner ring on next render)

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 4: Run full test suite**

```bash
npm run test
```

Expected: all tests pass (including the 8 nudge tests and 3 layout tests from tasks 1–2)

**Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add List/Circle toggle to Dashboard with WarmthCircleViz"
```

---

## Task 5: Push to main

**Step 1: Push**

```bash
git push origin main
```

Expected: clean push, no conflicts
