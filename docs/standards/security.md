# Standard — Security

Security constraints for this repo. RFC 2119 keywords apply. There is **no authentication layer** — the safe surface comes from scope discipline and hygiene.

## 1. MUST-Do

- **Never log secrets**: credentials, API keys, tokens, or full connection strings MUST NOT be written via `Logger` or any console output. Log only identifiers/metadata (`Logger.getRequestContext`).
- **Test-SQL route stays localhost-only**: `POST /api` with `X-Test-SQL` in `server/src/index.ts` MUST remain gated on `host === '127.0.0.1' || host === 'localhost'`. Never widen this to non-localhost hosts.
- **Input validation**: `server/src/utils/validation.ts` (zod) MUST cover every ingestion payload; malformed input returns the 400 envelope, never 500 noise or raw DB errors to clients.
- **SQL injection**: all statements MUST use parameter binding via the D1-shim `prepare().bind()` — never string-interpolate request data into SQL.

## 2. SHOULD-Do

- Rate-limit ingestion endpoints (or add idempotency keys) if the deployment faces the public internet.
- Keep `ENABLE_TEST_ROUTES` false in production builds; test-only routes (e.g., test SQL) SHOULD be off outside localhost.
- Dependency upgrades SHOULD be reviewed for the `server/` + `app/` manifests (`bun.lock`/`package-lock.json`).

## 3. Constraints

- The ingestion endpoints are open (no auth) by design — do not add auth expectations to clients in `external/icloud-docker` without an ADR.
- CORS: the app fetches the API server-side, not from the browser; do not broaden CORS headers for browser origins unless an app-side client is added.

## Related

- `server/src/types/database.ts` + `server/src/local.ts` (shim boundary — never conflate with real Cloudflare D1 types).
- `docs/standards/coding.md` (error envelopes), `docs/flows/installation-heartbeat.md` (ingestion surface), `docs/adr/0001-*`.