/**
 * Seed script to populate staging database with dummy data for demonstration
 * This creates realistic test data including installations, heartbeats, and version distribution
 */

const STAGING_API_URL = process.env.STAGING_API_URL;

if (!STAGING_API_URL) {
  console.error('Error: STAGING_API_URL environment variable is required');
  process.exit(1);
}

const COUNTRIES = ['US', 'GB', 'DE', 'CA', 'FR', 'AU', 'NL', 'SE', 'BE', 'CH', 'AT', 'ES', 'IT', 'NO', 'DK'];
const VERSIONS = ['1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0', '2.0.0'];
const APPS = ['icloud-docker', 'ha-bouncie'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateIP(country) {
  // Generate realistic IPs for different countries
  const baseIPs = {
    US: '192.168',
    GB: '194.83',
    DE: '185.26',
    CA: '192.99',
    FR: '151.80',
    AU: '103.28',
    NL: '188.166',
    SE: '46.246',
    BE: '195.154',
    CH: '194.126',
    AT: '195.3',
    ES: '188.165',
    IT: '151.236',
    NO: '158.38',
    DK: '185.38'
  };
  const base = baseIPs[country] || '192.168';
  return `${base}.${randomInt(1, 254)}.${randomInt(1, 254)}`;
}

async function seedInstallations(count = 50) {
  console.log(`\nSeeding ${count} installations...`);
  
  for (let i = 0; i < count; i++) {
    const country = randomChoice(COUNTRIES);
    const app = randomChoice(APPS);
    const version = randomChoice(VERSIONS);
    
    const installation = {
      app_name: app,
      app_version: version,
      ip_address: generateIP(country),
      data: JSON.stringify({
        user_agent: 'Docker/20.10.8',
        platform: 'linux/amd64',
        features: ['sync', 'cleanup', 'notifications']
      })
    };

    try {
      const res = await fetch(`${STAGING_API_URL}/api/installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(installation)
      });
      
      if (!res.ok) {
        console.error(`Failed to create installation: ${res.status} ${res.statusText}`);
      } else {
        const data = await res.json();
        console.log(`Created installation ${i + 1}/${count}: ${data.id} (${app} v${version}, ${country})`);
      }
    } catch (error) {
      console.error(`Error creating installation:`, error.message);
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function seedHeartbeats(count = 30) {
  console.log(`\nSeeding ${count} heartbeats...`);
  
  // First, get existing installations
  try {
    const res = await fetch(`${STAGING_API_URL}/api/usage`);
    if (!res.ok) {
      console.error('Failed to fetch installations for heartbeats');
      return;
    }
    
    const usage = await res.json();
    if (!usage.iCloudDocker || !usage.iCloudDocker.installations) {
      console.log('No installations found, skipping heartbeats');
      return;
    }

    const installations = usage.iCloudDocker.installations;
    console.log(`Found ${installations.length} installations`);

    for (let i = 0; i < Math.min(count, installations.length); i++) {
      const installation = installations[i];
      
      const heartbeat = {
        installation_id: installation.id,
        data: JSON.stringify({
          uptime: randomInt(3600, 86400 * 7),
          memory_usage_mb: randomInt(200, 800),
          photos_synced: randomInt(0, 5000),
          last_sync: new Date(Date.now() - randomInt(0, 3600000)).toISOString()
        })
      };

      try {
        const res = await fetch(`${STAGING_API_URL}/api/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(heartbeat)
        });
        
        if (!res.ok) {
          console.error(`Failed to create heartbeat: ${res.status} ${res.statusText}`);
        } else {
          console.log(`Created heartbeat ${i + 1}/${count} for installation ${installation.id}`);
        }
      } catch (error) {
        console.error(`Error creating heartbeat:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('Error seeding heartbeats:', error.message);
  }
}

async function verifyData() {
  console.log('\nVerifying seeded data...');
  
  try {
    const res = await fetch(`${STAGING_API_URL}/api/usage`);
    const data = await res.json();
    
    console.log('\n=== Staging Database Summary ===');
    console.log(`Total Installations: ${data.totalInstallations || 0}`);
    console.log(`Monthly Active: ${data.monthlyActive || 0}`);
    console.log(`Countries: ${data.countryToCount?.length || 0}`);
    console.log('\nCountry Distribution:');
    data.countryToCount?.slice(0, 5).forEach(c => {
      console.log(`  ${c.countryCode}: ${c.count}`);
    });
    console.log('================================\n');
  } catch (error) {
    console.error('Error verifying data:', error.message);
  }
}

async function main() {
  console.log(`Seeding staging database at: ${STAGING_API_URL}`);
  console.log('='.repeat(50));
  
  await seedInstallations(50);
  await seedHeartbeats(30);
  await verifyData();
  
  console.log('Seeding complete! ✨');
}

main().catch(console.error);
