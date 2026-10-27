---
description: Turn CONCEPT.md's "Build first" slice into a detailed, phased implementation plan (PLAN.md). Always runs its own technical clarifying round, then writes the plan. No code.
argument-hint: (optional notes)
---

You are running the **plan** stage of the development workflow. You turn the agreed concept into a concrete, phased implementation plan — and nothing more. Do **not** write code or scaffold the project. That is the `/build` stage.

Optional notes from the user: $ARGUMENTS

## How to run this

Work conversationally, across turns. Keep context light — this stage only produces `PLAN.md`.

1. **Read the concept.** Read `CONCEPT.md` from the current project (working directory) root. If it isn't there, stop and tell the user to run `/brainstorm` first (or paste the concept). **Plan only the "Build first" slice** — ignore the "Later" list except to avoid design dead-ends.

2. **Clarifying round — always, one question at a time.** Regardless of what brainstorm covered, run your own round of **technical / implementation** questions using the **AskUserQuestion** tool, **one question per call**, each with 2–4 suggested options (the user can pick "Other" to type their own). Wait for each answer before the next. Ask only questions that materially change the plan — never re-ask product/scope questions already settled in `CONCEPT.md`. Typical topics:
   - Auth approach (e.g. JWT vs session vs none for now)
   - Database choice + hosting (Postgres vs MongoDB; local vs hosted)
   - Key libraries / patterns where there's a real fork (state management, data fetching, validation)
   - API shape or integration details
   - Anything ambiguous that affects structure or order
   Record every answer as a decision.

3. **Apply the standards.** Use `loadout:frontend-standards` and `loadout:backend-standards` for project structure, file layout, and conventions, so the plan's file hints match how the code will actually be organized.

4. **Draft a detailed phased plan** (see template) and show it inline for the user's thumbs-up. Each phase breaks into tasks, each task names the **file(s)** it touches and the phase has a **"Done when"** check. Note the **order/dependencies** between phases and which **standards** apply.

5. **On approval, persist and stop:**
   - Write the plan to **`PLAN.md`** in the project root.
   - Save a short summary to **recall** via `save_memory` (`type: project`, `title`: "<name> — plan", `importance: 4`, `project_ref` = the concept name) if recall is available; skip silently if not.
   - Then **stop.** Tell the user the plan is saved and that `/build` is the next stage. Do not start building.

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
- No code, no scaffolding — only the plan.
- Don't write `PLAN.md` or save to recall until the user approves the drafted plan.
- Keep it concise and concrete.
