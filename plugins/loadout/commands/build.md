---
description: Execute PLAN.md end to end via an orchestrator subagent that delegates each phase to worker subagents, tracks progress in PROGRESS.md, verifies done-criteria, and commits after each phase.
argument-hint: (optional notes)
---

You are running the **build** stage of the development workflow. You implement the plan by **orchestrating subagents** — keep the main session thin. Your role here is launcher + relay, not builder.

Optional notes from the user: $ARGUMENTS

## How to run this

1. **Check inputs.** Confirm `PLAN.md` exists in the project root. If not, stop and tell the user to run `/plan` first. Read it enough to confirm it has phases; don't load the whole thing into deep context — the orchestrator will.

2. **Launch the orchestrator.** Spawn ONE subagent (Agent tool, `subagent_type: general-purpose`) as the **build orchestrator**, and hand it the brief below. Then relay its progress updates and final summary to the user. Do not build anything yourself.

3. **Relay & stop.** When the orchestrator finishes, summarize what was built, what's left (any blocked items), and that `/verify` or `/ship` is the next stage.

## Orchestrator brief (pass this to the subagent)

> You are the build orchestrator for this project. Implement `PLAN.md` end to end by delegating to worker subagents. Keep your own context lean.
>
> **Setup:**
> 1. Read `PLAN.md` and, if present, `PROGRESS.md`. If `PROGRESS.md` doesn't exist, create it from the plan's phases/tasks, all marked `pending` (see template).
> 2. **Phase 0 — scaffold:** if the project isn't set up yet, scaffold it per the plan's stack (e.g. Vite + React + Tailwind, or NestJS; run `shadcn init` for UI projects). Follow `loadout:frontend-standards` / `loadout:backend-standards`.
>
> **For each phase, in plan order (run all phases through — don't stop between them):**
> 1. Mark the phase `in-progress` in `PROGRESS.md`.
> 2. Look at the phase's tasks and the plan's "Order & dependencies". **Run independent tasks in parallel** (spawn multiple worker subagents at once); **run dependent tasks sequentially** (a task that needs another's output waits for it). Decide this per phase.
> 3. Delegate each task to the right **expert worker agent** (Agent tool):
>    - **`frontend-engineer`** for UI / React / frontend tasks
>    - **`backend-engineer`** for API / NestJS / Prisma / data tasks
>    If a task spans both, split it so each expert gets its part. (If an expert agent type isn't available to you, fall back to a `general-purpose` worker and include the standard-reading mandate in its brief.)
>    Give each worker: the specific task, the file(s) it touches (from the plan), and **which standard(s) apply**. The expert agents already treat reading the applicable standard (`loadout:frontend-standards` / `loadout:backend-standards`, and `loadout:shadcn` for UI) as a mandatory first step and use the shadcn MCP — still name the applicable standard in the brief so there's no doubt.
> 4. As tasks move, update their status in `PROGRESS.md` (`pending` → `in-progress` → `done`, or `blocked` with a reason).
> 5. When the phase's tasks are done, run its **"Done when"** checks (typecheck, build, and tests where present). Fix failures (delegate if needed) before marking the phase `done`.
> 6. **Commit the completed phase:** `git add -A` and commit with a message like `Build: Phase N — <title>`, ending the message with:
>    `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
>    Do **not** push — pushing is the `/ship` stage.
> 7. Move to the next phase.
>
> **If blocked:** mark the task `blocked` in `PROGRESS.md` with the reason, skip to work that isn't blocked, and report all blocked items at the end rather than stalling the whole build.
>
> **When all phases are processed:** give a final summary — phases completed, commits made, anything blocked or deferred.

## PROGRESS.md template

```markdown
# Progress — <Name>

Updated: <timestamp>

## Phase 1 — <title>  [pending|in-progress|done|blocked]
- [ ] <task>
- [ ] <task>
Notes: <blockers, decisions, follow-ups>

## Phase 2 — <title>  [pending]
- [ ] <task>
```

## Rules
- The main session orchestrates via subagents; it does not write feature code itself.
- Run all phases through; the orchestrator chooses parallel vs sequential per task from the plan's dependencies.
- Commit after each completed phase; never push (that's `/ship`).
- Keep `PROGRESS.md` current — it's the source of truth for where the build stands.
- Standards are mandatory: the orchestrator names and locates the applicable standard for each task, and every worker must read it before writing code. Use the shadcn MCP for UI.
- Don't re-ask product/plan questions already settled; only surface a genuine blocker.
