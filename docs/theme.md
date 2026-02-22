# Warmth — Design System

## Color Palette

All colors are defined as CSS custom properties using HSL values in `src/index.css` and mapped to Tailwind tokens in `tailwind.config.ts`.

### Light Mode (`:root`)

| Token | HSL | Description |
|-------|-----|-------------|
| `--background` | `30 33% 96%` | Cream page background |
| `--foreground` | `20 10% 15%` | Charcoal body text |
| `--card` | `30 30% 98%` | Near-white card surface |
| `--card-foreground` | `20 10% 15%` | Card text |
| `--primary` | `16 55% 52%` | Terracotta — main brand color |
| `--primary-foreground` | `30 33% 96%` | Cream text on primary |
| `--secondary` | `82 20% 55%` | Olive — secondary accent |
| `--secondary-foreground` | `20 10% 15%` | Dark text on secondary |
| `--muted` | `30 20% 90%` | Light warm gray surface |
| `--muted-foreground` | `20 8% 45%` | Subdued text |
| `--accent` | `35 40% 85%` | Warm beige highlight |
| `--accent-foreground` | `20 10% 15%` | Dark text on accent |
| `--destructive` | `0 65% 55%` | Red for delete actions |
| `--border` | `30 15% 85%` | Warm light border |
| `--input` | `30 15% 85%` | Input border |
| `--ring` | `16 55% 52%` | Focus ring (terracotta) |

### Dark Mode (`.dark`)

| Token | HSL | Change |
|-------|-----|--------|
| `--background` | `20 15% 10%` | Deep warm dark |
| `--foreground` | `30 20% 90%` | Light cream text |
| `--card` | `20 12% 14%` | Elevated dark surface |
| `--primary` | `16 55% 55%` | Slightly lighter terracotta |
| `--secondary` | `82 15% 35%` | Darker olive |
| `--muted` | `20 10% 20%` | Dark muted surface |
| `--muted-foreground` | `30 15% 60%` | Mid-tone text |
| `--accent` | `35 20% 22%` | Dark beige |
| `--destructive` | `0 55% 45%` | Darker red |
| `--border` | `20 10% 20%` | Dark border |

### Brand Tokens

Custom `warmth-*` tokens are available in both modes via Tailwind's `warmth` color key:

| Tailwind class | Light HSL | Dark HSL |
|----------------|-----------|----------|
| `warmth-terracotta` | `16 55% 52%` | `16 55% 55%` |
| `warmth-olive` | `82 20% 55%` | `82 15% 40%` |
| `warmth-cream` | `30 33% 96%` | `20 15% 10%` |
| `warmth-beige` | `35 40% 85%` | `35 20% 22%` |
| `warmth-charcoal` | `20 10% 15%` | `30 20% 90%` |

---

## Typography

Loaded from Google Fonts in `src/index.css`:

```
Inter: wght@300;400;500;600   — body text
Source Serif 4: ital,opsz,wght@0,8..60,300;400;600;700;1,8..60,400 — headings
```

- **Body** — `font-family: 'Inter', sans-serif` applied to `body`
- **Headings** — `font-family: 'Source Serif 4', serif` applied to `h1`–`h6`

---

## Border Radius

Base radius is `0.75rem` (`--radius`). Tailwind scale:

| Token | Value |
|-------|-------|
| `rounded-lg` | `0.75rem` |
| `rounded-md` | `0.73rem` (radius - 2px) |
| `rounded-sm` | `0.71rem` (radius - 4px) |

Common overrides used in components: `rounded-xl`, `rounded-2xl`, `rounded-full` (avatars/badges).

---

## Dark Mode

- Class-based: `darkMode: ["class"]` in `tailwind.config.ts`
- Toggle by adding/removing the `dark` class on the root element
- All CSS variables are redefined under `.dark` — no separate stylesheet needed

---

## Component Conventions

| Component | Pattern |
|-----------|---------|
| Cards | `bg-card shadow-sm rounded-2xl p-4` |
| Buttons (primary) | `bg-primary text-primary-foreground rounded-xl` |
| Inputs | `border-input rounded-lg` |
| Page wrapper | `max-w-lg mx-auto px-4 py-6` |
| Tags/chips | `bg-muted text-muted-foreground rounded-full text-xs px-2 py-0.5` |
| Nudge badges | Inline emoji + label, rendered via `getNudgeBadge()` |

---

## Spacing Patterns

- Page horizontal padding: `px-4`
- Page vertical padding: `py-6`
- Max content width: `max-w-lg mx-auto` (mobile-first, centered on desktop)
- Card internal padding: `p-4` or `p-6`
- Section gaps: `space-y-4` or `gap-4`
