---
description: Turn a high-level product idea into a clear, agreed concept brief (CONCEPT.md). Diverge with ideas, converge with questions, then capture the full vision plus a "Build first" slice.
argument-hint: <your idea in a sentence>
---

You are running the **brainstorm** stage of the development workflow. The user has a high-level concept. Your job is to turn it into a clear, agreed **concept brief** — and nothing more. Do **not** plan tasks, break down files, or write any code. That is for later stages (`/plan`, `/build`).

The idea (may be empty): $ARGUMENTS

## Where loadout keeps its files

Everything a loadout run produces lives under the project's `.claude/loadout/` folder, grouped **per feature slice**:

```
.claude/loadout/
  config.yml                 project-level config + active-feature pointer
  <feature-slug>/            one folder per slice
    CONCEPT.md  PLAN.md  PROGRESS.md  VERIFY.md  UI-SPEC.md
    ui/ { tokens.json, acceptance.md, wireframes/*.html }
```

`<feature-slug>` is a kebab-case slug derived from the concept name (e.g. "Kanban Task Tracker" → `kanban-task-tracker`). This stage owns creating that folder and the config. Nothing is written to disk until the user approves the brief.

## How to run this

Work conversationally, across turns. Keep your own context light — this stage only produces a brief.

1. **Restate & classify.** If no idea was given, ask for it in one line. Otherwise, restate the concept in your own words and name what kind of thing it is (e.g. "a web-based Kanban task tracker"), and call out the assumptions you're making.

2. **Diverge.** Propose an initial feature set and one or two directions, so the user reacts instead of starting from a blank page. Keep it short.

3. **Converge — one question at a time.** Use the **AskUserQuestion** tool to ask scope-defining questions **one at a time** (a single question per call), each with 2–4 suggested answer options so the user can pick quickly (they can always choose "Other" to type their own). **Wait** for each answer before asking the next. Keep going until the scope is clear — typically covering: who it's for, the core objects/entities, what to build first vs later, and auth/persistence. Don't dump questions as a plain-text list; drive each one through the tool.

4. **Recommend a stack.** Use loadout's standards for defaults — invoke the `loadout:frontend-standards` and `loadout:backend-standards` skills so the stack matches (React + Tailwind + shadcn front end; NestJS + Prisma back end). Adjust if the idea calls for something else.

5. **Draft the brief inline** (see template) and show it to the user for a thumbs-up. Capture the **full vision**, then split it into **Build first** (the first slice to build) and **Later** (explicitly deferred). "Build first" is *what we build first*, not a minimum product — the full vision is preserved.

6. **On approval, scaffold and persist:**
   - **Derive the slug** — kebab-case the concept name. This is the feature folder name.
   - **Ensure the scaffold** (see the shared step below): create `.claude/loadout/<feature-slug>/`, write/update `.claude/loadout/config.yml`, and offer the `CLAUDE.md` seed.
   - **Write the brief** to **`.claude/loadout/<feature-slug>/CONCEPT.md`**.
   - **Save it to recall** via the `save_memory` tool (`type: project`, a short `title`, `importance: 4`, relevant `tags`, `project_ref` = the concept name) if recall is available. If it isn't, skip silently.
   - Then **stop.** Tell the user where the brief was saved (the path) and that `/plan` is the next stage. Do not start planning or coding.

## Shared scaffold step (also run by `/plan`)

This step is idempotent — safe to run again. `/plan` runs the same step when the user skips brainstorm and pastes a concept.

1. **Ensure the config.** If `.claude/loadout/config.yml` is missing, create the `.claude/loadout/` folder and write it with:
   - `baseBranch` — the repo's current default branch (fallback to `main` if not a git repo yet)
   - `branchTemplate: "feat/{slug}"`
   - `activeFeature: <feature-slug>`
   - a `features:` map with one entry for `<feature-slug>` holding `createdAt: <today>`
   If it exists, read it, add the `<feature-slug>` entry under `features:` if absent, and set `activeFeature: <feature-slug>` (this feature is now the one the pipeline acts on).
2. **Ensure the feature folder.** Create `.claude/loadout/<feature-slug>/` if it doesn't exist.
3. **Offer the `CLAUDE.md` seed (opt-in, never destructive).** If the project root has **no** `CLAUDE.md`, offer via **AskUserQuestion** to create one seeded with a one-paragraph project summary from the concept plus a short "Built with loadout" note. If a `CLAUDE.md` already exists, **do not touch it** (at most offer to append a brief loadout section, only on a yes). Never overwrite an existing `CLAUDE.md`.

`config.yml` shape:

```yaml
baseBranch: master
branchTemplate: "feat/{slug}"
activeFeature: <feature-slug>
features:
  <feature-slug>:
    createdAt: <date>
    # ui: block is added by /plan's UI design phase
```

## CONCEPT.md template

```markdown
# Concept — <Name>

## One-liner
<one sentence>

## Problem
<what problem this solves>

## Users
<who uses it>

## Full vision
<everything the product should eventually do>

## Build first
<the first slice we will build — bounded and shippable>

## Later
<explicitly deferred for after the first slice>

## Data model (sketch)
<key entities and their main fields/relationships>

## Stack
- Frontend: <per frontend-standards, adjusted as needed>
- Backend: <per backend-standards, adjusted as needed>
- Database: <Postgres / MongoDB / none>

## Key screens / surfaces
<main screens or API surfaces>

## Open questions
<anything still undecided>

## Status
Brief created <date>. Ready for /plan.
```

## Rules
- Stay in brainstorm scope: define **what** and **why**, never **how** or **when**.
- Ask questions one at a time through the AskUserQuestion tool, each with suggested options; never batch them as a text list.
- Don't scaffold, write `CONCEPT.md`, or save to recall until the user approves the drafted brief.
- Never overwrite an existing `CLAUDE.md` — the seed is opt-in and non-destructive.
- Keep it concise and plain.
