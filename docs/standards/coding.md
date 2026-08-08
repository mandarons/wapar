# Standard — Coding (TypeScript)

Rules for writing and changing TypeScript in `server/` and `app/`. RFC 2119 keywords apply. Read alongside the repo-level style notes in root `AGENTS.md`.

## General

- **MUST** use TypeScript with strict typing (`tsconfig.json` per workspace). No `any` unless unavoidable with a documented reason.
- **MUST** use `bun` for all package scripts (`bun install`, `bun test`, `bun run ...`). Never npm/yarn/pnpm inside `server/` or `app/`.
- Names: `camelCase` functions/vars, `PascalCase` types/classes, `kebab-case` for filenames (derived from module purpose, e.g., `heartbeat-analytics.ts`).
- New reusable pure logic (app) MUST go in `app/src/lib/` with a co-located `*.test.ts`.

## Schema (server) — see `server/src/db/schema.ts`

- **MUST** use **text UUID primary keys**, never auto-increment integers.
- **MUST** store timestamps as ISO strings in `text` columns (default via `sql\`(datetime('now'))\``).
- **MUST** store JSON in TEXT columns and serialise with manual `JSON.stringify` / `JSON.parse` — no JSON column type reliance.
- **MUST** declare foreign keys with `text().references()`; indexes MUST be declared separately from table bodies (e.g. `index('idx_installation_last_heartbeat_at')`).
- **MUST** keep `server/schema.sql` (canonical for tests) in sync with `server/src/db/schema.ts` (dev DB) wherever a column/table is added or removed.
- Pending schema changes: use `bun run db:push` in dev; `bun run db:generate` + `db:migrate` for production; verify with `bunx drizzle-kit check`.

## API (server)

- **MUST** accept JSON requests; **MUST** keep `application/x-www-form-urlencoded` compatibility (legacy) — see `server/docs/FORM_ENCODING_SUPPORT.md`.
- **MUST** validate payloads with zod (`server/src/utils/validation.ts`); failures become the standard 400 envelope via `handleValidationError`.
- Error responses **MUST** use the shared envelopes from `server/src/utils/errors.ts` — do not invent ad-hoc error shapes.
- New endpoints **MUST** be registered in `server/src/index.ts` and get tests (see `docs/standards/testing.md`).
- Do not change response field names without updating the app's `+page.server.ts` fallbacks + `server/README.md` docs (DRY: update canonical doc once).

## Frontend (app)

- UI **MUST** use `wapar-*` design tokens from `app/tailwind.config.ts`; no ad-hoc colors/spacing.
- Reusable components **MUST** live in `app/src/lib/components/ui/` and be exported via its `index.ts`.
- Accessibility: **WCAG AA required** for every UI change (see `app/docs/ACCESSIBILITY*.md`).
- Data fetching MUST happen in `.server.ts` loaders, not in client components.

## Example — valid vs invalid schema snippet

```ts
// ✓ correct
export const installations = sqliteTable('Installation', {
  id: text('id').primaryKey(),
  appName: text('app_name').notNull(),
  lastHeartbeatAt: text('last_heartbeat_at'),
});
export const installationLastHeartbeatAtIdx = index('idx_installation_last_heartbeat_at')
  .on(installations.lastHeartbeatAt);

// ✗ avoid
export const installations = sqliteTable('Installation', {
  id: integer('id').primaryKey({ autoIncrement: true }), // no text UUID
  meta: json('meta'), // no JSON type; use text + manual stringify
});
```

## Related

- `docs/standards/testing.md`, `docs/standards/performance.md`, `docs/standards/security.md`.
- `docs/systems/server.md`, `docs/systems/app.md` for module maps.