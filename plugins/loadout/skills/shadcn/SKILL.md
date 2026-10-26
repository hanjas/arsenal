---
name: shadcn
description: How to use the shadcn/ui registry via the bundled shadcn MCP server. Use whenever you need a UI component, block, or theme in a React project — to search, inspect, and install shadcn items instead of hand-writing them.
---

# shadcn

Use the shadcn MCP server (bundled with this plugin) to pull UI from the shadcn registry. Never hand-write a component that shadcn already provides.

## When to use
- You need any standard UI element (button, dialog, form, table, calendar, chart, etc.).
- You need a whole section (login page, dashboard, sidebar) — look for a **block** first.
- You want a theme or style from a registry.

## Workflow
1. **Find it** — `search_items_in_registries` with a keyword (e.g. "date picker", "data table"). Use `list_items_in_registries` to browse everything. Filter by `types` (ui, block, hook, theme…) when helpful.
2. **Inspect it** — `view_items_in_registries` to see the item's files, code, and dependencies before adding.
3. **See usage** — `get_item_examples_from_registries` for real usage examples so you wire it up correctly.
4. **Install it** — `get_add_command_for_items` to get the exact `npx shadcn@latest add …` command, then run it. Components land in `src/components/ui/`.
5. **Verify** — `get_audit_checklist` after adding, to confirm nothing's missing.
6. **Check config** — `get_project_registries` to confirm which registries the project is wired to.

## Rules
- **Prefer blocks** when a whole section matches one — don't rebuild what a block already gives.
- **Don't edit** generated files in `src/components/ui/` unless a real customization needs it; extend via props/variants/`className` instead.
- If the project isn't shadcn-initialized, run `shadcn init` first before adding components.
- Respect shadcn **theme tokens** (CSS variables) — don't hardcode colors that a token covers.
- Always inspect (`view`) before installing, so you know the dependencies you're pulling in.

## Tool reference
| Tool | Purpose |
|------|---------|
| `search_items_in_registries` | Fuzzy search by keyword |
| `list_items_in_registries` | Browse all items (paginated) |
| `view_items_in_registries` | Full details + source of an item |
| `get_item_examples_from_registries` | Usage examples |
| `get_add_command_for_items` | Exact install command |
| `get_audit_checklist` | Post-install checklist |
| `get_project_registries` | Configured registries |
