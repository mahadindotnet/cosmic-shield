# Cosmic Shield brand

A dark **mission-console** look: deep-space navy, plasma-cyan accents, a violet nebula glow, thin HUD-style panels.

## Logo

`components/cosmic-shield/logo.tsx`: `CosmicShieldMark` (icon) and `CosmicShieldLogo` (icon + wordmark).
The mark is a **shield** (protection), crossed by an **orbit** (space), with a **pulse line** (health). It uses a cyan-to-violet gradient. `app/icon.svg` is the favicon version; keep the two in sync.

## Colour tokens (`app/globals.css`)

| Token | Use |
|---|---|
| `background` / `card` / `popover` | Navy surfaces; cards are translucent and blurred over the nebula background |
| `primary` | Plasma cyan: active nav, primary buttons, icons, focus ring |
| `nebula` / `accent` | Violet: AI features (Mind tab) and hover tints |
| `muted-foreground` | Secondary text, captions, axis labels |
| `normal` / `watch` / `escalate` (+ `-foreground`) | **Reserved for health status only** |
| `chart-1…4` | Categorical series in fixed order: cyan, violet, magenta, blue. `chart-5` is slate, for "other" |
| `chart-baseline`, `chart-baseline-edge` | Baseline band fill and edge in `TrendChart` |

Rules:
- Status colours never appear without an icon and a text label (`StatusBadge`). Normal is green, Watch is amber, Escalate is red, and "No data" is grey.
- Never use status colours for chart series, and never use chart colours to show status.
- Reference facts that aren't crew health (such as the mission environment) use `StatusCard neutral`.
- The chart palette was checked with a colour-vision-deficiency validator against the dark surface (worst adjacent ΔE 9.4).

## Typography

- **Space Grotesk** (`font-heading`): page and section headings, and the wordmark.
- **Geist** (`font-sans`): body text and UI.
- **Geist Mono** (`font-mono`): readings, units and numeric inputs. The `console-label` utility gives small uppercase eyebrows and captions.

## Reusable components (`components/cosmic-shield/`)

| Component | Purpose |
|---|---|
| `StatusCard` | Headline reading with status rail, badge, unit, caption and reference range. With `href` it becomes a link |
| `TrendChart` | Single-series line with a shaded baseline band. The empty state still draws the band |
| `HistoryTable` | Typed column definitions for previous entries, with an empty state |
| `EntryForm` (+ `EntryField`, `EntryFieldGrid`, `SegmentedField`) | Card-framed form; values arrive as an object in `onSubmit` |
| `HowToMeasure` | Numbered onboard guidance with equipment, duration, tip and caution |
| `SectionHeader`, `ModuleGrid`, `ModuleRow` | Shared page scaffolding so every tab lines up |

Baseline bands live in `lib/health/reference-ranges.ts` and read the Watch thresholds from `data/rules/thresholds.json`.

## Backgrounds and mission environment

The dashboard background is a full-screen image (`SpaceBackdrop`) with a light scrim. Cards keep their own frosted backing for readability.

| Environment | Image |
|---|---|
| None selected | `public/backgrounds/default.webp` (purple forest) |
| ISS | `public/backgrounds/iss.webp` |
| Lunar base | `public/backgrounds/lunar.webp` |
| Mars transit | `public/backgrounds/mars-transit.webp` |

The astronaut picks an environment with `MissionPicker` (on Overview, the Mission tab, and in every module banner when none is set). The choice is saved in localStorage. `lib/mission/environments.ts` is the single source for everything that changes per environment: background, dose and Watch threshold, projected mission dose, gravity, ground delay, exercise target, SANS screening cadence, solar-storm shelter procedure, and a note for each module (shown by `MissionContext`).

## Body map and feature images

`BodyMap` on Overview uses `public/organs/body-front.webp`, `body-left.webp` and `body-right.webp`. All three are cropped to the same 305 × 461 box so the poses line up. Hovering plays one turn (front, left, front, right, front) and settles on the front view, where the callouts are placed. Reduced motion keeps it on the front view. Callouts: head → Mind, eyes → Eyes, chest dosimeter → Radiation, heart → Vitals, gut → GI, wrist → Sleep & Stress, thigh → Bone Protection.

Feature pages show transparent images from `public/organs/` (heart, bone, eye, gi, mind) through `OrganImage`. Callout positions are fractions of each image, converted with `onImage(fx, fy, aspect)`; if an image is replaced, update its aspect constant in the view. Sources are in `feature_img/`. `bone.webp` is recoloured to light cyan so it shows on dark backgrounds. Sleep & Stress and Radiation keep drawn SVG holograms (`holograms.tsx`).

## Navigation

The nine tabs are defined once in `components/cosmic-shield/sections.ts`. The sidebar, header and routes (`/dashboard`, `/dashboard/[section]`) all read from it.
