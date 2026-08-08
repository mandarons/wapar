# WAPAR — Architecture Index

> **Start here** (humans and agents). This document orients you: what the system is, what the components are, and where to find everything else.

## Overview

WAPAR (Web Application Performance Analytics and Reporting) is an application analytics platform. Applications register themselves with an installation ID, send periodic **heartbeats**, and WAPAR classifies them as **active** or **stale** based on heartbeat recency (default threshold: 3 days, configurable via `ACTIVITY_THRESHOLD_DAYS`). It then exposes analytics: installation counts, version adoption, upgrade rates, engagement (DAU/WAU/MAU), and geographic distribution. The consumers today are the **iCloud Docker** and **HA Bouncie** applications (the former is a git submodule at `external/icloud-docker` that posts analytics into WAPAR).

The platform is intentionally simple and self-hostable: a Hono API over **local SQLite** (a `bun:sqlite` instance wrapped in a D1-compatible shim — this is NOT Cloudflare D1), plus a SvelteKit dashboard that fetches the API server-side. Deployment is Docker-based. See `docs/adr/0001-local-sqlite-not-cloudflare-d1.md` for why.

## Component Map

| Component | Responsibility | Source | Doc |
|---|---|---|---|
| `server/` | Ingestion API (`POST /api/installation`, `POST /api/heartbeat`) + analytics endpoints (`/api/usage`, `/api/installation-stats`, `/api/version-analytics`, `/api/heartbeat-analytics`, `/api/recent-installations`, `/api/new-installations`). Local SQLite via D1-compatible shim, Drizzle ORM, zod validation. | `server/src/` (entry: `src/index.ts` app, `src/local.ts` runner) | [docs/systems/server.md](./systems/server.md) |
| `app/` | SvelteKit dashboard: overview metrics, world map, version analytics, engagement, historical trends. Fetches WAPAR API + external HA analytics server-side. | `app/src/` (entry: `src/routes/+page.server.ts`) | [docs/systems/app.md](./systems/app.md) |
| `scripts/` | Legacy one-off PostgreSQL → D1 migration utility. | `scripts/migrate-to-d1.ts` | [docs/systems/scripts.md](./systems/scripts.md) |
| `external/icloud-docker` | Git submodule app that reports analytics into WAPAR. | submodule (read-only here) | — |

## Documentation Hierarchy

This repo uses a tiered documentation structure:

| Tier | Location | Loaded by OpenCode |
|---|---|---|
| 0 | `AGENTS.md` (root), `server/AGENTS.md`, `app/AGENTS.md` | Automatically (root always; nested on file access) |
| 1 | `docs/index.md` (this file) | Automatically via `opencode.json` `instructions` |
| 2 | `docs/systems/`, `docs/flows/`, `docs/architecture/`, `docs/standards/`, `docs/glossary.md`, `docs/adr/` | `docs/standards/*.md` + `docs/glossary.md` always; the rest on demand |
| 3 | Source code and tests | Ground truth — read directly |

### Systems

- [docs/systems/server.md](./systems/server.md) — API backend: routes, DB shim, schema, utils.
- [docs/systems/app.md](./systems/app.md) — SvelteKit dashboard: data loading, analytics libs, UI.
- [docs/systems/scripts.md](./systems/scripts.md) — migration tooling.

### Flows

- [docs/flows/installation-heartbeat.md](./flows/installation-heartbeat.md) — installation registration → heartbeat → active/stale classification → analytics.
- [docs/flows/dashboard-data-flow.md](./flows/dashboard-data-flow.md) — dashboard SSR fetch → analytics → charts/maps.

### Architecture

- [docs/architecture/README.md](./architecture/README.md) — layered design, deployment topology, cross-cutting concerns (logging, errors, config), diagram.

### Standards (RFC 2119)

- [docs/standards/coding.md](./standards/coding.md)
- [docs/standards/testing.md](./standards/testing.md)
- [docs/standards/performance.md](./standards/performance.md)
- [docs/standards/security.md](./standards/security.md)

### Glossary & ADRs

- [docs/glossary.md](./glossary.md)
- [docs/adr/0001-local-sqlite-not-cloudflare-d1.md](./adr/0001-local-sqlite-not-cloudflare-d1.md)
- [docs/adr/0002-bun-native-server-and-test-runner.md](./adr/0002-bun-native-server-and-test-runner.md)
- [docs/adr/0003-text-uuid-schema-conventions.md](./adr/0003-text-uuid-schema-conventions.md)

## Canonical Docs Elsewhere (DRY — link, don't duplicate)

- `server/docs/LOCAL_DEVELOPMENT.md` — local setup, SQLite configuration, troubleshooting.
- `server/docs/ACTIVE_INSTALLATIONS.md` — active/stale classification spec.
- `server/docs/FORM_ENCODING_SUPPORT.md` — JSON vs form-encoded request support.
- `server/docs/TEST_COVERAGE_REPORT.md` — coverage tooling details.
- `server/DOCKER.md` — Docker deployment.
- `app/docs/UX_GUIDELINES.md` — design system, tokens, component patterns.
- `app/docs/ACCESSIBILITY*.md` — WCAG AA implementation and testing.
- `app/docs/contrib/features/` — feature-specific docs (maps, analytics, trends).
- `docs/INTEGRATION_TESTING.md` — deployed-staging integration testing.
- `CONTRIBUTING.md` — contribution workflow and commit conventions.

## Working Notes for Agents

1. Always run the server test suite (`bun run test:coverage`) after touching `server/` source — the 100% line gate is enforced in CI.
2. Call `resetDb()` at the start of every server test (shared in-memory DB).
3. Never "fix" the `D1Database` type names — the local SQLite shim is intentional.
4. For frontend work, follow `app/docs/UX_GUIDELINES.md` and WCAG AA before writing UI.
5. Keep docs DRY: link to the canonical doc above instead of copying content.