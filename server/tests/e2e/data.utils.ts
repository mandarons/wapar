import { faker } from '@faker-js/faker';
import { unstable_dev, type Unstable_DevWorker } from 'wrangler';

export interface IInstallationRecordAttributes {
  appName: string;
  appVersion: string;
  ipAddress: string;
  countryCode?: string;
  region?: string;
}

export interface IHeartbeatRecordAttributes {
  installationId: string;
  data?: object | null;
}

let worker: Unstable_DevWorker;

const appsList = ['icloud-drive-docker', 'icloud-docker', 'ha-bouncie'] as const;

const randomAppName = () => faker.helpers.arrayElement(appsList);
const randomAppVersion = () => `${faker.number.int({ min: 1, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}`;

const createInstallationRecord = (appName = randomAppName()): IInstallationRecordAttributes => {
  return {
    appName,
    appVersion: randomAppVersion(),
    ipAddress: faker.internet.ipv4(),
  };
};

const createInstallationRecordWithGeo = (appName = randomAppName()): IInstallationRecordAttributes => {
  return {
    ...createInstallationRecord(appName),
    countryCode: faker.location.countryCode(),
    region: faker.location.state({ abbreviated: true }),
  };
};

const createHeartbeatRecord = (installationId: string, data: object | null = null): IHeartbeatRecordAttributes => {
  return {
    installationId,
    data,
  };
};

function getBase(): string {
  const anyWorker = worker as any;
  if (typeof anyWorker?.port === 'number' && anyWorker.port > 0) {
    return `http://127.0.0.1:${anyWorker.port}`;
  }
  const addr = anyWorker?.address as string | undefined;
  if (addr) {
    if (/^https?:\/\//i.test(addr)) return addr;
    if (/^[^\/]+:\d+$/.test(addr)) return `http://${addr}`;
  }
  throw new Error('Worker is not ready (no address/port)');
}

const syncDb = async (sync = true) => {
  if (sync) {
    // Drop and recreate tables for fresh test run
    try {
      await d1Exec(`DROP TABLE IF EXISTS Heartbeat`);
      await d1Exec(`DROP TABLE IF EXISTS Installation`);
    } catch (error) {
      // Ignore errors if tables don't exist
    }
    
    // Create tables for fresh test run
    await d1Exec(`CREATE TABLE IF NOT EXISTS Installation (
      id TEXT PRIMARY KEY,
      app_name TEXT NOT NULL,
      app_version TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      previous_id TEXT,
      data TEXT,
      country_code TEXT,
      region TEXT,
      last_heartbeat_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    
    await d1Exec(`CREATE INDEX IF NOT EXISTS idx_installation_app_name ON Installation(app_name)`);
    await d1Exec(`CREATE INDEX IF NOT EXISTS idx_installation_country_code ON Installation(country_code)`);
    await d1Exec(`CREATE INDEX IF NOT EXISTS idx_installation_last_heartbeat_at ON Installation(last_heartbeat_at)`);
    
    await d1Exec(`CREATE TABLE IF NOT EXISTS Heartbeat (
      id TEXT PRIMARY KEY,
      installation_id TEXT NOT NULL,
      data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (installation_id) REFERENCES Installation(id)
    )`);
    
    await d1Exec(`CREATE INDEX IF NOT EXISTS idx_heartbeat_installation_id ON Heartbeat(installation_id)`);
    await d1Exec(`CREATE INDEX IF NOT EXISTS idx_heartbeat_created_at ON Heartbeat(created_at)`);
    return;
  }
  
  // Clean up tables - use DELETE instead of DROP to avoid schema issues
  try {
    await d1Exec(`DELETE FROM Heartbeat`);
    await d1Exec(`DELETE FROM Installation`);
  } catch (error) {
    // If DELETE fails, try DROP and recreate
    try {
      await d1Exec(`DROP TABLE IF EXISTS Heartbeat`);
      await d1Exec(`DROP TABLE IF EXISTS Installation`);
    } catch (dropError) {
      // Ignore errors
    }
  }
};

const createServer = async () => {
  if (!worker) {
    worker = await unstable_dev('src/index.ts', {
      config: 'wrangler.toml',
      ip: '127.0.0.1',
      port: 0,
      experimental: { disableExperimentalWarning: true }
    });
    // @ts-ignore - ready is available on UnstableDevWorker in wrangler v4
    await (worker as any).ready;
    
    // Initialize database schema
    await syncDb(true);
  }
  return getBase();
};

async function d1Exec(sql: string, params: unknown[] = []): Promise<void> {
  const base = getBase();
  const response = await fetch(`${base}/api`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Test-SQL': 'exec'
    },
    body: JSON.stringify({ sql, params }),
  });
  
  if (!response.ok) {
    throw new Error(`d1Exec failed: ${response.status}`);
  }
}

const fakeIPInfoPost = (url: string, data: any) =>
  new Promise((resolve) => resolve({ 
    data: (data as string[]).map((e: string) => ({ 
      query: e, 
      countryCode: faker.location.countryCode(), 
      region: faker.location.state() 
    })) 
  }));

const stopWorker = async () => {
  if (worker) {
    await worker.stop();
    worker = null as any;
  }
};

export default {
  fakeIPInfoPost,
  appsList,
  randomAppName,
  randomAppVersion,
  createInstallationRecord,
  createInstallationRecordWithGeo,
  createHeartbeatRecord,
  syncDb,
  createServer,
  stopWorker,
};
