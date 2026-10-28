---
plan_hash: <git hash-object of PLAN.md — stamped by /plan on approval>
archetype: <name>
preset: <name>
generated: <date>
---

# UI Spec — <Project>

Source: PLAN.md "Build first" slice.
Archetype: <name>  ·  Preset: <name>  ·  Tokens: `.claude/loadout/ui/tokens.json`

> Fill one `## Screen` block per screen in the slice. **Every screen must list all five
> states** — loading, empty, error, success, partial. A spec missing any state is rejected.
> Design decisions only; for *how* the code is written, the implementer follows
> `loadout:frontend-standards`.

## Screen — <name>
- **Purpose:** <why this screen exists / the job it does>
- **Route:** <path, e.g. /dashboard>
- **Data shown:** <the entities/fields rendered and where they come from>
- **Component map:** (map every element to an existing component before marking it `new`)
    - <element> → <existing component | `shadcn:<item>` | `new` — one-line reason>
    - <element> → ...
- **States:**
    - loading: <what shows — which skeleton/spinner, where>
    - empty: <empty copy + the primary CTA>
    - error: <inline vs toast, and the retry affordance>
    - success: <the normal, populated view>
    - partial: <some data present / degraded — paginated, offline, slow source>
- **Responsive:**
    - 1440 (desktop): <layout>
    - 390 (mobile): <what changes — drawer, stack, scroll-x>
- **A11y:**
    - Focus order: <order of interactive elements on the screen>
    - Labels: <accessible names for controls and inputs>
    - Contrast: text/bg ≥ 4.5:1, UI/boundary ≥ 3:1 — against the tokens above
- **Interactions:** <clicks, submits, navigations, optimistic updates, keyboard shortcuts>

## Screen — <name>
- **Purpose:** ...
  <!-- repeat the block for each screen -->

## Navigation flow
<how the screens connect: entry points, primary transitions, where each CTA leads>
