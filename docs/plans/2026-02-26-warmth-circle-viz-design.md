# Warmth Circle Visualization — Design Doc

**Date:** 2026-02-26
**Scope:** Phase 3 of HC-1 Build Plan — core concentric circle visualization

---

## Summary

Add a toggleable "Circle" view to the Dashboard that shows all contacts positioned in concentric rings based on interaction recency. This is the namesake feature of the product — the visual representation that creates proactive behavior change through time-decay drift.

---

## Placement

A `List | Circle` segmented toggle at the top of the Dashboard switches between the existing card-list view and the new visualization. Default: List. State is ephemeral (no persistence).

---

## Ring Definitions

| Ring | Days since last contact | Label |
|---|---|---|
| 1 (innermost) | 0–7 days | Weekly |
| 2 | 8–30 days | Monthly |
| 3 | 31–90 days | Quarterly |
| 4 (outermost) | 90+ days or never | Drifting |

---

## Visualization Design

**Implementation:** Pure SVG + React — no new dependencies.

- Responsive SVG filling the dashboard viewport
- Four concentric ring strokes, labeled at the right edge
- "You" label at center
- Each contact is a circular node (initials + background color) placed in the appropriate ring
- Nodes distributed at equal angular spacing within each ring
- Node color follows existing nudge badge logic:
  - Terracotta/urgent: no interaction or 90+ days
  - Amber: close friend at risk or 21+ days
  - Olive/muted: healthy

**New file:** `src/components/WarmthCircleViz.tsx`

---

## Node Tap Interaction

Tapping a node opens a bottom `Sheet` (shadcn, already installed) showing:
- Contact name + nudge badge
- Days since last contact
- "Reach Out" button — logs an interaction to Supabase and refreshes contacts (contact moves inward on next render)

---

## Dashboard Changes

`src/pages/Dashboard.tsx` changes:
- Add `viewMode: "list" | "circle"` state
- Add toggle buttons at top
- Conditionally render `<WarmthCircleViz>` or existing section list
- Pass contacts array + `onReachOut` handler to viz component

---

## What Is Not Changing

- Existing list view is untouched
- No new DB tables or schema changes
- No new dependencies
- Nudge logic in `src/lib/nudges.ts` is reused as-is
