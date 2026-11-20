# Tenebris

A design system for a software engineer's portfolio, built on two principles: **tenebrism** — dramatic contrast where darkness dominates and light is earned — and **utilitarian minimalism** — every element serves a purpose, nothing decorates.

The aesthetic is a dark void where only essential information is illuminated. Like a Caravaggio painting applied to a developer portfolio. Direct. Minimal. No fluff.

## Voice

- Speak plainly. Lead with facts, not adjectives.
- Short sentences. No exclamation marks, no emoji.
- Lowercase where possible — the work is the authority, not the typography.
- Technical precision over marketing language.
- First person, direct: "I build" not "passionate developer seeking to leverage."

## Content patterns

- Section numbers in `mono-label` (`01`, `02`) — editorial structure, utilitarian rhythm.
- All-caps tracked labels for categories using `label`: `ENGINEER`, `FULL STACK`, `SYSTEMS`.
- Project descriptions: one sentence of context, one of outcome. No paragraphs.
- Stats as large display numbers with `mono-label` captions beneath.

## Color

Darkness is the default state. Light is applied deliberately — like a spotlight cutting through shadow. The amber `accent` is the system's single point of warmth, used only where attention must land.

- `surface-100` for page ground. `surface-200` for cards. `surface-300` for hover.
- `ink` for primary text. Never pure white — warm parchment for dark, deep umber for light.
- `accent` for links, active states, key indicators. Use once or twice per viewport — scarcity is the point.
- `border` for structural lines only. Hairline (1px), never decorative.
- Dark theme is the identity. Light exists for accessibility, not preference.

## Typography

Two families. No excess.

- **Space Grotesk** (`sans`) — geometric with subtle character. Headers at 600–700 weight with tight negative tracking. Body at 400.
- **JetBrains Mono** (`mono`) — section numbers, metadata, tech labels, code. The engineering fingerprint.

Set body text in `body` style, `ink` on `surface-100`. Headings in `heading-1` through `heading-3`. Section labels in `label` — always uppercase, always tracked at 0.06em. Project numbers and metadata in `mono-label`.

## Spacing

4px base grid. Tight by default — density signals competence. Use `space-12` or larger only between major sections.

- `space-2` to `space-4` within components
- `space-6` to `space-8` between components
- `space-12` to `space-16` between page sections
- `space-24` for top-level region breaks

## Borders and radius

Sharp corners are the default (`radius-none`). Use `radius-md` only for interactive elements — buttons, inputs. The system is angular. Curves are exceptions, not norms.

Borders at 1px in `border`. Visible enough to structure, invisible enough to not decorate.

## Layout

- Full-width dark canvas. Content in a centered column, 960px max.
- Numbered sections (`01 / ABOUT`, `02 / WORK`) in `mono-label` at the top of each block.
- Project cards: `surface-200` background with a `border` edge. Internal padding at `space-4`.
- Generous vertical spacing between sections (`space-16` to `space-24`), tight within (`space-4` to `space-6`).
- No grid of equal cards — stagger, stack, or give one project prominence. Hierarchy, not democracy.

## States and interaction

- Hover: `surface-300` background shift, or `accent` text color.
- Focus: `focus-ring` — 2px solid amber, 2px gap in surface color. Keyboard-first.
- Links: `accent` color, no underline at rest. Underline on hover.
- Transitions: 150ms ease. No bounce, no spring, no playfulness. Mechanical.

## Imagery

- No decorative images. Screenshots only where they prove the work.
- If used, desaturated or monochrome — the amber `accent` is the only color that pops.
- No stock photography. No AI-generated art. No gradients.

## Iconography

No icon library by default. If icons are needed: single-weight stroke icons at 20–24px, `currentColor` fill. Lucide or Phosphor thin weight.

## Using this system

Colors are semantic tokens with dark and light themes. Dark is the default and the identity. Each text token's usage note names the surfaces it meets contrast on. Type is two families — `sans` for content, `mono` for structure and code — across four groups. Focus uses the `focus-ring` token: 2px gap in the surface color, then 2px solid amber ring.
