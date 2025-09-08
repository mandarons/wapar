import { describe, it, expect } from 'vitest';
import { d1Exec, d1QueryOne, getBase } from './utils';

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-000000000000';
}

describe('cron: enrich-ip', () => {
  it('enriches missing country_code and region for installations', async () => {
    // Seed 2 installations with distinct IPs and missing geo
    const id1 = uuid();
    const id2 = uuid();
    await d1Exec(
      `INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
       VALUES (?, 'icloud-drive-docker', '1.0.0', '1.1.1.1', datetime('now'), datetime('now'))`,
      [id1]
    );
    await d1Exec(
      `INSERT INTO Installation (id, app_name, app_version, ip_address, created_at, updated_at)
       VALUES (?, 'ha-bouncie', '2.0.0', '8.8.8.8', datetime('now'), datetime('now'))`,
      [id2]
    );

    const base = getBase();
    // Call the in-worker cron runner with a mocked batch response
    const res = await fetch(`${base}/__test/run-scheduled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch: [
          { query: '1.1.1.1', countryCode: 'US', region: 'CA' },
          { query: '8.8.8.8', countryCode: 'DE', region: 'BE' },
        ],
      }),
    });
    expect(res.ok).toBe(true);

    // Verify rows updated
    const r1 = await d1QueryOne<{ country_code: string; region: string }>(
      `SELECT country_code, region FROM Installation WHERE id = ?`,
      [id1]
    );
    const r2 = await d1QueryOne<{ country_code: string; region: string }>(
      `SELECT country_code, region FROM Installation WHERE id = ?`,
      [id2]
    );
    expect(r1?.country_code).toBe('US');
    expect(r1?.region).toBe('CA');
    expect(r2?.country_code).toBe('DE');
    expect(r2?.region).toBe('BE');
  });
});
