# Handoff: The Floor Explorer (interactive space view)

## Overview
An interactive section for the THC Club marketing website that shows prospective brands the physical store inside Sayummys Café, Kathmandu: its 4 zones, 18 shelves and 102 slots, the two shelf types, and where top, eye-level and bottom slots sit. Goal: a new brand can work out which slot fits them before applying.

Suggested placement: a homepage section or its own route (e.g. `/the-floor`), linked from the store gallery or pricing pages. The page ends with an "apply for a shelf" CTA.

## About the Design Files
`The Floor Explorer.dc.html` is a **design reference built in HTML**. It's a prototype that shows the intended look and behaviour, not production code to copy. Recreate it in the existing website codebase (`thc-club-website/`: Next.js App Router + Tailwind + shadcn/ui), following that codebase's patterns, Tailwind config and existing components (Button, Badge, Card).

To preview it, open the `.dc.html` file in a browser with `support.js` next to it. The design-system stylesheets it links (`_ds/...`) are not bundled. The page still renders because every style is inline.

## Fidelity
**High fidelity.** Colours, type, radii, spacing, copy and interactions are final. Match them exactly using Tailwind tokens/classes.

## Data (single source of truth — put in e.g. `lib/floor-data.ts`)
```ts
export const ZONES = {
  cafe:     { name: 'café strip',    section: 'Premium', size: '10 ft × 4 ft',  area: '40 sq ft floor',  fixture: '3 standing shelves', type: 'A', shelves: 3, top: 3, eye: 6,  bottom: 9,  total: 18 },
  room1:    { name: 'room 1',        section: 'Regular', size: '10 ft × 10 ft', area: '100 sq ft floor', fixture: '6 standing shelves', type: 'A', shelves: 6, top: 6, eye: 12, bottom: 18, total: 36 },
  room2:    { name: 'room 2',        section: 'Regular', size: '10 ft × 10 ft', area: '100 sq ft floor', fixture: '6 standing shelves', type: 'A', shelves: 6, top: 6, eye: 12, bottom: 18, total: 36 },
  corridor: { name: 'corridor wall', section: 'Regular', size: 'wall run',      area: 'wall only, no floor space', fixture: '3 wall shelves', type: 'B', shelves: 3, top: 4, eye: 8, bottom: 0, total: 12 },
};
// Standing shelf (type A): ONE 3 ft-wide column, 6 slots stacked, each slot full 3 ft wide
export const STANDING_LEVELS = [ { key: 'top', label: 'top', slots: 1 }, { key: 'eye', label: 'eye level', slots: 2 }, { key: 'bottom', label: 'bottom', slots: 3 } ];
// Wall shelf (type B): 12 ft long, ~8–10 in deep, 4 slots of ~3 ft side by side
export const WALLS = [ { name: 'wall 1', level: 'top', key: 'top', slots: [91,92,93,94] },
                       { name: 'wall 2', level: 'eye level', key: 'eye', slots: [95,96,97,98] },
                       { name: 'wall 3', level: 'eye level', key: 'eye', slots: [99,100,101,102] } ];
// Totals: 102 slots (18 premium / 84 regular), 18 shelves. Future: 2 idle shelves → +12 → 114.
```
**Facts not yet confirmed (do not invent):** which of slots #1–90 belong to café / room 1 / room 2, the vertical gap between levels, shelf positions in each room, doors, windows and corridor length. The UI covers these with copy saying "being confirmed". Keep it that way until real data exists.

## Layout (top → bottom)
Section wrapper: bg `#FFFCEB`, padding `clamp(28px,6vw,96px) clamp(18px,5vw,72px)`. Inner container `max-width:1240px; margin:0 auto`, vertical flex, gap `clamp(32px,5vw,56px)`.

### 1. Header (max-width 820px, gap 18px)
- Eyebrow: "THE FLOOR · INSIDE SAYUMMYS CAFÉ, KATHMANDU". 12px, bold, tracking 0.28em, uppercase, `#FE7F2D`.
- H2: "102 shelf slots. four zones. find yours." Size `clamp(40px,6.4vw,92px)`, weight 900, italic, lowercase, line-height 0.92, tracking −0.04em, `text-wrap:balance`.
- Lede: "tap a zone to see its shelves. tap a level to see where every top, eye and bottom slot sits." Size `clamp(17px,1.6vw,21px)`, weight 500, italic, `rgba(1,3,7,0.7)`.

### 2. Stat row
Grid `repeat(auto-fit, minmax(min(100%,200px),1fr))`, gap 14px. Each tile: radius 28px, padding 24px 26px. Number: 52px, weight 900, italic. Label: 11px, bold, tracking 0.24em, uppercase.
1. **102 / Total slots**: bg `#010307`, text `#FFFCEB`, label at 70% opacity.
2. **18 / Premium · café**: bg `#FE7F2D`, text ink, shadow `0 18px 40px -18px rgba(254,127,45,.6)`.
3. **84 / Regular · rooms + wall**: bg `rgba(255,255,255,.6)`, border `1px rgba(1,3,7,.06)`, backdrop-blur 4px.
4. **18 / Shelves on the floor**: same style as tile 3.

### 3. Explorer (two cards)
Grid `repeat(auto-fit, minmax(min(100%,420px),1fr))`, gap 20px. The cards stack on narrow screens.

**3a. Floor plan card (left).** bg `#010307`, text cream, radius 44px, padding `clamp(22px,3vw,36px)`, gap 18px. A decorative orange blur circle (320px, top-right, opacity .22, `blur(120px)`) sits behind the content.
- Header row: "FLOOR PLAN" (left, 11px, tracking .26em, 70% cream) and "SCHEMATIC · NOT TO SCALE" (right, 45% cream).
- Two-column grid, gap 12px:
  - **Café strip**: spans both columns, `aspect-ratio:10/4`, min-height 120px, radius 26px. Name top-left, "PREMIUM" pill top-right, "10 ft × 4 ft · 3 shelves" bottom-left, "18 slots" bottom-right.
  - **Corridor wall**: spans both columns, min-height 76px, radius 22px. Name, then three 6px bars (currentColor, 55% opacity) standing for the 3 wall shelves, then "3 wall shelves" and "12 slots".
  - **Room 1 / Room 2**: one column each, `aspect-ratio:1/1`, radius 26px. Name top, "36 slots" and "10 × 10 ft · 6 shelves" bottom.
  - Zone text: name `clamp(20px,2.4vw,28px)`, 900 italic lowercase. Slot number 32–36px, 900 italic, followed by a small "slots" (13px, 700). Meta line 13px, 500 italic, 80% opacity.
  - **Zone states.** Selected: bg `#FE7F2D`, text ink, border `2px #FE7F2D`; the pill flips to ink bg with cream text. Unselected: bg `rgba(255,252,235,.04)`, text cream, border `2px rgba(255,252,235,.14)`; the pill is orange bg with ink text. Hover: `translateY(-2px)`. Transition .2s.
- Footnote (13px, italic, 55% cream): "the corridor links the café and both rooms. exact shelf positions, doors and corridor length are still being confirmed — this plan shows zones, not a measured layout."

**3b. Zone detail card (right).** bg `rgba(255,255,255,.6)`, border `1px rgba(1,3,7,.06)`, radius 44px, backdrop-blur 4px, gap 22px.
- Badge with the section name (Premium = orange bg / ink text; Regular = ink bg / cream text), 10px, tracking .24em, radius 20px. Next to it the fixture text (11px uppercase, 50% ink).
- Zone name: `clamp(34px,4.4vw,56px)`, 900 italic lowercase. Under it "{size} · {area}" at 16px, italic, 65% ink.
- **Level chips**: "all levels", "top", "eye level", "bottom". Padding 10px 18px, radius 20px, 14px, bold italic lowercase. Active: ink bg, cream text. Inactive: transparent with border `1px rgba(1,3,7,.15)`. Active press: `scale(.95)`.
- **Count tiles**: 4 equal columns, gap 8px, radius 20px, showing top / eye / bottom / total for the zone (number 30px 900 italic; label 10px uppercase). The tile matching the active level (or "total" when "all" is active) is `#FE7F2D`; the others are `rgba(1,3,7,.04)`.
- **Type A zones** (café, rooms): label "STANDING SHELVES IN THIS ZONE", then one mini shelf per shelf (3 or 6) in a wrapping flex row, gap 12px. Each mini shelf is 52×140px, border `2px #010307`, radius 12px, padding 5px, bg cream: **one column of 6 stacked full-width slots** (1 top, 2 eye, 3 bottom), gap 4–5px, slot radius 5px. "SHELF n" label below. Slots at the active level are orange; the rest are `rgba(1,3,7,.08)`. Footnote: "standing slots are numbered #1–90. which numbers sit in which zone is being confirmed."
- **Type B zone** (corridor): label "WALL SHELVES · 12 FT EACH", then 3 rows. Each row is a grid `96px | 1fr`: name + level on the left, and on the right a bordered bar (2px ink, radius 12px) holding 4 equal slots labelled #91… Active slots: orange bg, ink text. Inactive: `rgba(1,3,7,.06)` bg, 40% ink text. Footnote: "shallow (~8–10 in deep). suits flat, light product — prints, stationery, soap, small packs."

### 4. Shelf anatomy (can be hidden)
Eyebrow "SHELF ANATOMY" (orange), H3 "two kinds of shelf." at `clamp(32px,4.4vw,60px)`. Two cards, same grid as section 3.
- **Standing shelf card** (light card style, radius 44px). Title "standing shelf", meta "TYPE A · 15 ON THE FLOOR".
  - Elevation drawing: 150×340px box, border `3px #010307`, radius 16px, padding 8px. **6 full-width slots stacked in one column** (1 top, 2 eye, 3 bottom), gap 6px, radius 8px.
  - Dimension labels: "3 FT WIDE" above (with a bottom rule), "5.5–6 FT HIGH" vertical on the left (with a rule), "~1 FT DEEP" below.
  - To the right, three clickable rows: "top · 1 slot · 3 ft", "eye level · 2 slots · 3 ft", "bottom · 3 slots · 3 ft". Padding 14px 18px, radius 20px. Active: orange. Otherwise `rgba(1,3,7,.04)`. Hover lifts 2px. Clicking a row (or a level in the drawing) toggles that level and stays in sync with the explorer chips.
  - Caption: "one column, 6 slots stacked — every slot runs the full 3 ft width. drawing not to scale — gaps between levels are being confirmed."
- **Wall shelf card** (ink card). Title "wall shelf", meta "TYPE B · 3 ON THE CORRIDOR". "12 FT LONG" rule above a bordered bar (3px cream) holding 4 orange 64px-tall slots labelled "~3 ft". Below it: "~8–10 IN DEEP · WALL-MOUNTED". Then a 3-row table (Shelf / Level / Slots): wall 1 · top · #91–94; wall 2 · eye level · #95–98; wall 3 · eye level · #99–102. Slot ranges in orange, hairline row dividers `rgba(255,252,235,.08)`.

### 5. CTA banner
bg `#FE7F2D`, radius 44px, shadow `0 24px 60px -24px rgba(254,127,45,.55)`, flex row that wraps. Optional eyebrow: "+12 SLOTS COMING · 2 MORE SHELVES WAITING TO GO ON THE FLOOR → 114". Headline: "seen your spot? claim it." at `clamp(28px,3.6vw,46px)`, 900 italic. Button: "apply for a shelf →", ink bg, cream text, padding 18px 30px, radius 28px, 17px 900 italic. Hover inverts to cream bg / ink text; active `scale(.95)`. **Link target: the existing apply/signup route** (the prototype uses a placeholder `#apply`).

## Interactions & State
- `zone: 'cafe' | 'room1' | 'room2' | 'corridor'`, default `'cafe'` (configurable). Clicking a floor-plan zone sets it.
- `level: 'all' | 'top' | 'eye' | 'bottom'`, default `'all'`. Set by the chips. The anatomy rows toggle it (clicking the active one goes back to `'all'`). The level is shared across the detail card and the anatomy drawing.
- Corridor + "bottom" highlights nothing (it has 0 bottom slots). That's correct.
- Transitions: background/colour .15–.2s; hover lift `translateY(-2px)`; press `scale(.95)`. No other animation.
- Make zones and chips real `<button>`s (keyboard accessible, `aria-pressed` for the selected state).
- Optional flags from the prototype: `showAnatomy` (default true), `showFuture` (default true).
- No data fetching. Everything is static (see Data).

## Design Tokens (THC Club)
- Cream `#FFFCEB` · Ink `#010307` · Orange `#FE7F2D` (no other hues).
- Ink tints used: .04, .06, .08, .15, .4, .5, .55, .65, .7. Cream tints on ink: .04, .08, .1, .14, .2, .45, .55, .6, .7.
- Font: Space Grotesk 500 / 700 / 900. Display text is 900 italic lowercase. Micro-labels are 700 uppercase with tracking .16–.28em.
- Radii: 5, 6, 8, 12, 16, 20, 22, 26, 28, 44px.
- Shadows: orange CTA/tile shadows as above. Cards stay flat or use a hairline border.

## Assets
None. No images or icons. Everything is drawn with styled divs.

## Files
- `The Floor Explorer.dc.html`: the prototype. The template holds the markup and inline styles; the logic class at the bottom holds the data and state.
- `support.js`: runtime needed only to preview the prototype locally. Not for production.
