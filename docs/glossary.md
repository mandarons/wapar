# WAPAR Glossary

Domain terms, acronyms, and project-specific vocabulary. Loaded into every OpenCode session via `opencode.json`.

| Term | Definition |
|---|---|
| **WAPAR** | Web Application Performance Analytics and Reporting — this platform. |
| **Installation** | A row in the `Installation` table: a registered app instance with `installationId` (UUID), `appName`, `appVersion`, `countryCode`, optional `previousId` (upgrade lineage). |
| **Heartbeat** | A `POST /api/heartbeat` event; updates `Installation.lastHeartbeatAt` and appends a `Heartbeat` row (max one per installation per day). |
| **Active installation** | Has `lastHeartbeatAt` within the activity threshold (`ACTIVITY_THRESHOLD_DAYS`, default 3). |
| **Stale installation** | No heartbeat, or heartbeat older than the threshold. |
| **Activity threshold** | Days of heartbeats counting as active; env `ACTIVITY_THRESHOLD_DAYS`. |
| **DAU / WAU / MAU** | Daily / weekly / monthly active users (unique installations with heartbeats in the period); served by `/api/heartbeat-analytics`. |
| **appName** | Identifier of the reporting app (e.g., `icloud-docker`, `ha-bouncie`). |
| **previousId** | UUID of the prior installation this one upgraded from (for upgrade-rate analysis). |
| **D1-compatible shim** | `server/src/local.ts` wrapping `bun:sqlite` so it exposes a `D1Database`-shaped interface (`server/src/types/database.ts`). **Not** Cloudflare D1. |
| **`db:push`** | Drizzle dev command: applies schema without migration files. |
| **`db:generate` / `db:migrate`** | Drizzle prod commands: create and apply migration files. |
| **resetDb()** | Test-utility call clearing shared in-memory DB between server tests; required at the start of every test. |
| **Coverage gate** | CI-enforced 100% line coverage for `server/` (config: `server/bunfig.toml`). |
| **SSR fetch** | Server-side data loading in `app/src/routes/+page.server.ts` (dashboard has no client-side `/api` calls). |
| **PUBLIC_API_URL** | App env var overriding the default API URL (`https://wapar-api.mandarons.com`). |
| **wapar-\* tokens** | Design tokens in `app/tailwind.config.ts`; must be used for all UI styling. |
| **svgMap / Chart.js** | Geographic map and chart libraries used in the dashboard. |
| **iCloud Docker / HA Bouncie** | The tracked apps reporting into WAPAR (`external/icloud-docker` is a submodule; HA Bouncie data comes from the Home Assistant analytics feed). |

## Related

- `docs/index.md` — architecture orientations.
- `server/docs/ACTIVE_INSTALLATIONS.md` — active/stale definitions in depth.