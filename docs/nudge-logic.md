# Warmth — Nudge Logic

All nudge logic lives in `src/lib/nudges.ts`. It imports `differenceInDays` from `date-fns` and `BAY_AREA_LOCATIONS` from `src/lib/constants.ts`.

---

## BAY_AREA_LOCATIONS

Used to classify contacts as local vs. long distance. Defined in `src/lib/constants.ts`:

```ts
["Berkeley", "San Francisco", "Oakland", "Palo Alto", "San Jose",
 "Mountain View", "Sunnyvale", "Fremont", "Walnut Creek"]
```

A contact's `location` field is matched case-insensitively using `.includes()` — partial matches count (e.g., `"Berkeley, CA"` matches `"Berkeley"`).

---

## `getNudgeBadge(contact)`

Returns a single badge string or `null`. Evaluated in priority order — first matching condition wins.

| Priority | Badge | Condition |
|----------|-------|-----------|
| 1 | `"🔥 Reach out"` | `last_interaction_date` is null (never contacted) |
| 2 | `"⭐ Priority"` | `relationship_depth ≥ 4` AND `days since interaction ≥ 14` |
| 3 | `"🌎 Check in"` | Location is NOT in `BAY_AREA_LOCATIONS` AND `days ≥ 30` |
| 4 | `"💛 Nudge"` | `days since interaction ≥ 21` |
| 5 | `null` | No nudge needed |

**Notes:**
- `relationship_depth` defaults to `3` if null when evaluating the Priority badge
- A contact with no `location` set is NOT considered long distance (returns false for the Check in check)
- The "🔥 Reach out" check is evaluated before all others — a never-contacted close friend shows "🔥 Reach out", not "⭐ Priority"

```ts
export function getNudgeBadge(contact: Contact): string | null {
  if (!contact.last_interaction_date) return "🔥 Reach out";
  const days = differenceInDays(new Date(), new Date(contact.last_interaction_date));
  const depth = contact.relationship_depth ?? 3;
  const isLongDistance = contact.location
    ? !BAY_AREA_LOCATIONS.some((loc) => contact.location!.toLowerCase().includes(loc.toLowerCase()))
    : false;

  if (depth >= 4 && days >= 14) return "⭐ Priority";
  if (isLongDistance && days >= 30) return "🌎 Check in";
  if (days >= 21) return "💛 Nudge";
  return null;
}
```

---

## `getWeeklyOutreach(contacts)`

Returns the top 5 contacts that most need attention this week, sorted by score descending.

**Scoring algorithm:**

| Component | Points |
|-----------|--------|
| Days since last interaction (capped at 90) | 0–90 pts |
| `relationship_depth ≥ 4` | +30 pts |
| Days since interaction ≥ 21 | +20 pts |

- If `last_interaction_date` is null, `days` is treated as `999`, so the days component contributes the maximum 90 points
- The +30 depth bonus and +20 overdue bonus stack on top of the time component
- Maximum possible score: 90 + 30 + 20 = 140 pts

```ts
export function getWeeklyOutreach(contacts: Contact[]): Contact[] {
  const scored = contacts.map((c) => {
    let score = 0;
    const days = c.last_interaction_date
      ? differenceInDays(new Date(), new Date(c.last_interaction_date))
      : 999;
    score += Math.min(days, 90);
    if ((c.relationship_depth ?? 0) >= 4) score += 30;
    if (days >= 21) score += 20;
    return { ...c, _score: score };
  });
  return scored.sort((a, b) => b._score - a._score).slice(0, 5);
}
```

---

## Category Functions

Used to populate Dashboard sections. Each returns a filtered subset of contacts.

### `getGoingCold(contacts)`

Returns contacts with no interaction in 30+ days, OR who have never been contacted.

```ts
days >= 30  OR  last_interaction_date is null
```

### `getCloseFriendsAtRisk(contacts)`

Returns close friends (depth ≥ 4) who haven't been contacted in 14+ days, OR who have never been contacted.

```ts
relationship_depth >= 4  AND  (days >= 14 OR last_interaction_date is null)
```

### `getLongDistance(contacts)`

Returns contacts whose `location` is set and does NOT match any `BAY_AREA_LOCATIONS` entry.

- Contacts with no `location` are excluded (not returned)

### `getLocal(contacts)`

Returns contacts whose `location` matches at least one `BAY_AREA_LOCATIONS` entry.

- Contacts with no `location` are excluded (not returned)

---

## Summary of Thresholds

| Threshold | Used by |
|-----------|---------|
| 14 days | `getCloseFriendsAtRisk`, `getNudgeBadge` (Priority) |
| 21 days | `getNudgeBadge` (Nudge), `getWeeklyOutreach` scoring |
| 30 days | `getGoingCold`, `getNudgeBadge` (Check in) |
| 90 days | `getWeeklyOutreach` score cap |
