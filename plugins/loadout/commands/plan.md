---
description: Turn CONCEPT.md's "Build first" slice into a detailed, phased implementation plan (PLAN.md). Always runs its own technical clarifying round, then writes the plan. No code.
argument-hint: (optional notes; --ui / --no-ui to force or skip the UI design phase; --feature <slug> to target a slice)
---

You are running the **plan** stage of the development workflow. You turn the agreed concept into a concrete, phased implementation plan — and nothing more. Do **not** write code or scaffold the project. That is the `/build` stage.

Optional notes from the user: $ARGUMENTS

## Resolve the feature

loadout keeps everything under `.claude/loadout/<feature-slug>/` (see `/brainstorm` for the full layout). Pick the slice this run acts on, in order:
1. `--feature <slug>` in `$ARGUMENTS`, if given.
2. else `activeFeature` from `.claude/loadout/config.yml`.
3. else if exactly **one** folder exists under `.claude/loadout/`, use it.
4. else (several, or none) ask the user via **AskUserQuestion** which slice to plan.

Call the resolved path `<feature-dir>` = `.claude/loadout/<feature-slug>/` for the rest of this stage.

## How to run this

Work conversationally, across turns. Keep context light — this stage only produces `PLAN.md`.

1. **Read the concept.** Read `<feature-dir>/CONCEPT.md`. If there's no concept anywhere (no `.claude/loadout/` with a feature folder), stop and tell the user to run `/brainstorm` first — or, if the user pasted a concept, run the **shared scaffold step** from `/brainstorm` now (derive the slug, create `.claude/loadout/<feature-slug>/` + `config.yml`, offer the `CLAUDE.md` seed), write the pasted concept to `<feature-dir>/CONCEPT.md`, and continue. **Plan only the "Build first" slice** — ignore the "Later" list except to avoid design dead-ends.

2. **Clarifying round — always, one question at a time.** Regardless of what brainstorm covered, run your own round of **technical / implementation** questions using the **AskUserQuestion** tool, **one question per call**, each with 2–4 suggested options (the user can pick "Other" to type their own). Wait for each answer before the next. Ask only questions that materially change the plan — never re-ask product/scope questions already settled in `CONCEPT.md`. Typical topics:
   - Auth approach (e.g. JWT vs session vs none for now)
   - Database choice + hosting (Postgres vs MongoDB; local vs hosted)
   - Key libraries / patterns where there's a real fork (state management, data fetching, validation)
   - API shape or integration details
   - Anything ambiguous that affects structure or order
   Record every answer as a decision.

3. **Apply the standards.** Use `loadout:frontend-standards` and `loadout:backend-standards` for project structure, file layout, and conventions, so the plan's file hints match how the code will actually be organized.

4. **Draft a detailed phased plan** (see template) and show it inline for the user's thumbs-up. Each phase breaks into tasks, each task names the **file(s)** it touches and the phase has a **"Done when"** check. Note the **order/dependencies** between phases and which **standards** apply.

5. **On approval, persist the plan.**
   - Write the plan to **`<feature-dir>/PLAN.md`**.
   - Save a short summary to **recall** via `save_memory` (`type: project`, `title`: "<name> — plan", `importance: 4`, `project_ref` = the concept name) if recall is available; skip silently if not.

6. **UI design phase (frontend slices only).** Decide whether to run it:
   - Read `.claude/loadout/config.yml` → `features.<feature-slug>.ui.mode` if present. `always` → run; `never` → skip; `auto` (default/absent) → run **only if the slice touches frontend** (UI files, routes, or components in scope, or the plan/concept mentions screens/pages). Skip backend-only work and small tweaks that reuse existing patterns. `--ui` in `$ARGUMENTS` forces it on; `--no-ui` forces it off.
   - **If skipping:** say so in one line and go to step 7.
   - **Bring your own design:** if the user supplied a Figma link or screenshots (in `$ARGUMENTS` or the feature's `ui.references`), tell the designer to skip wireframing and extract the spec from those.
   - **Run the designer — you own the approval gate (it can't talk to the user):**
     a. Spawn the **`ui-designer`** agent (Agent tool) with the "Build first" slice from `PLAN.md`, the `<feature-dir>` path, any reference, and the feature's `ui.*` config. It loads `loadout:ui-design`, drafts the design, and **returns a summary + wireframe paths**.
     b. **You present** that summary and the wireframe paths to the user and collect feedback. On change requests, **re-spawn** the designer with the feedback (it loops over wireframes + spec only). Repeat until the user approves.
     c. **On approval, persist:** confirm the designer wrote `<feature-dir>/UI-SPEC.md` and `<feature-dir>/ui/{tokens.json, acceptance.md, wireframes/*.html}`. Stamp `UI-SPEC.md`'s frontmatter `plan_hash` = `git hash-object <feature-dir>/PLAN.md`. Write/merge the `ui:` block into `features.<feature-slug>.ui` in `.claude/loadout/config.yml` (`mode`, `archetype`, `preset`, `references`, `designSystem`). Save the archetype/preset choice to **recall** (`type: decision`, `importance: 3`, `project_ref` = the concept name) if available.

7. **Stop.** Tell the user the plan (and the UI design, if it ran) is saved, name the paths, and that `/build` is the next stage. Do not start building.

## PLAN.md template

```markdown
# Plan — <Name>

## Source
From CONCEPT.md — "Build first" slice.

## Decisions
<each technical decision from the clarifying round: topic → choice>

## Phases

### Phase 1 — <title>
- <task>
    · <file or module it touches>
- <task>
    · <file or module it touches>
- Done when: <concrete, checkable criteria>
- Standards: <frontend-standards / backend-standards / both>

### Phase 2 — <title>
- ...

## Order & dependencies
<which phases must come before which, and why>

## Risks / open questions
<anything that could trip up the build>

## Status
Plan created <date>. Ready for /build.
```

## Rules
- Plan only the **Build first** slice; never the full vision.
- Always run the clarifying round via AskUserQuestion, one question at a time — but don't re-ask what `CONCEPT.md` already answers.
- No code, no scaffolding of the app — only the plan (the `.claude/loadout/` scaffold is fine to create when a concept was pasted).
- Don't write `PLAN.md` or save to recall until the user approves the drafted plan.
- Run the **UI design phase** (ui-designer agent) for frontend slices per the feature's `ui.mode` / `--ui` / `--no-ui`. The agent drafts and returns; **you** own its approval gate (present, collect feedback, re-spawn until approved) — never let it converse with the user directly. Persist `UI-SPEC.md`, the feature's `ui:` config, and `plan_hash` only after approval.
- Keep it concise and concrete.
