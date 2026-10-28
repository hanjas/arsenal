---
description: Run the whole loadout workflow end to end as one guided mission. New ideas go brainstorm → plan → build → verify → ship; changes to an existing repo skip brainstorm and go plan → build → verify → ship. Flows stage to stage automatically, pausing only at the human-approval gates each stage already has.
argument-hint: "<what you want — a new idea, or a change to make> (optional flags — --new / --change to force the track, --ui / --no-ui, --feature <slug>, --from <stage>)"
---

You are the **conductor** of a full loadout **mission**. A mission runs the development workflow from a one-line request to an open pull request. The individual stages already exist as their own commands; your job is not to reinvent them but to **pick the right starting stage, run each stage in turn, and flow into the next** — keeping the main session thin.

The request / notes (may be empty): $ARGUMENTS

## Two tracks: new vs. change

A mission handles two shapes of work. **Step 1 is deciding which.**

- **New** — a new product, or a feature big enough that its scope isn't obvious yet. There's a *concept* to pin down first.
  → runs **brainstorm → plan → build → verify → ship**.
- **Change** — a modification to code that already exists: theme/colors, copy, a bugfix, a small refactor, a config change. The repo already *is* the concept, so there's nothing to brainstorm.
  → runs **plan → build → verify → ship** (brainstorm skipped).

**How to pick the track:**
1. `--new` or `--change` in `$ARGUMENTS` forces it.
2. Otherwise infer from the request: phrasing like "build / create / a new app / add a feature" → **new**; "change / fix / update / rename / tweak / the existing …" especially when the repo already has app code → **change**. A repo that already contains a real app is a strong signal for **change**.
3. If it's genuinely ambiguous, ask the user **once** via **AskUserQuestion** (New build vs. Change) and go with their answer. Don't ask when the request is clear.

## The one rule that makes this a mission

Each stage command normally ends by **stopping** and telling the user to run the next command (`/plan` → "run `/build` next", etc.). **You override only that final stop.** When a stage finishes its work, you do **not** wait for the user to type the next command — you report the stage complete and **proceed directly into the next stage yourself.**

Everything else in each stage stays exactly as written. In particular, **every human-approval gate inside a stage is preserved** — you never auto-approve on the user's behalf:

- **brainstorm** (new track only) — the user must approve the drafted concept brief before anything is written.
- **plan** — the user must approve the drafted plan; and, for frontend work, approve the UI design (you own that gate; the `ui-designer` agent can't talk to the user).
- **build** — if the working tree is dirty, ask how to proceed (commit / stash / cancel); confirm the base branch before branching.
- **verify** — no gate (report only), but its verdict gates `/ship`.
- **ship** — refuses unless `VERIFY.md` is green; confirms branch, commits, PR title + base before anything leaves the machine.

So a mission is **fully sequenced but not unattended**: it stops wherever a human decision is genuinely needed, then keeps going.

## How to run a mission

1. **Pick the track** (see above) and tell the user in one line which track you're running and the stages it covers. Don't over-explain; get moving.

2. **Run setup/scaffold** so the downstream stages have the folder + config they depend on:
   - **New track:** brainstorm owns setup — don't run it here, just start at brainstorm.
   - **Change track:** brainstorm is skipped, so **you run the shared scaffold step** (defined in `${CLAUDE_PLUGIN_ROOT}/commands/brainstorm.md`, "Shared scaffold step") before `/plan`: derive a kebab-case slug from the change (e.g. "change the color theme" → `change-color-theme`), create `.claude/loadout/<slug>/`, write/update `.claude/loadout/config.yml` (set `activeFeature`, ensure `baseBranch` + `branchTemplate`, add the `features` entry), and offer the `CLAUDE.md` seed. The step is idempotent — if the scaffold already exists it's a safe no-op. This is the piece that would otherwise be missing on the change track.

3. **Resolve the feature once.** Resolve the target slice the way the stages do — `--feature <slug>` in `$ARGUMENTS`, else `activeFeature` in `config.yml`, else the lone feature folder, else the slug you just derived in step 2. Reuse this one slug for **every** stage; don't re-ask which slice between stages.

4. **Resume vs. fresh start.** Look at which artifacts already exist in `<feature-dir>` and start at the first **incomplete** stage, so re-running a mission doesn't redo finished work:
   - new track, no `CONCEPT.md` → **brainstorm**; else → **plan**.
   - change track → start at **plan** (after setup in step 2).
   - `PLAN.md` exists but no `PROGRESS.md` (or unfinished) → **build**.
   - built but no green `VERIFY.md` → **verify**.
   - green `VERIFY.md` → **ship**.
   - `--from <stage>` in `$ARGUMENTS` overrides this. If you'd re-run an already-completed stage, confirm via **AskUserQuestion** (resume from the next stage vs. redo this one) before clobbering anything.

5. **Run each stage by following its command file.** From the start point through `ship`, read the sibling command file and **carry out its instructions in full** — the same behavior as if the user had typed that command:
   - brainstorm → `${CLAUDE_PLUGIN_ROOT}/commands/brainstorm.md`
   - plan → `${CLAUDE_PLUGIN_ROOT}/commands/plan.md`
   - build → `${CLAUDE_PLUGIN_ROOT}/commands/build.md`
   - verify → `${CLAUDE_PLUGIN_ROOT}/commands/verify.md`
   - ship → `${CLAUDE_PLUGIN_ROOT}/commands/ship.md`

   Pass `$ARGUMENTS` through to each stage (so `--ui`/`--no-ui` reach `/plan`, `--feature` reaches all of them). On the **change track**, `/plan` runs without a `CONCEPT.md` — hand it the change description as its input; it plans directly from that.

6. **Hand off between stages.** At the end of each stage, print a short **mission checkpoint**: which stage finished, what it produced (name the artifact paths), and which stage you're starting next. Then start it — don't stop and wait for a command.

7. **The build ⇆ verify loop.** `/verify` reports only — it never fixes code. If verify comes back **not green**, do **not** proceed to `ship`. Surface the failures and ask via **AskUserQuestion** whether to:
   - **Fix & re-verify (recommended)** — go back into **build** to address the failures, then re-run **verify**. Loop until green or the user stops it.
   - **Stop the mission here** — leave it at the failing verify for the user to dig into.
   Only a green `VERIFY.md` lets the mission reach `ship`.

8. **Finish.** When `ship` opens the PR, print a final **mission complete** summary: the track, the feature/change, the branch, the PR URL, and a one-line recap of what each stage produced. That's the end of the mission.

## Keep the session thin

A mission can be long. Follow the same discipline the stages do: `build` and `verify` already push their heavy work into subagents (orchestrator / verifier) — let them. Your conductor role is launcher + relay between stages, not builder. Don't pull whole plans or codebases into your own context; let each stage and its subagents own the depth.

## Rules

- **Pick the track first** — new (brainstorm first) vs. change (skip brainstorm). Force with `--new`/`--change`; infer otherwise; ask once only if truly ambiguous.
- **Run setup on the change track.** Brainstorm owns the scaffold on the new track; mission runs the shared scaffold step itself before `/plan` on the change track so the folder + `config.yml` exist.
- **Never skip or auto-pass an approval gate.** A mission removes only the *stop-and-wait-for-the-next-command* seam between stages — not the human decisions inside them.
- **Preserve each stage's contract:** brainstorm/plan write no code, build is the only stage that writes code, verify only reports, ship only releases and refuses on a red verify. You don't change what a stage does — you just run the next one after it.
- **Resolve the feature once** and reuse the slug across all stages; respect `--feature`, `--ui`/`--no-ui`, `--from`.
- **Resume cleanly** — start at the first incomplete stage and confirm before redoing a completed one.
- **Stop on a red verify** — loop through build to fix, or stop; never ship a failing slice.
- Report each handoff plainly so the user always knows which stage they're in and what it produced.
