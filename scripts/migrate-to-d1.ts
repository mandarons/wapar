#!/usr/bin/env ts-node

import { Client } from 'pg';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface PostgreSQLInstallation {
  id: string;
  app_name: string;
  app_version: string;
  ip_address: string;
  previous_id: string | null;
  data: object | null;
  country_code: string | null;
  region: string | null;
  created_at: Date;
  updated_at: Date;
}

interface PostgreSQLHeartbeat {
  id: string;
  installation_id: string;
  data: object | null;
  created_at: Date;
  updated_at: Date;
}

interface D1Installation {
  id: string;
  app_name: string;
  app_version: string;
  ip_address: string;
  previous_id: string | null;
  data: string | null;
  country_code: string | null;
  region: string | null;
  created_at: string;
  updated_at: string;
}

interface D1Heartbeat {
  id: string;
  installation_id: string;
  data: string | null;
  created_at: string;
  updated_at: string;
}

interface D1Status {
  installationLatest: string | null;
  heartbeatLatest: string | null;
  installationCount: number;
  heartbeatCount: number;
}

interface SyncOptions {
  batchSize: number;
  dryRun: boolean;
  resetSync: boolean;
  remote: boolean;
}

class DatabaseMigrator {
  private pgClient: Client;
  private workersAppPath: string;
  private options: SyncOptions;
  private d1Status?: D1Status;
  private tempQueryFile: string;

  constructor(options: SyncOptions = { batchSize: 10000, dryRun: false, resetSync: false, remote: false }) {
    // PostgreSQL connection configuration
    this.pgClient = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'wapardev',
      user: process.env.POSTGRES_USER || 'waparuser',
      password: process.env.POSTGRES_PASSWORD || 'wapar-user',
    });

    this.workersAppPath = path.join(__dirname, '../server');
    this.options = options;
    this.tempQueryFile = path.join(this.workersAppPath, 'temp-query.sql');
  }

  async connect(): Promise<void> {
    try {
      await this.pgClient.connect();
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pgClient.end();
    console.log('✅ Disconnected from PostgreSQL database');
  }

  private formatDateForSQLite(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }

  private convertInstallationToD1(pgInstallation: PostgreSQLInstallation): D1Installation {
    return {
      id: pgInstallation.id,
      app_name: pgInstallation.app_name,
      app_version: pgInstallation.app_version,
      ip_address: pgInstallation.ip_address,
      previous_id: pgInstallation.previous_id,
      data: pgInstallation.data ? JSON.stringify(pgInstallation.data) : null,
      country_code: pgInstallation.country_code,
      region: pgInstallation.region,
      created_at: this.formatDateForSQLite(pgInstallation.created_at),
      updated_at: this.formatDateForSQLite(pgInstallation.updated_at),
    };
  }

  private convertHeartbeatToD1(pgHeartbeat: PostgreSQLHeartbeat): D1Heartbeat {
    return {
      id: pgHeartbeat.id,
      installation_id: pgHeartbeat.installation_id,
      data: pgHeartbeat.data ? JSON.stringify(pgHeartbeat.data) : null,
      created_at: this.formatDateForSQLite(pgHeartbeat.created_at),
      updated_at: this.formatDateForSQLite(pgHeartbeat.updated_at),
    };
  }

  private async executeD1Query(query: string): Promise<string> {
    try {
      process.chdir(this.workersAppPath);
      
      fs.writeFileSync(this.tempQueryFile, query);
      
      const command = this.options.remote ? 'bunx wrangler d1 execute wapar-db --file=temp-query.sql' : 'bunx wrangler d1 execute wapar-db --file=temp-query.sql --local';
      const result = execSync(command, { encoding: 'utf8' });
      
      fs.unlinkSync(this.tempQueryFile);
      
      return result;
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(this.tempQueryFile)) {
        fs.unlinkSync(this.tempQueryFile);
      }
      throw error;
    }
  }

  private parseD1QueryResult(result: string): string[] {
    const lines = result.split('\n').filter(line => line.trim());
    return lines.filter(line => !line.includes('│') && !line.includes('─') && line.trim());
  }

  async getBatchD1Status(): Promise<D1Status> {
    try {
      const query = `
        SELECT 
          (SELECT MAX(created_at) FROM Installation) as installation_latest,
          (SELECT MAX(created_at) FROM Heartbeat) as heartbeat_latest,
          (SELECT COUNT(*) FROM Installation) as installation_count,
          (SELECT COUNT(*) FROM Heartbeat) as heartbeat_count;
      `;
      
      const result = await this.executeD1Query(query);
      const dataLines = this.parseD1QueryResult(result);
      
      if (dataLines.length > 0) {
        const data = dataLines[0].split('|').map(s => s.trim());
        if (data.length >= 4) {
          return {
            installationLatest: data[0] === 'NULL' || data[0] === '' ? null : data[0],
            heartbeatLatest: data[1] === 'NULL' || data[1] === '' ? null : data[1],
            installationCount: parseInt(data[2]) || 0,
            heartbeatCount: parseInt(data[3]) || 0
          };
        }
      }
      
      // Default values if query fails or returns no data
      return {
        installationLatest: null,
        heartbeatLatest: null,
        installationCount: 0,
        heartbeatCount: 0
      };
    } catch (error) {
      console.log('📊 No existing D1 data found, starting from beginning');
      return {
        installationLatest: null,
        heartbeatLatest: null,
        installationCount: 0,
        heartbeatCount: 0
      };
    }
  }

  async getD1Status(forceRefresh: boolean = false): Promise<D1Status> {
    if (!this.d1Status || forceRefresh) {
      this.d1Status = await this.getBatchD1Status();
    }
    return this.d1Status;
  }

  async clearD1Table(tableName: string): Promise<void> {
    if (!this.options.resetSync) {
      return;
    }
    
    try {
      // Clear tables in correct order to avoid foreign key constraint issues
      if (tableName === 'Installation') {
        // First clear Heartbeat table (child), then Installation table (parent)
        const query = `
          PRAGMA foreign_keys = OFF;
          DELETE FROM Heartbeat;
          DELETE FROM Installation;
          PRAGMA foreign_keys = ON;
        `;
        await this.executeD1Query(query);
        console.log(`🔄 Cleared all records from D1 Heartbeat and Installation tables`);
      } else if (tableName === 'Heartbeat') {
        // Only clear Heartbeat if Installation hasn't been cleared yet
        const query = `DELETE FROM ${tableName};`;
        await this.executeD1Query(query);
        console.log(`🔄 Cleared all records from D1 ${tableName} table`);
      }
      
      // Invalidate cache after clearing
      this.d1Status = undefined;
    } catch (error) {
      console.error(`❌ Failed to clear D1 ${tableName} table:`, error);
      throw error;
    }
  }

  async extractInstallationsBatch(afterTimestamp: string | null, batchSize: number): Promise<D1Installation[]> {
    console.log(`📊 Extracting installations batch (limit: ${batchSize})...`);
    
    let whereClause = 'WHERE deleted_at IS NULL';
    if (afterTimestamp) {
      whereClause += ` AND created_at > '${afterTimestamp}'`;
    }
    
    const query = `
      SELECT id, app_name, app_version, ip_address, previous_id, data, 
             country_code, region, created_at, updated_at
      FROM "Installation"
      ${whereClause}
      ORDER BY created_at ASC
      LIMIT ${batchSize}
    `;

    try {
      const result = await this.pgClient.query<PostgreSQLInstallation>(query);
      const d1Installations = result.rows.map(row => this.convertInstallationToD1(row));
      
      console.log(`✅ Extracted ${d1Installations.length} installations`);
      return d1Installations;
    } catch (error) {
      console.error('❌ Failed to extract installations:', error);
      throw error;
    }
  }

  async extractHeartbeatsBatch(afterTimestamp: string | null, batchSize: number): Promise<D1Heartbeat[]> {
    console.log(`💓 Extracting heartbeats batch (limit: ${batchSize})...`);
    
    let whereClause = 'WHERE deleted_at IS NULL';
    if (afterTimestamp) {
      whereClause += ` AND created_at > '${afterTimestamp}'`;
    }
    
    const query = `
      SELECT id, installation_id, data, created_at, updated_at
      FROM "Heartbeat"
      ${whereClause}
      ORDER BY created_at ASC
      LIMIT ${batchSize}
    `;

    try {
      const result = await this.pgClient.query<PostgreSQLHeartbeat>(query);
      const d1Heartbeats = result.rows.map(row => this.convertHeartbeatToD1(row));
      
      console.log(`✅ Extracted ${d1Heartbeats.length} heartbeats`);
      return d1Heartbeats;
    } catch (error) {
      console.error('❌ Failed to extract heartbeats:', error);
      throw error;
    }
  }

  async getTotalRecordCount(tableName: string, afterTimestamp: string | null): Promise<number> {
    let whereClause = 'WHERE deleted_at IS NULL';
    if (afterTimestamp) {
      whereClause += ` AND created_at > '${afterTimestamp}'`;
    }
    
    const query = `SELECT COUNT(*) as count FROM "${tableName}" ${whereClause}`;
    
    try {
      const result = await this.pgClient.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error(`❌ Failed to get total count for ${tableName}:`, error);
      return 0;
    }
  }

  private generateD1InsertSQL(installations: D1Installation[], heartbeats: D1Heartbeat[]): string {
    let sql = '-- Incremental migration data from PostgreSQL to D1\n\n';

    // Insert installations in chronological order
    if (installations.length > 0) {
      sql += '-- Insert installations (chronological order)\n';
      for (const installation of installations) {
        const values = [
          `'${installation.id}'`,
          `'${installation.app_name.replace(/'/g, "''")}'`,
          `'${installation.app_version.replace(/'/g, "''")}'`,
          `'${installation.ip_address}'`,
          installation.previous_id ? `'${installation.previous_id}'` : 'NULL',
          installation.data ? `'${installation.data.replace(/'/g, "''")}'` : 'NULL',
          installation.country_code ? `'${installation.country_code}'` : 'NULL',
          installation.region ? `'${installation.region.replace(/'/g, "''")}'` : 'NULL',
          `'${installation.created_at}'`,
          `'${installation.updated_at}'`
        ];

        sql += `INSERT OR IGNORE INTO Installation (id, app_name, app_version, ip_address, previous_id, data, country_code, region, created_at, updated_at) VALUES (${values.join(', ')});\n`;
      }
      sql += '\n';
    }

    // Insert heartbeats in chronological order
    if (heartbeats.length > 0) {
      sql += '-- Insert heartbeats (chronological order)\n';
      for (const heartbeat of heartbeats) {
        const values = [
          `'${heartbeat.id}'`,
          `'${heartbeat.installation_id}'`,
          heartbeat.data ? `'${heartbeat.data.replace(/'/g, "''")}'` : 'NULL',
          `'${heartbeat.created_at}'`,
          `'${heartbeat.updated_at}'`
        ];

        sql += `INSERT OR IGNORE INTO Heartbeat (id, installation_id, data, created_at, updated_at) VALUES (${values.join(', ')});\n`;
      }
    }

    return sql;
  }

  async syncTableBatch(tableName: string): Promise<{ synced: number; completed: boolean }> {
    console.log(`\n🔄 Starting incremental sync for ${tableName}...`);
    
    // Early exit: Check PostgreSQL first to avoid unnecessary D1 queries
    const totalPgRecords = await this.getTotalRecordCount(tableName, null);
    if (totalPgRecords === 0) {
      console.log(`✅ ${tableName} sync completed. No PostgreSQL records found.`);
      return { synced: 0, completed: true };
    }
    
    // Clear tables if reset is requested (only do this once for Installation)
    if (this.options.resetSync && tableName === 'Installation') {
      await this.clearD1Table(tableName);
    }
    
    // Get D1 status (cached after first call)
    const d1Status = await this.getD1Status();
    const latestTimestamp = tableName === 'Installation' ? d1Status.installationLatest : d1Status.heartbeatLatest;
    const currentD1Count = tableName === 'Installation' ? d1Status.installationCount : d1Status.heartbeatCount;
    
    console.log(`📊 Latest ${tableName} timestamp in D1: ${latestTimestamp || 'None (starting from beginning)'}`);
    console.log(`📊 Current D1 ${tableName} count: ${currentD1Count}`);
    
    // Get remaining record count from PostgreSQL
    const remainingCount = await this.getTotalRecordCount(tableName, latestTimestamp);
    console.log(`📊 Remaining ${tableName} records to sync: ${remainingCount}`);
    
    if (remainingCount === 0) {
      console.log(`✅ ${tableName} sync completed. No more records to sync.`);
      return { synced: 0, completed: true };
    }
    
    // Extract batch of records newer than the latest D1 timestamp
    let records: (D1Installation | D1Heartbeat)[] = [];
    if (tableName === 'Installation') {
      records = await this.extractInstallationsBatch(latestTimestamp, this.options.batchSize);
    } else if (tableName === 'Heartbeat') {
      records = await this.extractHeartbeatsBatch(latestTimestamp, this.options.batchSize);
    }
    
    if (records.length === 0) {
      console.log(`✅ ${tableName} sync completed. No more records found.`);
      return { synced: 0, completed: true };
    }
    
    if (this.options.dryRun) {
      console.log(`🔍 DRY RUN: Would sync ${records.length} ${tableName} records`);
      const oldestRecord = records[0];
      const newestRecord = records[records.length - 1];
      console.log(`📅 Date range: ${oldestRecord.created_at} to ${newestRecord.created_at}`);
      return { synced: records.length, completed: records.length < this.options.batchSize };
    }
    
    // Insert records into D1 (they're already in chronological order)
    await this.insertBatchToD1(
      tableName === 'Installation' ? records as D1Installation[] : [],
      tableName === 'Heartbeat' ? records as D1Heartbeat[] : []
    );
    
    // Invalidate cache after successful insert
    this.d1Status = undefined;
    
    const isCompleted = records.length < this.options.batchSize;
    const oldestRecord = records[0];
    const newestRecord = records[records.length - 1];
    
    console.log(`✅ Synced ${records.length} ${tableName} records`);
    console.log(`📅 Date range: ${oldestRecord.created_at} to ${newestRecord.created_at}`);
    
    return { synced: records.length, completed: isCompleted };
  }

  async insertBatchToD1(installations: D1Installation[], heartbeats: D1Heartbeat[]): Promise<void> {
    if (installations.length === 0 && heartbeats.length === 0) {
      return;
    }
    
    console.log('🚀 Inserting batch to D1 database...');

    // Generate SQL file
    const sqlContent = this.generateD1InsertSQL(installations, heartbeats);
    const sqlFilePath = path.join(this.workersAppPath, 'migration-batch.sql');
    
    fs.writeFileSync(sqlFilePath, sqlContent);

    try {
      // Change to workers-app directory
      process.chdir(this.workersAppPath);

      // Execute the SQL file using wrangler d1 execute with dynamic remote flag
      const command = this.options.remote 
        ? `bunx wrangler d1 execute wapar-db --file=migration-batch.sql --remote` 
        : `bunx wrangler d1 execute wapar-db --file=migration-batch.sql --local`;
      
      execSync(command, { stdio: 'inherit' });

      // Clean up the temporary SQL file
      fs.unlinkSync(sqlFilePath);

    } catch (error) {
      console.error('❌ Failed to insert batch to D1 database:', error);
      throw error;
    }
  }

  async verifySync(initialStatus?: D1Status, pgCounts?: { installations: number; heartbeats: number }): Promise<void> {
    console.log('\n🔍 Verifying sync status...');

    try {
      // Use provided initial status or get fresh status
      const currentStatus = initialStatus || await this.getD1Status(true);
      
      let pgInstallationCount: number;
      let pgHeartbeatCount: number;
      
      if (pgCounts) {
        // Use provided PostgreSQL counts
        pgInstallationCount = pgCounts.installations;
        pgHeartbeatCount = pgCounts.heartbeats;
      } else {
        // Get PostgreSQL counts (only if client is still connected)
        pgInstallationCount = await this.getTotalRecordCount('Installation', null);
        pgHeartbeatCount = await this.getTotalRecordCount('Heartbeat', null);
      }

      console.log('📊 Sync Status Summary:');
      console.log(`   Installations: ${currentStatus.installationCount}/${pgInstallationCount} synced (${((currentStatus.installationCount/pgInstallationCount)*100).toFixed(1)}%)`);
      console.log(`   Heartbeats: ${currentStatus.heartbeatCount}/${pgHeartbeatCount} synced (${((currentStatus.heartbeatCount/pgHeartbeatCount)*100).toFixed(1)}%)`);
      
      if (currentStatus.installationCount === pgInstallationCount && currentStatus.heartbeatCount === pgHeartbeatCount) {
        console.log('✅ All records are fully synced!');
      } else {
        const remainingInstallations = pgInstallationCount - currentStatus.installationCount;
        const remainingHeartbeats = pgHeartbeatCount - currentStatus.heartbeatCount;
        console.log(`⏳ Remaining to sync: ${remainingInstallations} installations, ${remainingHeartbeats} heartbeats`);
      }

    } catch (error) {
      console.error('❌ Failed to verify sync:', error);
      throw error;
    }
  }

  async incrementalSync(): Promise<void> {
    console.log('🚀 Starting incremental database sync from PostgreSQL to D1...\n');
    console.log(`⚙️  Batch size: ${this.options.batchSize}`);
    console.log(`🔍 Dry run: ${this.options.dryRun}`);
    console.log(`🔄 Reset sync: ${this.options.resetSync}`);
    console.log(`🌐 Remote execution: ${this.options.remote}\n`);

    try {
      // Connect to PostgreSQL
      await this.connect();

      // Get initial D1 status once (cached for subsequent calls)
      const initialStatus = await this.getD1Status();
      
      let totalSynced = 0;
      
      // Sync installations
      const installationResult = await this.syncTableBatch('Installation');
      totalSynced += installationResult.synced;
      
      // Sync heartbeats
      const heartbeatResult = await this.syncTableBatch('Heartbeat');
      totalSynced += heartbeatResult.synced;

      // Get PostgreSQL counts before disconnecting
      const pgInstallationCount = await this.getTotalRecordCount('Installation', null);
      const pgHeartbeatCount = await this.getTotalRecordCount('Heartbeat', null);

      // Disconnect from PostgreSQL
      await this.disconnect();

      // Only verify if records were actually synced or if not in dry-run mode
      if (!this.options.dryRun && totalSynced > 0) {
        await this.verifySync(undefined, { installations: pgInstallationCount, heartbeats: pgHeartbeatCount });
      } else if (!this.options.dryRun && totalSynced === 0) {
        // Use initial status for verification to avoid extra D1 query
        await this.verifySync(initialStatus, { installations: pgInstallationCount, heartbeats: pgHeartbeatCount });
      }

      console.log('\n🎉 Incremental sync completed!');
      console.log(`📊 Total records synced in this run: ${totalSynced}`);
      
      if (installationResult.completed && heartbeatResult.completed) {
        console.log('✅ All tables are fully synced!');
      } else {
        console.log('⏳ Some tables have more records to sync. Run the script again to continue.');
      }

    } catch (error) {
      console.error('\n💥 Incremental sync failed:', error);
      process.exit(1);
    }
  }

  // Legacy method for backward compatibility
  async migrate(): Promise<void> {
    console.log('⚠️  Using legacy full migration mode. Consider using incremental sync instead.');
    
    console.log('🚀 Starting database migration from PostgreSQL to D1...\n');

    try {
      // Connect to PostgreSQL
      await this.connect();

      // Extract all data (legacy behavior)
      const installations = await this.extractInstallationsBatch(null, 1000000); // Large batch for full migration
      const heartbeats = await this.extractHeartbeatsBatch(null, 1000000);

      // Disconnect from PostgreSQL
      await this.disconnect();

      // Populate D1 database
      await this.insertBatchToD1(installations, heartbeats);

      // Verify migration
      await this.verifySync();

      console.log('\n🎉 Migration completed successfully!');
      console.log(`📊 Migrated ${installations.length} installations and ${heartbeats.length} heartbeats`);

    } catch (error) {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    }
  }
}

// Parse command line arguments
function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    batchSize: 10000, // Default batch size
    dryRun: false,
    resetSync: false,
    remote: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--batch-size':
      case '-b':
        if (i + 1 < args.length) {
          options.batchSize = parseInt(args[i + 1]);
          i++; // Skip next argument
        }
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--reset':
      case '-r':
        options.resetSync = true;
        break;
      case '--remote':
      case '-R':
        options.remote = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: migrate-to-d1.ts [options]

Options:
  -b, --batch-size <number>  Number of records to sync per batch (default: 10000)
  -d, --dry-run             Show what would be synced without making changes
  -r, --reset               Reset sync by clearing D1 tables and starting from beginning
  -R, --remote              Execute on CloudFlare D1 instead of local database
  -h, --help                Show this help message

Examples:
  # Sync up to 5000 records per batch
  ./migrate-to-d1.ts --batch-size 5000
  
  # Dry run to see what would be synced
  ./migrate-to-d1.ts --dry-run
  
  # Reset sync and start over
  ./migrate-to-d1.ts --reset --batch-size 1000
  
  # Execute on CloudFlare D1
  ./migrate-to-d1.ts --remote
        `);
        process.exit(0);
    }
  }

  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  const migrator = new DatabaseMigrator(options);
  await migrator.incrementalSync();
}

// Run the migration if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseMigrator };
