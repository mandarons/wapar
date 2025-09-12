import { getDb } from '../db/client';
import { installations } from '../db/schema';
import { eq, isNull } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const scheduled: ExportedHandlerScheduledHandler = async (event, env) => {
  const jobContext = {
    operation: 'ip_enrichment.scheduled',
    metadata: { 
      cron: event.cron,
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      isTestMode: !!(env as any).__TEST_BATCH_DATA
    }
  };

  Logger.info('IP enrichment job started', jobContext);

  try {
    const missing = await Logger.measureOperation(
      'ip_enrichment.fetch_missing',
      () => getDb(env as any).select({ id: installations.id, ip_address: installations.ipAddress })
        .from(installations)
        .where(isNull(installations.countryCode))
        .limit(100),
      jobContext
    );

    if (missing.length === 0) {
      Logger.info('No installations need IP enrichment', {
        ...jobContext,
        metadata: { ...jobContext.metadata, recordsFound: 0 }
      });
      return;
    }

    const ips = [...new Set(missing.map((m) => m.ip_address).filter(Boolean))];
    if (ips.length === 0) {
      Logger.warning('Found installations without country data but no valid IP addresses', {
        ...jobContext,
        metadata: { 
          ...jobContext.metadata, 
          recordsFound: missing.length,
          validIPs: 0
        }
      });
      return;
    }

    let data: Array<{ query: string; countryCode: string; region: string }>;
    
    // Check if we have test batch data
    const testBatchData = (env as any).__TEST_BATCH_DATA;
    if (testBatchData) {
      // Use mock data for testing
      data = testBatchData;
      Logger.info('Using test batch data for IP enrichment', {
        ...jobContext,
        metadata: { 
          ...jobContext.metadata,
          testRecords: testBatchData.length
        }
      });
    } else {
      // Make real API call for production
      data = await Logger.measureOperation(
        'ip_enrichment.api_call',
        async () => {
          const res = await fetch('http://ip-api.com/batch?fields=countryCode,region,query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ips),
          });
          
          if (!res.ok) {
            throw new Error(`IP API returned ${res.status}: ${res.statusText}`);
          }
          
          return await res.json() as Array<{ query: string; countryCode: string; region: string }>;
        },
        {
          ...jobContext,
          metadata: { 
            ...jobContext.metadata,
            ipCount: ips.length,
            apiEndpoint: 'ip-api.com/batch'
          }
        }
      );
    }

    const map = new Map(data.map((d) => [d.query, { countryCode: d.countryCode, region: d.region }]));
    let updatedCount = 0;
    let failedCount = 0;

    for (const row of missing) {
      const info = map.get(row.ip_address);
      if (!info) {
        failedCount++;
        continue;
      }
      
      try {
        await Logger.measureOperation(
          'ip_enrichment.update_record',
          () => getDb(env as any).update(installations)
            .set({
              countryCode: info.countryCode,
              region: info.region,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(installations.id, row.id)),
          {
            ...jobContext,
            metadata: { 
              installationId: row.id,
              ipAddress: row.ip_address,
              countryCode: info.countryCode,
              region: info.region
            }
          }
        );
        updatedCount++;
      } catch (error) {
        failedCount++;
        Logger.error('Failed to update installation with geo data', {
          ...jobContext,
          error: error as Error,
          metadata: {
            installationId: row.id,
            ipAddress: row.ip_address
          }
        });
      }
    }

    if (failedCount > 0) {
      Logger.warning('IP enrichment completed with some failures', {
        ...jobContext,
        metadata: {
          ...jobContext.metadata,
          totalRecords: missing.length,
          uniqueIPs: ips.length,
          updatedCount,
          failedCount,
          successRate: `${Math.round((updatedCount / missing.length) * 100)}%`
        }
      });
    } else {
      Logger.success('IP enrichment completed successfully', {
        ...jobContext,
        metadata: {
          totalRecords: missing.length,
          uniqueIPs: ips.length,
          updatedCount
        }
      });
    }

  } catch (error) {
    Logger.error('IP enrichment job failed', {
      ...jobContext,
      error: error as Error
    });
    throw error; // Re-throw to ensure Cloudflare marks the job as failed
  }
};
