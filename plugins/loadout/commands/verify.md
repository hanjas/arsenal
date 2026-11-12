---
description: End-to-end verification of the built slice. Runs static checks and functionally runs the app against the plan's acceptance criteria, then writes a VERIFY.md report. Report only — it does not fix code.
argument-hint: (optional notes; --feature <slug> to target a slice)
---

You are running the **verify** stage of the development workflow. You confirm the built slice actually works as the plan promised, and you **report the truth** — you do **not** fix code. Fixing is the `/build` stage.

Optional notes from the user: $ARGUMENTS

## Resolve the feature

loadout keeps everything under `.claude/loadout/<feature-slug>/` (see `/brainstorm` for the full layout). Pick the slice this run acts on, in order:
1. `--feature <slug>` in `$ARGUMENTS`, if given.
2. else `activeFeature` from `.claude/loadout/config.yml`.
3. else if exactly **one** folder exists under `.claude/loadout/`, use it.
4. else (several, or none) ask the user via **AskUserQuestion** which slice to verify.

Call the resolved path `<feature-dir>` = `.claude/loadout/<feature-slug>/` for the rest of this stage.

## How to run this

1. **Check inputs.** Confirm `<feature-dir>/PLAN.md` (and ideally `<feature-dir>/PROGRESS.md`) exist. If not, stop and tell the user to run `/build` first.

2. **Launch the verifier.** Spawn ONE subagent (Agent tool, `subagent_type: general-purpose`, `model: sonnet`) as the **verifier**, hand it the brief below **and the `<feature-dir>` path**. The verifier's work is mechanical execution — running checks and writing the report, not product judgment — so it runs on **Sonnet** to conserve plan usage rather than the session's model. Keep the main session thin — relay its report.

3. **Relay & stop.** Summarize the verdict and point to the next stage: `/ship` if everything's green, or `/build` to fix if not.

## Verifier brief (pass this to the subagent)

> You are the verifier. The slice's loadout artifacts live in the **`<feature-dir>`** path handed to you. Confirm the built slice works as promised. **Report only — never edit or fix code.**
>
> 1. **Read the targets.** Read `<feature-dir>/PLAN.md` and `<feature-dir>/PROGRESS.md`, and the "Build first" acceptance in `<feature-dir>/CONCEPT.md`. From these, list what *should* work (the done-criteria and key flows).
>
> 2. **Static checks** — run each and record pass/fail with the relevant output:
>    - Install dependencies
>    - Typecheck
>    - Lint
>    - Full test suite
>    - Production build
>
> 3. **Functional checks** — actually **run the app** and exercise the key flows / acceptance criteria from the plan (start the server/app, hit the main paths, confirm expected behavior). Capture what you observed. **Stop/clean up** anything you started when done.
>
> 4. **UI design checks** — only if `<feature-dir>/UI-SPEC.md` and `<feature-dir>/ui/acceptance.md` exist:
>    - Use the **Playwright MCP** to screenshot each screen at **1440** and **390**, in **light** and **dark**, and check **every line** of `acceptance.md`.
>    - Check **contrast** against `<feature-dir>/ui/tokens.json` (text/bg ≥ 4.5:1, UI/boundary ≥ 3:1).
>    - Read the **Deviations** section of `<feature-dir>/PROGRESS.md`: a spec mismatch that is **logged** there is an **accepted deviation** (pass, with a note); a mismatch that is **not logged** is a **failure**.
>    - **If the Playwright MCP isn't available, skip the visual lines and report them as "not run" — never as passed.** Not-run visual checks are not failures by themselves.
>    - **If the Playwright MCP is present but its browser isn't installed** (a launch/"browser not found" error), also report the visual lines as **not run**, with the fix: `npx playwright install chromium`. Still not a failure.
>
> 4b. **AI integration checks** — only if `<feature-dir>/PLAN.md` has an **AI integration** section. Check against `loadout:ai-standards`:
>    - **Key isolation:** no provider key or provider SDK import in frontend source, and no key-shaped string (e.g. `sk-`, `sk-ant-`) or AI key env var in the production frontend bundle. No real key committed anywhere; `.env.example` lists the AI vars with placeholders. A leak is a **failure**.
>    - **Model config:** the model ID comes from config (`AI_MODEL` or equivalent), not hardcoded in feature code.
>    - **Mocked tests:** the default test run passes **without** a real key and makes no network calls to the provider (run it with the AI key env vars unset).
>    - **Failure handling:** with the provider unreachable or the key invalid, the AI endpoint returns the app's safe error shape (no stack trace, no provider message leaked) and the UI shows its error state.
>    - **Guards & limits:** the AI endpoint rejects unauthenticated requests and oversized input; a rate limit is configured.
>    - **Streaming** (if planned): events arrive incrementally, the UI's Stop action aborts the request, and the backend aborts the upstream call on client disconnect (check the code path if you can't observe it).
>    - **Live smoke test:** only if a real key is available in the environment — run the opt-in live tests (e.g. `AI_LIVE_TESTS=1`) once. If there's no key, report it **not run** — never as passed. Not-run live checks are not failures by themselves.
>
> 5. **Write the report** to `<feature-dir>/VERIFY.md` (see template): every check with pass/fail, each functional criterion with the result, the UI-check and AI-check results, and a clear list of failures and gaps vs the plan — described precisely (where it is, what's wrong) but **not fixed**.
>
> 6. **Save a short summary to recall** via `save_memory` (`type: project`, `title`: "<name> — verify", `importance: 4`, `project_ref` = the concept name) if recall is available; skip silently if not.
>
> 7. **Verdict:** state clearly whether it's ready for `/ship` or needs fixes via `/build`. Unlogged UI mismatches, a leaked AI key, and failing checks block; not-run visual and live-AI checks are noted, not blocking.

## VERIFY.md template

```markdown
# Verification — <Name>

Verified: <timestamp>

## Static checks
- Install: <pass/fail>
- Typecheck: <pass/fail>
- Lint: <pass/fail>
- Tests: <pass/fail — X passed, Y failed>
- Build: <pass/fail>

## Functional checks (against plan acceptance)
- <flow / criterion>: <pass/fail> — <observation>

## UI design checks (if a UI-SPEC exists)
- Acceptance lines: <X passed / Y failed / Z not run>
- Contrast vs tokens: <pass/fail>
- Accepted deviations (logged in PROGRESS.md): <list or none>
- Visual checks: <ran | not run — Playwright MCP unavailable | not run — browser not installed, run `npx playwright install chromium`>

## AI integration checks (if the plan has an AI integration section)
- Key isolation (frontend source + bundle): <pass/fail>
- Model from config: <pass/fail>
- Tests pass with mocked client, no key: <pass/fail>
- Provider failure → safe error + UI error state: <pass/fail>
- Auth, input cap, rate limit: <pass/fail>
- Streaming + cancel: <pass/fail | n/a>
- Live smoke test: <pass/fail | not run — no key available>

## Failures & gaps
<each problem: where it is, what's wrong — report only, not fixed>

## Verdict
<Ready for /ship  |  Needs fixes — run /build>

## Status
Verified <date>.
```

## Rules
- **Report only** — never edit, patch, or fix code in this stage.
- Do **both** static checks and a functional run of the app; a green build is not proof it works.
- Verify against the plan's acceptance criteria, not just "it compiles".
- If a `UI-SPEC.md` exists, check `acceptance.md` and contrast against the tokens; report unlogged spec mismatches as **failures** and `PROGRESS.md`-logged ones as **accepted deviations**. If the Playwright MCP is unavailable, mark visual checks **not run**, never passed.
- If the plan has an **AI integration** section, run the AI checks; a leaked key is always a **failure**, and a live smoke test without a key is **not run**, never passed.
- Run via the verifier subagent on **Sonnet** (mechanical execution, not the session's model); keep the main session light.
- Be honest and precise about failures — this stage's value is telling the truth.
