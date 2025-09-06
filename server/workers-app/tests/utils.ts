import { beforeAll, afterAll } from 'vitest';
import { unstable_dev, type Unstable_DevWorker } from 'wrangler';

export let worker: Unstable_DevWorker;

function getRunnerUA(): string {
  return process.env.npm_config_user_agent || '';
}

export function getBase(): string {
  const anyWorker = worker as any;
  // Prefer the port when available; construct a proper http URL
  if (typeof anyWorker?.port === 'number' && anyWorker.port > 0) {
    return `http://127.0.0.1:${anyWorker.port}`;
  }
  // Fallback to address if it exists and already includes a scheme
  const addr = anyWorker?.address as string | undefined;
  if (addr) {
    if (/^https?:\/\//i.test(addr)) return addr;
    // If it's host:port, prefix http://
    if (/^[^\/]+:\d+$/.test(addr)) return `http://${addr}`;
  }
  throw new Error('Worker is not ready (no address/port)');
}

export async function resetDb() {
  const base = getBase();
  const res = await fetch(`${base}/__test/reset`, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`resetDb failed: ${res.status} ${text}`);
  }
  try {
    const body = await res.json() as any;
    if (!body?.ok) throw new Error(`resetDb returned ok=false: ${JSON.stringify(body)}`);
  } catch (e) {
    // If response is not JSON or ok=false, throw
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export async function d1Exec(sql: string, params: unknown[] = []): Promise<void> {
  const base = getBase();
  const res = await fetch(`${base}/__test/exec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`d1Exec failed: ${res.status} ${text}`);
  }
  try {
    const body = await res.json() as any;
    if (!body?.ok) throw new Error(`d1Exec returned ok=false: ${JSON.stringify(body)}`);
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export async function d1QueryOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
  const base = getBase();
  const res = await fetch(`${base}/__test/queryOne`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`d1QueryOne failed: ${res.status} ${text}`);
  }
  try {
    const body = await res.json() as any;
    if (!body?.ok) throw new Error(`d1QueryOne returned ok=false: ${JSON.stringify(body)}`);
    return body.data;
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export async function waitForCount(sqlCountQuery: string, expected: number, timeoutMs = 8000, intervalMs = 100): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const row = await d1QueryOne<{ count: number }>(sqlCountQuery);
    const count = Number(row?.count ?? 0);
    if (count === expected) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout waiting for count=${expected} for query: ${sqlCountQuery}`);
}

beforeAll(async () => {
  worker = await unstable_dev('src/index.ts', {
    config: 'wrangler.toml',
    ip: '127.0.0.1',
    port: 0, // random available port
    experimental: { disableExperimentalWarning: true }
  });
  // Ensure the dev server is fully ready before tests run
  // @ts-ignore - ready is available on UnstableDevWorker in wrangler v4
  await (worker as any).ready;
});

afterAll(async () => {
  await worker?.stop();
});
