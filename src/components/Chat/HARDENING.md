# Chat and Auth hardening

Implementation complete within Chat/**, Auth/**, aiAgent.ts, server/**, api/** and vercel.json.

- Chat: native modal dialog, labelled 44px controls, Escape, focus restoration, no artificial typing delays or diagnosis claims.
- History: `aura_chat_v1:<userId>`, last 200 messages, draft and unfinished questionnaire; validated restore, per-user isolation, explicit deletion and storage-error feedback.
- Catalog: 17 bundled topics, 5 quizzes, same response engine online/offline. NHS references were checked; external reading links require a connection.
- Auth: real response validation, visible failure states, request cancellation and timeout, explicit private local access. Unconfigured recovery never claims email delivery.
- Backend: mandatory JWT secret (at least 32 characters), scoped JWTs, account existence check, input/body limits, origin allowlist, per-process auth rate limit, transactions, validated TLS and sanitized errors.
- Vercel static API deliberately returns 503 for unavailable account/storage operations and 404 for unknown routes.

Verification commands:

```text
node --test tests/unit/chat-hardening.test.mjs tests/server/auth-hardening.test.mjs tests/server/chronicler-hardening.test.mjs
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
.\node_modules\.bin\oxlint.cmd src/components/Chat src/components/Auth src/services/aiAgent.ts server api --deny-warnings
npm audit --prefix server --omit=dev --audit-level=high
```

Integration and deployment:

- AuthContext/authSession were updated by their owner; this task did not edit them.
- Include the history prefix in delete-all-local-data. Persist full DailyLog payloads and merge `row.data` when reading the backend; legacy columns remain available.
- Backend adds `daily_logs.data JSONB` idempotently and requires database schema permissions at initialization. No live database migration was run in this task.
- Configure DATABASE_URL, JWT_SECRET and ALLOWED_ORIGINS on the real server. Environment variables take precedence over root/server .env files. Remote database certificates must validate.
- Existing JWTs without issuer/audience are rejected and require a new login. Private local sessions remain client-only.
- Backend tests use a simulated database; PostgreSQL integration, multi-instance rate limiting and actual email delivery are not established by these tests.
- Principal owns browser screenshots, Playwright/Selenium, accessibility and offline E2E. No edits were made to those tests or shared UI/CSS/package files.
