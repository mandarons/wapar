import { queryAll, execute } from '../db/client';

export const scheduled: ExportedHandlerScheduledHandler = async (event, env) => {
  const missing = await queryAll<{ id: string; ip_address: string }>(
    env as any,
    'SELECT id, ip_address FROM Installation WHERE country_code IS NULL LIMIT 100'
  );
  if (missing.length === 0) return;

  const ips = [...new Set(missing.map((m) => m.ip_address).filter(Boolean))];
  if (ips.length === 0) return;

  const res = await fetch('http://ip-api.com/batch?fields=countryCode,region,query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ips),
  });
  if (!res.ok) return;
  const data = await res.json() as Array<{ query: string; countryCode: string; region: string }>;

  const map = new Map(data.map((d) => [d.query, { countryCode: d.countryCode, region: d.region }]));

  for (const row of missing) {
    const info = map.get(row.ip_address);
    if (!info) continue;
    await execute(
      env as any,
      'UPDATE Installation SET country_code = ?, region = ?, updated_at = ? WHERE id = ?',
      info.countryCode,
      info.region,
      new Date().toISOString(),
      row.id,
    );
  }
};
