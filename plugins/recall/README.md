# recall

Long-term memory for Claude Code, stored in a local SQLite database. recall captures
durable facts, preferences, decisions, and project context so they survive context
compacting and new sessions — helping Claude understand you better over time.

Capture is **on-demand**: Claude saves when you ask ("remember this") or when it spots
something lasting and you confirm. Nothing is logged silently.

## What it provides

- **SQLite storage** at `~/.claude/recall/recall.db` (table: `memories`).
- **Tools for Claude** — `save_memory` (structured, dedupes by title) and `search_memory`.
- **`/recall` command** — `save`, `search`, `list [type]`, `show <id>`,
  `update <id> key=value`, `archive <id>`, and `dashboard`.
- **Dashboard pane** — `/recall dashboard` opens a live pane with Top / Recent / Types
  tabs (keys `1` `2` `3`) and `r` to refresh.
- **`remember` skill** — the policy for what is worth saving.

## Memory types

`user`, `preference`, `project`, `decision`, `fact`, `reference`. Each memory has a
title, content, tags, importance (1–5), optional project reference, timestamps, and an
active/archived status (soft-delete).

## Requirements

- Claude Code v2.1.287 or later (mods support).
- The `sqlite3` CLI available on your PATH.

## Install

```
/plugin marketplace add /path/to/arsenal
/plugin install recall@arsenal
```

## Usage

Try `/recall save type=preference importance=5 title=Short answers keep replies concise`,
then `/recall list` or `/recall dashboard`.
