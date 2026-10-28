---
description: Ship the verified slice — push the work on a feature branch and open a PR into master. Blocks unless VERIFY.md is green. Confirms before any outward action.
argument-hint: (optional notes; --feature <slug> to target a slice)
---

You are running the **ship** stage of the development workflow. You release the built, verified slice by pushing a feature branch and opening a pull request. You run in the main session (git + `gh`). **Confirm before anything leaves the machine.**

Optional notes from the user: $ARGUMENTS

## Resolve the feature

loadout keeps everything under `.claude/loadout/<feature-slug>/` (see `/brainstorm` for the full layout). Pick the slice this run acts on, in order:
1. `--feature <slug>` in `$ARGUMENTS`, if given.
2. else `activeFeature` from `.claude/loadout/config.yml`.
3. else if exactly **one** folder exists under `.claude/loadout/`, use it.
4. else (several, or none) ask the user via **AskUserQuestion** which slice to ship.

Call the resolved path `<feature-dir>` = `.claude/loadout/<feature-slug>/` for the rest of this stage.

## How to run this

1. **Gate on verification (block).** Read `<feature-dir>/VERIFY.md`.
   - If it's missing, stop and tell the user to run `/verify` first.
   - If its verdict is **not** green (anything other than "Ready for /ship" — i.e. failures or gaps), **stop and refuse to ship.** Tell the user what's failing and to fix via `/build`, then re-run `/verify`. Do not push or open a PR.

2. **Tidy the working tree.** Check `git status`. If there are uncommitted changes, show them and, with the user's OK, commit them with a clear message ending with:
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

3. **Resolve branches from config.** Read `.claude/loadout/config.yml` for `baseBranch`, `branchTemplate`, and `activeFeature`; the feature branch name is `branchTemplate` with `{slug}` = `activeFeature` (the resolved `<feature-slug>`). `/build` already created this branch and committed the work on it, so you should be on it — if you're not, switch to it. Confirm it's ahead of the base branch (has commits to ship); if there's nothing to ship, say so and stop. If `.claude/loadout/config.yml` is missing, tell the user to run `/build` first.

4. **Confirm the outward actions.** Before pushing, show the user: the feature branch name, the commits that will go up, and the PR title + base (`baseBranch`). Get a clear yes. Nothing outward happens without it.

5. **Push and open the PR.**
   - `git push -u origin <feature-branch>`
   - Assemble the PR body from the artifacts: a short **summary** (from `<feature-dir>/CONCEPT.md` — what/why), **what was built** (from `<feature-dir>/PLAN.md` phases / `<feature-dir>/PROGRESS.md`), and **verification** (from `<feature-dir>/VERIFY.md`). End the PR body with:
     `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
   - Open it: `gh pr create --base <baseBranch> --head <feature-branch> --title "<title>" --body "<body>"`

6. **Report & stop.** Give the user the PR URL. Optionally save a short `reference` memory to recall (the PR link) via `save_memory` if available. This is the end of the workflow.

## PR body template

```markdown
## Summary
<one or two lines: what this delivers and why, from CONCEPT.md>

## What was built
<the Build-first phases that were completed, from PLAN.md / PROGRESS.md>

## Verification
<the verdict and key results from VERIFY.md — what was checked and passed>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Rules
- **Block** the ship unless `VERIFY.md` is green — no exceptions in this stage.
- **Confirm before pushing or opening the PR** — these are outward actions.
- Never force-push; never reset or discard the user's branches.
- Open a PR into the `baseBranch` from the feature branch (both from `.claude/loadout/config.yml`) — never push straight to the base branch.
- End the PR body with the Claude Code attribution line.
