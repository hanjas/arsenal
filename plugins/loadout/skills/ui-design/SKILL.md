---
name: ui-design
description: The UI design-decision playbook — turn a plan's "Build first" slice into an approved design (archetype, resolved tokens, grey-box wireframes, an exhaustive UI spec, and an acceptance checklist) before any code is written. Use when designing UI ahead of a build, typically by the ui-designer agent spawned from /plan.
---

# UI Design

This is the **pre-code design-decision layer** of the workflow. It decides *what* to build on screen and captures it as reviewable artifacts that `/build` implements and `/verify` checks.

## Where this stops and `frontend-standards` begins
- **This skill owns design decisions:** archetype, token *values* (spacing/radius/type scale/color), screen & route inventory, the full set of states, grey-box wireframes, per-screen a11y and contrast *acceptance*, and the component map (which element is an existing component vs `new`).
- **`loadout:frontend-standards` owns code craft:** `src/` layout, naming, component purity, state/data patterns, Tailwind mechanics (`cn()`, utility-first, no hardcoded hex), how to install a shadcn item, ESLint/Prettier.

**Never restate a code convention here.** Where code-level detail is relevant, point to `loadout:frontend-standards` and move on.

## Plugin assets (reference by absolute path)
- Archetypes: `${CLAUDE_PLUGIN_ROOT}/ui/archetypes/*.yaml`
- Presets: `${CLAUDE_PLUGIN_ROOT}/ui/presets/*.json`
- Radix palette snapshot: `${CLAUDE_PLUGIN_ROOT}/ui/palettes/radix.json`
- Templates: `${CLAUDE_PLUGIN_ROOT}/ui/templates/{ui-spec.md,acceptance.md,wireframe.html}`
- Tools (Node ESM, run with `node`): `${CLAUDE_PLUGIN_ROOT}/ui/tools/*.mjs`

## Inputs you read
- `PLAN.md` (root) — the "Build first" slice: screens, routes, flows. This is the source of the inventory.
- `CONCEPT.md` (root) — the product context and "Build first" acceptance.
- `.claude/loadout.yml` → `ui:` block — `mode`, `archetype`, `preset`, `references`, `designSystem` (see Config).
- The project's existing design system (see step 1).

## Playbook

### 1. Detect context
Scan the project for an existing design system and report what you find (one line):
Tailwind config, CSS custom properties / theme files, `components.json` (shadcn), a Mantine/MUI/Chakra theme, Storybook. If one exists, it is authoritative and overrides presets.

### 2. Pick an archetype
From `${CLAUDE_PLUGIN_ROOT}/ui/archetypes/`, suggest the best-fit archetype with a **one-line reason**. If `.claude/loadout.yml` `ui.archetype` is already set (or recall has a prior choice), suggest that and say so. The user confirms via the `/plan` gate.

### 3. Resolve tokens — strict priority order
1. **Existing project tokens / design system** (from step 1) — always win. Use them as-is.
2. **User reference** — if `ui.references` lists a URL or screenshot, run
   `node ${CLAUDE_PLUGIN_ROOT}/ui/tools/extract-reference.mjs <ref>` and use its `tokens.json`.
   These values belong to the user's project only — never write them back into plugin presets.
3. **Preset** — otherwise read the chosen preset JSON and resolve it.

Resolving a preset's colors: each `color` field is a scale name like `radix:slate`. Look it up in
`${CLAUDE_PLUGIN_ROOT}/ui/palettes/radix.json` to get the concrete **12-step light and dark**
values, and write them into `tokens.json`. ("Build time" = now, when you write the tokens.)
Then:
- Classify by role; ensure **WCAG** — text/bg ≥ 4.5:1, UI/boundary ≥ 3:1. Adjust lightness if a pair fails.
- Always emit both `light` and `dark`. If the source has no dark mode, derive one and mark `"derived": true`.
- Also emit a resolved **`shadcn`** block in `tokens.json` (light + dark CSS-variable values) per the **Token → shadcn theme mapping** below, so `/build` applies the theme in one step and no `shadcn init` default survives.

Ask for a reference **once**; if none is given, continue with the preset.

### 4. Screen inventory
From `PLAN.md` (and `CONCEPT.md`), list the screens, their routes, and the navigation flow. This set drives everything below.

### 5. Wireframes
Copy `${CLAUDE_PLUGIN_ROOT}/ui/templates/wireframe.html` to `.claude/loadout/ui/wireframes/<screen>.html`, one per screen, and fill the regions with **labelled grey boxes**. Never style them — neutral greys, system font, labels only.
If the user supplied the design (Figma link or screenshots), **skip wireframing** and derive the spec from those instead.

### 6. UI spec
Fill `${CLAUDE_PLUGIN_ROOT}/ui/templates/ui-spec.md` into `UI-SPEC.md` at the **project root**, with every screen and — for each — **all five states** (loading / empty / error / success / partial), responsive behaviour at 1440 and 390, a11y notes (focus order, labels, contrast), the component map, and interactions. During the component map, check the **shadcn MCP** registry to confirm whether a component already exists before marking anything `new`. **Reject a spec that is missing any state** and fix it before returning. Write the frontmatter fields (`archetype`, `preset`, `generated`); `/plan` stamps `plan_hash` with `git hash-object PLAN.md` on approval.

### 7. Acceptance
Generate `.claude/loadout/ui/acceptance.md` from the spec using `${CLAUDE_PLUGIN_ROOT}/ui/templates/acceptance.md`: one line per screen × state × breakpoint, plus a contrast line per screen.

### 8. Approval gate — handled by `/plan`, not here
You **cannot** converse with the user. Return to `/plan`: a short summary (archetype, preset/token source, screen count) and the wireframe paths. `/plan` presents it, collects feedback, and re-spawns you with that feedback. On a revision pass, loop only over **steps 5–6** (wireframes + spec), then return again. Only `/plan` persists the approval and the `ui:` config.

## Token → shadcn theme mapping
`/build` applies these at scaffold time so no `shadcn init` default survives. Steps are Radix
12-step positions (1 = app background … 9 = solid accent … 11 = low-contrast text … 12 = text).
The dark theme uses the **same step indices** from each scale's dark values.

| shadcn CSS var | Token source (step) |
|---|---|
| `--background` | neutral 1 |
| `--foreground` | neutral 12 |
| `--card`, `--popover` | neutral 1 |
| `--card-foreground`, `--popover-foreground` | neutral 12 |
| `--primary` | accent 9 |
| `--primary-foreground` | accent contrast (step-9 pairing) |
| `--secondary` | neutral 3 |
| `--secondary-foreground` | neutral 12 |
| `--muted` | neutral 3 |
| `--muted-foreground` | neutral 11 |
| `--accent` | neutral 4 |
| `--accent-foreground` | neutral 12 |
| `--border` | neutral 6 |
| `--input` | neutral 7 |
| `--ring` | accent 8 |
| `--destructive` | danger 9 |
| `--destructive-foreground` | danger contrast |
| `--radius` | preset `radius.md` (px → rem) |
| `--chart-1` | accent 9 |
| `--chart-2` | success 9 |
| `--chart-3` | warning 9 |
| `--chart-4` | danger 9 |
| `--chart-5` | accent 11 |

`radix.json` carries each scale's 12 light + 12 dark values plus the step-9 `contrast` color.
`chart-2..5` is a pragmatic default — refine with the `dataviz` skill for chart-heavy archetypes.

## Output contract
- `UI-SPEC.md` — project root (human-facing, next to `PLAN.md`)
- `.claude/loadout/ui/tokens.json`
- `.claude/loadout/ui/wireframes/*.html`
- `.claude/loadout/ui/acceptance.md`

## Config & memory
- **`.claude/loadout.yml` `ui:` block is the source of truth** (committed, read by build/verify):
  ```yaml
  ui:
    mode: auto        # auto | always | never — whether /plan runs the designer
    archetype: data-dashboard
    preset: compact-neutral
    references: []    # URLs or screenshot paths the user supplied
    designSystem: shadcn   # or null / the detected system
  ```
  `/plan` writes this on approval.
- **recall is advisory only:** `/plan` may save the archetype/preset choice (`type: decision`) so a later session can *pre-suggest* it. recall never overrides `.claude/loadout.yml` or an existing project design system.

## Rules
- Never style the wireframes; never name a brand, website, or URL (open-source systems like shadcn/Radix/Tailwind are fine).
- Map every element to an existing component before marking it `new`.
- Existing project tokens / design system always beat a preset; a user reference beats a preset; presets are the fallback.
- A spec missing any state is invalid.
- Keep messages to `/plan` short — you draft and return; the gate lives in `/plan`.
