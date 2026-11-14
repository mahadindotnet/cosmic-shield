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
- Status colours never appear without an icon and a text label (`StatusBadge`). Normal is green, Watch is amber, Escalate is red, and "No data" is grey. The meaning of each level is explained in every page's Instructions popup (not in the top bar).
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
| `ModulePage`, `ModuleHero`, `PageSection` | Shared page scaffolding so every tab lines up |

Baseline bands live in `lib/health/reference-ranges.ts` and read the Watch thresholds from `data/rules/thresholds.json`.

## Backgrounds and mission environment

The dashboard background is the chosen mission environment's image (`SpaceBackdrop`) with a light scrim. There is no default image, so nothing unrelated flashes before the saved environment loads. Cards keep their own frosted backing for readability.

| Environment | Image |
|---|---|
| None selected | Plain dark space gradient (no image) |
| ISS | `public/backgrounds/iss-orbit.webp` |
| Lunar surface | `public/backgrounds/lunar-surface-eva.webp` (mission patch on the suit blurred out) |
| Mars transit | `public/backgrounds/mars-planet.webp` |
| Mars surface | `public/backgrounds/mars-cliff.webp` |

The background image is clearly visible: a light blur (`backdrop.blur`, default 2 px), per-image brightness (`backdrop.dim`, 0.78–0.95) and full opacity. Readability comes from two things instead of darkening the whole image:

- **Frosted glass panels.** Cards, tiles and panels use the `--glass` tokens (`app/globals.css`): our navy at 60% opacity, a 14 px backdrop blur and a 1 px light border (`glass` / `glass-panel` utilities; `glass-strong` for panels that need more). Glass opacity is tuned per environment on `<html data-environment>` so all panel text meets WCAG AA (4.5:1): ISS 82%, Lunar surface 76%, Mars transit 66%, Mars surface 60%. Section headers that sit directly on the image get their own small glass backing.
- **Edge vignette.** A soft dark vignette only at the screen edges and behind the top bar and sidebar keeps the centre of the image bright.

With `prefers-reduced-transparency: reduce`, panels become solid and the backdrop blur is turned off.

Thumbnails (top bar, sidebar, banners, Mission page) use the same file without blur. When replacing an image, use a new filename so cached copies of the old one are never served, then re-check text contrast in that environment.

The astronaut picks an environment with `MissionPicker`: always in the top navigation bar (`variant="bar"`), on the Mission tab, and in module banners when none is set. The choice is saved on the user's account (`users.environment`, via a Server Action), so it follows them across devices; a localStorage copy only avoids a flash while the account loads. `lib/mission/environments.ts` is the single source for everything that changes per environment: background, dose (from `data/nasa`, see docs/nasa-data-sources.md) and Watch threshold, projected mission dose, gravity, ground delay, exercise target, SANS screening cadence, solar-storm shelter procedure, and a note for each module (shown by `MissionContext`).

## Body map and feature images

`BodyMap` on the Health Dashboard uses `public/organs/anatomy.webp`, made from a source photo (kept outside the repository, credited in README → Image credits): cropped to the figure, with the black background keyed to transparency. Motion is kept subtle: a slow float, a breathing glow and a scan band masked to the figure. All three stop under reduced motion. Callouts: head → Mind, eyes → Eyes, chest dosimeter → Radiation, heart → Vitals, gut → GI, wrist → Sleep & Stress, thigh → Bone Protection. Positions are fractions of the image, so update `HOTSPOTS` if the image changes.

The Health Dashboard shows one key reading per module tile, a statistics grid (`dashboard-stats.tsx`: crew charts plus NASA reference charts), and `StreakPanel`: a Snapchat-style flame counter with an hourglass warning and milestones, beside a LeetCode-style calendar of the current month in a single-hue cyan scale. A round floating co-pilot button (`CopilotButton`, `CopilotMark` logo: an AI spark inside an orbit) sits in the bottom-right corner on every page.

Feature pages show transparent images from `public/organs/` (heart, bone, eye, gi, mind) through `OrganImage`. Callout positions are fractions of each image, converted with `onImage(fx, fy, aspect)`; if an image is replaced, update its aspect constant in the view. Source photos are kept outside the repository (`feature_img/` is gitignored) and credited in README → Image credits. `bone.webp` is recoloured to light cyan so it shows on dark backgrounds. Sleep & Stress and Radiation keep drawn SVG holograms (`holograms.tsx`).

## Navigation

The nine tabs are defined once in `components/cosmic-shield/sections.ts`. The sidebar, header and routes (`/dashboard`, `/dashboard/[section]`) all read from it.
