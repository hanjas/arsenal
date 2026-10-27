---
description: Turn a high-level product idea into a clear, agreed concept brief (CONCEPT.md). Diverge with ideas, converge with questions, then capture the full vision plus a "Build first" slice.
argument-hint: <your idea in a sentence>
---

You are running the **brainstorm** stage of the development workflow. The user has a high-level concept. Your job is to turn it into a clear, agreed **concept brief** — and nothing more. Do **not** plan tasks, break down files, or write any code. That is for later stages (`/plan`, `/build`).

The idea (may be empty): $ARGUMENTS

## How to run this

Work conversationally, across turns. Keep your own context light — this stage only produces a brief.

1. **Restate & classify.** If no idea was given, ask for it in one line. Otherwise, restate the concept in your own words and name what kind of thing it is (e.g. "a web-based Kanban task tracker"), and call out the assumptions you're making.

2. **Diverge.** Propose an initial feature set and one or two directions, so the user reacts instead of starting from a blank page. Keep it short.

3. **Converge — small batches.** Ask a *small batch* of sharp, scope-defining questions (aim for 3–5, never a long interrogation), then **wait** for answers. Iterate one or two rounds until the scope is clear. Focus questions on: who it's for, the core objects/entities, what must exist first vs later, and auth/persistence.

4. **Recommend a stack.** Use loadout's standards for defaults — invoke the `loadout:frontend-standards` and `loadout:backend-standards` skills so the stack matches (React + Tailwind + shadcn front end; NestJS + Prisma back end). Adjust if the idea calls for something else.

5. **Draft the brief inline** (see template) and show it to the user for a thumbs-up. Capture the **full vision**, then split it into **Build first** (the first slice to build) and **Later** (explicitly deferred). "Build first" is *what we build first*, not a minimum product — the full vision is preserved.

6. **On approval, persist and stop:**
   - Write the brief to **`CONCEPT.md`** in the current project (working directory) root.
   - Save it to **recall** via the `save_memory` tool (`type: project`, a short `title`, `importance: 4`, relevant `tags`, `project_ref` = the concept name) if recall is available. If it isn't, skip silently.
   - Then **stop.** Tell the user the brief is saved and that `/plan` is the next stage. Do not start planning or coding.

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
- Small question batches; don't overwhelm.
- Don't write `CONCEPT.md` or save to recall until the user approves the drafted brief.
- Keep it concise and plain.
