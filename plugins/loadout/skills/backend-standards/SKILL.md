---
name: backend-standards
description: Backend coding standards for Node.js projects. Use whenever writing, reviewing, or scaffolding backend code in a Node + TypeScript + NestJS + Prisma codebase (Postgres or MongoDB), so the output follows a consistent stack, structure, API, validation, and data-access convention.
---

# Backend Standards

Rules to follow when writing backend code. They apply to any Node backend in this workspace unless the project's own config says otherwise.

## 1. Stack defaults
- **Runtime:** Node.js (current LTS).
- **Language:** TypeScript — `strict` mode on. No `any` unless unavoidable (and comment why).
- **Framework:** NestJS — use its module system, dependency injection, and decorators. Don't bypass Nest with bare Express handlers.
- **ORM:** Prisma — one schema, works for both Postgres and MongoDB. A single `PrismaService` injected where needed.
- **Validation:** `class-validator` + `class-transformer` via a global `ValidationPipe`.
- **Package manager:** match the project; default to npm for new projects.

## 2. Project structure
Feature-based modules, each self-contained:
```
src/
├── main.ts                 # bootstrap (global pipes, filters, config)
├── app.module.ts
├── common/                 # shared guards, filters, interceptors, decorators, pipes
├── config/                 # env schema + config module
├── prisma/
│   ├── schema.prisma
│   └── prisma.service.ts   # PrismaService (extends PrismaClient)
└── <feature>/              # one folder per domain feature
    ├── <feature>.module.ts
    ├── <feature>.controller.ts   # HTTP layer only
    ├── <feature>.service.ts      # business logic
    ├── dto/                      # request/response DTOs
    └── entities/                 # types / Prisma model wrappers
```
**Layering:** controller (HTTP) → service (business logic) → Prisma (data). Controllers never touch the database directly; services never read `req`/`res`.

## 3. Naming conventions
- **Files:** `kebab-case` with role suffix — `users.controller.ts`, `users.service.ts`, `create-user.dto.ts`.
- **Classes:** `PascalCase` with role suffix — `UsersController`, `UsersService`, `CreateUserDto`.
- **Variables / functions:** `camelCase`. **Constants:** `UPPER_SNAKE_CASE`.
- **Interfaces / types:** `PascalCase`, no `I` prefix.
- **Booleans:** prefix with `is` / `has` / `should`.

## 4. API design
- RESTful resource routes; plural nouns (`/users`, `/users/:id`).
- Correct status codes: 200 OK, 201 Created, 204 No Content, 400, 401, 403, 404, 409, 422, 500.
- Version the API (`/api/v1`).
- Consistent success shape; pagination for list endpoints (`page`/`limit` or cursor).
- Use DTOs for every request body and response — never return raw Prisma models with sensitive fields (e.g. password hashes).

## 5. Validation & types
- Validate every input at the edge with DTOs + `class-validator` decorators.
- Enable a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` so unknown fields are stripped and payloads are typed.
- Type everything end to end; derive types from Prisma where possible.

## 6. Error handling
- Throw Nest `HttpException` subclasses (`NotFoundException`, `BadRequestException`, …) from services — don't return error objects.
- Register a global **exception filter** that returns one consistent error shape:
  ```json
  { "statusCode": 404, "message": "User not found", "error": "Not Found", "path": "/api/v1/users/9" }
  ```
- Never leak stack traces, SQL, or internal messages to clients. Log the detail, return a safe message.

## 7. Database (Prisma)
- One `PrismaService` (extends `PrismaClient`) injected via DI; never instantiate `PrismaClient` ad hoc.
- All data access lives in services (or dedicated repository providers) — no Prisma calls in controllers.
- **Migrations:** Postgres uses `prisma migrate` (committed migration files). MongoDB uses `prisma db push` (no migration history — note this difference in the schema datasource).
- Select only needed fields (`select`/`include`); avoid fetching whole rows when you need two columns.
- Use transactions (`$transaction`) for multi-step writes that must succeed together.
- Set the datasource `provider` to `postgresql` or `mongodb`; keep provider-specific features (e.g. relations, `@db` types) in mind — not everything is supported on Mongo.

## 8. Auth & security
- Authentication via guards (e.g. `AuthGuard`/JWT strategy); authorization via role/permission guards.
- Never hardcode secrets — all secrets come from config/env.
- Hash passwords (bcrypt/argon2); never store or log them.
- Rely on the `ValidationPipe` whitelist to reject unexpected input; sanitize anything rendered or used in queries.
- Set security headers (helmet) and sensible CORS.

## 9. Config & environment
- Use `@nestjs/config` with a validated env schema (fail fast on missing/invalid vars at boot).
- No secrets or environment values hardcoded in source. Provide a `.env.example`.

## 10. Logging & observability
- Use structured logging (Nest `Logger` or `nestjs-pino`) — no stray `console.log`.
- Include a correlation/request id per request for tracing.
- Log errors with context (not the client-facing message alone); never log secrets or PII.

## 11. Testing
- **Unit tests** for services (mock Prisma and dependencies) with Jest.
- **E2E tests** for controllers/routes with `supertest` against a test module.
- Cover the important paths: success, validation failure, not-found, and auth-denied.

## 12. Formatting & linting
- Follow the project's **ESLint + Prettier** config; set up both for a new project.
- Keep imports ordered: node/builtin → external → internal → relative.
- Run lint + typecheck before considering code done.

## Golden rule
Keep the layers clean (controller → service → Prisma), validate at the edge, return consistent typed responses, and never leak internals or secrets. Write code that reads like the surrounding NestJS codebase.
