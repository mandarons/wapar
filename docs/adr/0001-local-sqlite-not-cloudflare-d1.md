# ADR 0001 — Local SQLite (not Cloudflare D1)

**Status:** Accepted · **Date:** (established, applies to current codebase)

## Context

The platform was originally designed for Cloudflare Workers + D1. Type names (`D1Database`), schema tooling, and docs all referenced D1. Operators need a self-hostable deployment (Docker, single VM) without Cloudflare accounts, and the app layer must stay portable between them.

## Decision

Run the server on **local SQLite** (`bun:sqlite`) wrapped by `server/src/local.ts` as a **D1-compatible shim** exposing a `D1Database`-shaped interface (`server/src/types/database.ts`). Keep `D1Database` type names as-is — the shim is intentional, and renaming to "real D1" types would break the compatibility layer.

- Dev DB: `server/local.db` (or `DB_PATH`); tests: in-memory; Docker: `/data/local.db` volume.
- Production deployments are Docker-based, not Workers.

## Consequences

- **Pros:** full local dev (`./run.sh`), simple ops (one SQLite file), no cloud dependency, WAL-pragmas tuned for performance.
- **Cons:** not horizontally scalable (single writer file); D1-specific features unavailable; some CI/docs still reference legacy Workers paths (historical noise). README/D1 references must not be treated as live spec — see `docs/index.md` for canonical architecture.