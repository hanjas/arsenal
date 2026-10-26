---
name: remember
description: Long-term memory capture policy. Use to decide what is worth remembering about the user or a project, and to save and retrieve those memories via the recall tools (save_memory, search_memory) and the /recall command.
---

# remember

recall gives Claude a durable memory stored in a local SQLite database (`~/.claude/recall/recall.db`). It survives context compacting and new sessions. Capture is **on-demand** — you save when it matters, you don't log everything.

## The 6 memory types
- **user** — who the user is (role, skills, how they work)
- **preference** — how the user wants Claude to behave
- **project** — what is being built, goals, constraints
- **decision** — a choice made and the reason for it
- **fact** — reusable knowledge worth keeping
- **reference** — a link or resource (repo, doc, dashboard)

## When to save
Save (via the `save_memory` tool) when something is **durable and reusable across sessions**:
- The user states a lasting preference or correction.
- A decision is made that you shouldn't re-litigate later.
- A project goal, constraint, or key fact is established.
- The user says "remember this" / "note that" / "save this".

**Ask for a nod first** when *you* spotted it (not when the user explicitly told you to save). Don't save silently.

## When NOT to save
- Secrets, credentials, tokens, private keys.
- Transient chatter or one-off task details.
- Anything easily derivable from the codebase or git history.
- Duplicates — update the existing memory instead (the tool dedupes by title).

## How to save
Call `save_memory` with:
- `type` (one of the 6), `title` (short label), `content` (the memory)
- `importance` 1–5 (5 = critical, surface first)
- `tags` (optional comma-separated keywords), `project_ref` (optional)

Keep `title` short and specific — it's how memories are scanned and deduped.

## How to retrieve
- Call `search_memory` before answering when prior preferences, decisions, or project context would help.
- Favor high-importance matches.

## User commands
The user manages memory directly with `/recall`:
`save`, `search`, `list [type]`, `show <id>`, `update <id> key=value`, `archive <id>`, `dashboard`.

## Golden rule
Capture the few things that make you understand the user better next time. Quality over volume — a small, trusted memory beats a large, noisy one.
