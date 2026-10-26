---
name: frontend-standards
description: Frontend coding standards for React projects. Use whenever writing, reviewing, or scaffolding frontend code in a React + TypeScript + Tailwind + shadcn/ui codebase, so the output follows a consistent stack, structure, naming, and styling convention.
---

# Frontend Standards

These are the rules to follow when writing frontend code. They apply to any React project in this workspace unless the project's own config says otherwise.

## 1. Stack defaults
- **Build tool:** Vite
- **Framework:** React (function components only, no class components)
- **Language:** TypeScript — `strict` mode on. No `any` unless unavoidable (and comment why).
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui — pull UI primitives from the registry via the shadcn MCP instead of hand-writing them. Never reinvent a button, dialog, form, table, etc. that shadcn already provides.
- **Package manager:** match whatever the project already uses (npm/pnpm/yarn); default to npm for new projects.

## 2. Folder structure
```
src/
├── components/        # reusable presentational components
│   └── ui/            # shadcn components live here (do not edit generated files unless needed)
├── features/          # feature-based folders (each with its own components, hooks, logic)
├── hooks/             # shared custom hooks (useXyz)
├── lib/               # utilities, helpers, config (e.g. cn(), api client)
├── pages/ or routes/  # route-level components
├── types/             # shared TypeScript types
└── main.tsx           # entry
```
- Prefer **feature-based** grouping over type-based once a feature grows.
- Co-locate a component's styles, tests, and sub-parts with the component.

## 3. Naming conventions
- **Components:** `PascalCase` — file and component share the name (`UserCard.tsx` → `UserCard`).
- **Hooks:** `useCamelCase` (`useAuth`, `useCartTotal`).
- **Variables / functions:** `camelCase`.
- **Types / interfaces:** `PascalCase` (no `I` prefix).
- **Constants:** `UPPER_SNAKE_CASE` for true constants.
- **Files:** component files `PascalCase.tsx`; everything else `kebab-case.ts`.
- **Booleans:** prefix with `is` / `has` / `should` (`isLoading`, `hasError`).

## 4. Component rules
- Keep components **small and focused** — one job each. Split when a file grows past ~150 lines or does two unrelated things.
- Always **type props** with a `type` or `interface`. Destructure props in the signature.
- Prefer **composition over large prop lists**. Pass `children` where it reads cleaner.
- No business logic inside JSX — extract into hooks or helper functions.
- Keep components **pure**; side effects go in `useEffect` or event handlers only.

## 5. Styling rules
- Use **Tailwind utility classes** for styling. Avoid inline `style={}` except for truly dynamic values.
- Use the shadcn **`cn()` helper** (from `lib/utils`) to merge/conditionally apply classes — never string-concatenate class names.
- Respect the shadcn **theme tokens** (CSS variables) for colors/spacing. Don't hardcode hex colors when a token exists.
- Mobile-first: write base styles, then layer `sm:`/`md:`/`lg:` breakpoints.
- Don't fight shadcn component styles with `!important`; extend via variants or className overrides.

## 6. State management
- Start with **local state** (`useState`, `useReducer`). Don't add a global store until you actually need shared state.
- For shared/global state prefer lightweight options (React Context for small cases, Zustand if it grows). Avoid Redux unless the project already uses it.
- For **server state** (API data), use a query library (e.g. TanStack Query) rather than manual `useEffect` + `useState` fetching.

## 7. Data fetching
- Centralize API calls in `lib/` (a typed client), not scattered in components.
- Always handle the three states: **loading, error, empty/success**. Never render assuming data exists.
- Type all API responses.

## 8. Accessibility & quality
- Use semantic HTML (`button`, `nav`, `main`, `label`) — shadcn handles most a11y, don't undo it.
- All interactive elements must be keyboard-reachable and have accessible names.
- Images need `alt`; form inputs need associated `label`s.
- No magic numbers/strings — name them.

## 9. Formatting & linting
- Follow the project's **ESLint + Prettier** config; if none exists, set up both for a new project.
- Run lint/format before considering code done.
- Keep imports ordered: external → internal (`@/…`) → relative.

## Using shadcn

For any UI element, use the **`shadcn` skill** — it covers the full workflow for searching, inspecting, and installing components from the registry via the bundled MCP. Don't hand-write components that shadcn already provides.

## Golden rule
When a UI element exists in shadcn, fetch it from the registry. When it doesn't, build it following these standards. Keep code readable, typed, and consistent with the surrounding codebase.
