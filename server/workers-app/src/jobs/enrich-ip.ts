import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { eq, isNull } from 'drizzle-orm';

export const scheduled: ExportedHandlerScheduledHandler = async (event, env) => {
  const missing = await getDb(env as any).select({ id: installations.id, ip_address: installations.ipAddress })
    .from(installations)
    .where(isNull(installations.countryCode))
    .limit(100);
  if (missing.length === 0) return;

  const ips = [...new Set(missing.map((m) => m.ip_address).filter(Boolean))];
  if (ips.length === 0) return;

  let data: Array<{ query: string; countryCode: string; region: string }>;
  
  // Check if we have test batch data
  const testBatchData = (env as any).__TEST_BATCH_DATA;
  if (testBatchData) {
    // Use mock data for testing
    data = testBatchData;
  } else {
    // Make real API call for production
    const res = await fetch('http://ip-api.com/batch?fields=countryCode,region,query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ips),
    });
    if (!res.ok) return;
    data = await res.json() as Array<{ query: string; countryCode: string; region: string }>;
  }

  const map = new Map(data.map((d) => [d.query, { countryCode: d.countryCode, region: d.region }]));

  for (const row of missing) {
    const info = map.get(row.ip_address);
    if (!info) continue;
    await getDb(env as any).update(installations)
      .set({
        countryCode: info.countryCode,
        region: info.region,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(installations.id, row.id));
  }
};
