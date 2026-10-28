---
description: Ship the verified slice — push the work on a feature branch and open a PR into master. Blocks unless VERIFY.md is green. Confirms before any outward action.
argument-hint: (optional notes)
---

You are running the **ship** stage of the development workflow. You release the built, verified slice by pushing a feature branch and opening a pull request. You run in the main session (git + `gh`). **Confirm before anything leaves the machine.**

Optional notes from the user: $ARGUMENTS

## How to run this

1. **Gate on verification (block).** Read `VERIFY.md` in the project root.
   - If it's missing, stop and tell the user to run `/verify` first.
   - If its verdict is **not** green (anything other than "Ready for /ship" — i.e. failures or gaps), **stop and refuse to ship.** Tell the user what's failing and to fix via `/build`, then re-run `/verify`. Do not push or open a PR.

2. **Tidy the working tree.** Check `git status`. If there are uncommitted changes, show them and, with the user's OK, commit them with a clear message ending with:
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

3. **Put the work on a feature branch.** Check the current branch:
   - If on the default branch (`master`/`main`), create and switch to a feature branch named `feat/<slug>` (slug from the concept name in `CONCEPT.md`, kebab-case): `git switch -c feat/<slug>`. The local default branch keeps its commits; you simply won't push it.
   - If already on a non-default branch, use it.
   - Confirm there are commits to ship (the branch is ahead of `origin/master`). If there's nothing to ship, say so and stop.

4. **Confirm the outward actions.** Before pushing, show the user: the branch name, the commits that will go up, and the PR title + base (`master`). Get a clear yes. Nothing outward happens without it.

5. **Push and open the PR.**
   - `git push -u origin feat/<slug>`
   - Assemble the PR body from the artifacts: a short **summary** (from `CONCEPT.md` — what/why), **what was built** (from `PLAN.md` phases / `PROGRESS.md`), and **verification** (from `VERIFY.md`). End the PR body with:
     `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
   - Open it: `gh pr create --base master --head feat/<slug> --title "<title>" --body "<body>"`

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
- Open a PR into `master` from a `feat/<slug>` branch (model A) — don't push straight to `master`.
- End the PR body with the Claude Code attribution line.
