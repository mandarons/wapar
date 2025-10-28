import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { Logger } from '../utils/logger';

let migrationPromise: Promise<void> | null = null;
let migrationComplete = false;

/**
 * Run pending database migrations automatically on worker startup
 * This is idempotent - safe to run multiple times
 * Uses a singleton pattern to ensure migrations run only once per worker instance
 */
export async function ensureMigrations(db: D1Database): Promise<void> {
  // If migrations already completed in this worker instance, skip
  if (migrationComplete) {
    return;
  }

  // If migrations are in progress, wait for them
  if (migrationPromise) {
    return migrationPromise;
  }

  // Start migrations
  migrationPromise = (async () => {
    try {
      Logger.info('Starting database migrations', {
        operation: 'migrations.start',
        metadata: {}
      });

      const drizzleDb = drizzle(db);
      
      // Drizzle tracks applied migrations in __drizzle_migrations table
      // This ensures each migration runs only once across all deployments
      await migrate(drizzleDb, { migrationsFolder: './drizzle' });

      migrationComplete = true;

      Logger.info('Database migrations completed successfully', {
        operation: 'migrations.complete',
        metadata: {}
      });
    } catch (error) {
      Logger.error('Database migration failed', {
        operation: 'migrations.error',
        error: error as Error,
        metadata: {}
      });
      // Reset so next request can retry
      migrationPromise = null;
      throw error;
    }
  })();

  return migrationPromise;
}

