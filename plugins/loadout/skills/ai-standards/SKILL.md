---
name: ai-standards
description: AI integration standards for Node + NestJS backends and their React frontends. Use whenever planning, writing, reviewing, or verifying code that calls an LLM or AI provider — chat, streaming, structured output, tool use, agents, embeddings, or retrieval (RAG) — so the integration is current, server-side, testable, and safe.
---

# AI Standards

Rules to follow when adding AI features (LLM calls, chat, agents, embeddings, retrieval) to a project. They sit **on top of** `loadout:backend-standards` and `loadout:frontend-standards` — those still govern structure, naming, validation, and styling. Apply these unless the project's own config says otherwise.

## 1. Look up current docs first — never code from memory
AI SDKs change fast: parameters get renamed, models are retired, streaming APIs move. Before writing any SDK call:
- **Anthropic / Claude:** load the `claude-api` skill if it's available.
- **Any provider:** use a docs MCP server for that provider or framework if one is installed; otherwise read the provider's **official** docs (WebFetch/WebSearch).
- Confirm the **current SDK package name and version**, the **current model ID**, and the exact request/response shape for the features you use (streaming, tools, structured output).
- If you genuinely can't reach current docs, say so in your report — don't guess and present it as verified.

## 2. Stack defaults
- **Prefer the provider's official SDK** (e.g. `@anthropic-ai/sdk`, `openai`) called directly. Add a framework (LangChain, Vercel AI SDK, …) only when the plan chose one for a real reason (multi-provider routing, an existing codebase convention, a feature you'd otherwise rebuild).
- **Model IDs live in config, never in code** — `AI_MODEL` (and e.g. `AI_EMBEDDING_MODEL`) in the validated env schema, with the default set in the config module.
- **Validation of model output:** `zod` schemas for structured output (or `class-validator` DTOs to match the project).

## 3. Structure
All provider access goes through one AI module; feature code never imports the SDK.
```
src/
└── ai/
    ├── ai.module.ts
    ├── llm.client.ts          # interface LlmClient + DI token (what tests mock)
    ├── <provider>.client.ts   # the only file that imports the provider SDK
    ├── ai.service.ts          # complete / stream / structured / embed helpers
    ├── prompts/               # one file per prompt, exported as typed builders
    └── tools/                 # tool definitions + handlers (if using tool use)
```
- Feature services inject `AiService` (or `LlmClient`), never the SDK client.
- Swapping provider or model touches `<provider>.client.ts` and config only.

## 4. Keys & security
- API keys are **server-side only**: env vars in the validated config schema, listed in `.env.example` with placeholder values.
- The frontend **never** calls the provider directly and never holds a key — no `VITE_*` / `NEXT_PUBLIC_*` AI keys, no provider SDK imported in frontend code.
- Every AI endpoint sits behind the app's normal **auth guard** and a **per-user rate limit** (`@nestjs/throttler`).
- **User input is data, not instructions:** never concatenate it into the system prompt; pass it in the user turn.
- **Model output is untrusted:** never `eval` it, never use it as raw SQL/shell/HTML; render markdown through a sanitizing renderer.
- Never log keys. Don't log full prompts/completions containing user data by default — log metadata (see §8).

## 5. Streaming
- Stream long or chat-style responses; don't make users wait for the full completion.
- Backend: expose a **POST** endpoint that writes **Server-Sent Events** (`text/event-stream`) — Nest `@Sse()` for GET, or write the SSE frames to the response for POST. Send typed events (`delta`, `done`, `error`).
- **Propagate cancellation:** when the client disconnects, abort the upstream provider request (`AbortController`) so you stop paying for tokens nobody reads.
- Frontend: consume with `fetch` + `ReadableStream` (EventSource can't POST), and expose a **Stop** action that aborts the request.

## 6. Reliability & cost limits
- Set an explicit **timeout** and a **max output tokens** cap on every call.
- **Retry with backoff** on rate-limit (429) and transient 5xx errors only — use the SDK's built-in retries where it has them; never retry on 4xx validation errors.
- Map provider errors to the app's standard error shape (backend-standards §6): the client sees a safe message ("The assistant is unavailable, try again"), the log gets the detail.
- Cap input size (characters/tokens) at the DTO layer so one request can't blow the context window or the bill.

## 7. Structured output, tools, agents, retrieval
- **Structured output:** request it with the provider's native mechanism (JSON schema / tool-forced output), then **validate** with a schema. On a parse failure, retry once, then fail with a clear error — never pass unvalidated output on.
- **Tool use:** each tool is a typed definition plus a handler that calls an ordinary service. Validate tool inputs like any request, and **authorize** them as the calling user — the model doesn't get more permissions than the user has.
- **Agent loops:** cap the number of iterations and the total tokens; log each step.
- **Retrieval (RAG):** store embeddings next to the data — `pgvector` on Postgres, Atlas Vector Search on MongoDB. Record which embedding model produced each vector; re-embed when it changes. Return source references with answers.

## 8. Observability
Log one structured line per AI call: request id, feature, model, input/output token counts, latency, finish/stop reason, error. This is how cost and failures get noticed.

## 9. Frontend (AI UI)
- Every AI surface handles these states: **idle**, **pending** (before first token), **streaming**, **done**, **error** (with retry), **cancelled**.
- Show a Stop control while streaming; disable resubmit while a request is in flight.
- Render model output as sanitized markdown; never `dangerouslySetInnerHTML` raw model text.
- Talk only to your own backend's AI endpoints, through the project's normal data-fetching layer.

## 10. Testing
- **Unit tests mock `LlmClient`** — never call a real provider in the default test run. Use fixture responses, including a malformed structured output and a provider error.
- **E2E tests** run against the mocked client: success, streaming, validation failure, provider error, auth-denied, rate-limited.
- **Live smoke tests** are opt-in: gated behind an env flag (e.g. `AI_LIVE_TESTS=1`) plus a real key, kept tiny (a couple of short calls), never part of CI by default.

## Golden rule
Look up the current docs, keep every provider call server-side behind one AI module, stream with cancellation, cap time/tokens/cost, validate whatever the model returns, and test against a mock.
