#!/usr/bin/env node

/**
 * Performance testing script for API endpoints and frontend
 * Measures response times, latency, and generates a detailed report
 */

const API_URL = process.env.API_URL || 'http://localhost:8787';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4173';
const NUM_REQUESTS = parseInt(process.env.NUM_REQUESTS || '10', 10);
const WARMUP_REQUESTS = parseInt(process.env.WARMUP_REQUESTS || '2', 10);

const results = {
  timestamp: new Date().toISOString(),
  environment: process.env.ENVIRONMENT || 'unknown',
  apiUrl: API_URL,
  frontendUrl: FRONTEND_URL,
  endpoints: {},
  frontend: {},
  summary: {}
};

/**
 * Measure API endpoint performance
 */
async function measureEndpoint(path, name) {
  const url = `${API_URL}${path}`;
  const timings = [];
  
  console.log(`\nTesting ${name} (${path})...`);
  
  // Warmup requests
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    await fetch(url);
  }
  
  // Actual measurements
  for (let i = 0; i < NUM_REQUESTS; i++) {
    const start = performance.now();
    try {
      const response = await fetch(url);
      const end = performance.now();
      const duration = end - start;
      
      if (!response.ok) {
        console.warn(`  Request ${i + 1}: Failed with status ${response.status}`);
        continue;
      }
      
      // Read response body to measure full request time
      await response.text();
      const fullEnd = performance.now();
      const fullDuration = fullEnd - start;
      
      timings.push({
        duration,
        fullDuration,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      process.stdout.write('.');
    } catch (error) {
      console.warn(`  Request ${i + 1}: Error - ${error.message}`);
    }
  }
  
  console.log('');
  
  if (timings.length === 0) {
    console.warn(`  No successful requests for ${name}`);
    return null;
  }
  
  const durations = timings.map(t => t.duration);
  const fullDurations = timings.map(t => t.fullDuration);
  
  const stats = {
    name,
    path,
    requests: timings.length,
    timeToByte: calculateStats(durations),
    totalTime: calculateStats(fullDurations),
    status: timings[0].status,
    headers: extractPerformanceHeaders(timings[0].headers)
  };
  
  console.log(`  Time to first byte: ${stats.timeToByte.mean.toFixed(2)}ms (±${stats.timeToByte.stdDev.toFixed(2)}ms)`);
  console.log(`  Total time: ${stats.totalTime.mean.toFixed(2)}ms (±${stats.totalTime.stdDev.toFixed(2)}ms)`);
  console.log(`  P50: ${stats.totalTime.p50.toFixed(2)}ms | P95: ${stats.totalTime.p95.toFixed(2)}ms | P99: ${stats.totalTime.p99.toFixed(2)}ms`);
  
  return stats;
}

/**
 * Measure frontend page load performance
 */
async function measurePageLoad(path, name) {
  const url = `${FRONTEND_URL}${path}`;
  const timings = [];
  
  console.log(`\nTesting ${name} page load (${path})...`);
  
  // Warmup
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    await fetch(url);
  }
  
  // Measurements
  for (let i = 0; i < NUM_REQUESTS; i++) {
    const start = performance.now();
    try {
      const response = await fetch(url);
      const html = await response.text();
      const end = performance.now();
      const duration = end - start;
      
      if (!response.ok) {
        console.warn(`  Request ${i + 1}: Failed with status ${response.status}`);
        continue;
      }
      
      timings.push({
        duration,
        status: response.status,
        size: html.length,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      process.stdout.write('.');
    } catch (error) {
      console.warn(`  Request ${i + 1}: Error - ${error.message}`);
    }
  }
  
  console.log('');
  
  if (timings.length === 0) {
    console.warn(`  No successful requests for ${name}`);
    return null;
  }
  
  const durations = timings.map(t => t.duration);
  const sizes = timings.map(t => t.size);
  
  const stats = {
    name,
    path,
    requests: timings.length,
    loadTime: calculateStats(durations),
    size: {
      mean: sizes.reduce((a, b) => a + b, 0) / sizes.length,
      min: Math.min(...sizes),
      max: Math.max(...sizes)
    },
    status: timings[0].status,
    headers: extractPerformanceHeaders(timings[0].headers)
  };
  
  console.log(`  Load time: ${stats.loadTime.mean.toFixed(2)}ms (±${stats.loadTime.stdDev.toFixed(2)}ms)`);
  console.log(`  P50: ${stats.loadTime.p50.toFixed(2)}ms | P95: ${stats.loadTime.p95.toFixed(2)}ms | P99: ${stats.loadTime.p99.toFixed(2)}ms`);
  console.log(`  Page size: ${(stats.size.mean / 1024).toFixed(2)}KB`);
  
  return stats;
}

/**
 * Calculate statistics for a set of timings
 */
function calculateStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    min: Math.min(...values),
    max: Math.max(...values),
    stdDev,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

/**
 * Extract performance-related headers
 */
function extractPerformanceHeaders(headers) {
  const perfHeaders = {};
  const relevantHeaders = ['cf-ray', 'cf-cache-status', 'server-timing', 'x-response-time', 'age'];
  
  for (const header of relevantHeaders) {
    if (headers[header]) {
      perfHeaders[header] = headers[header];
    }
  }
  
  return perfHeaders;
}

/**
 * Generate performance summary
 */
function generateSummary() {
  const allEndpoints = Object.values(results.endpoints).filter(e => e !== null);
  const allPages = Object.values(results.frontend).filter(p => p !== null);
  
  if (allEndpoints.length === 0 && allPages.length === 0) {
    return {
      status: 'NO_DATA',
      message: 'No performance data collected'
    };
  }
  
  const summary = {
    api: {
      endpoints: allEndpoints.length,
      averageResponseTime: allEndpoints.length > 0 
        ? allEndpoints.reduce((sum, e) => sum + e.totalTime.mean, 0) / allEndpoints.length 
        : 0,
      slowestEndpoint: allEndpoints.length > 0
        ? allEndpoints.reduce((max, e) => e.totalTime.mean > max.totalTime.mean ? e : max)
        : null,
      fastestEndpoint: allEndpoints.length > 0
        ? allEndpoints.reduce((min, e) => e.totalTime.mean < min.totalTime.mean ? e : min)
        : null
    },
    frontend: {
      pages: allPages.length,
      averageLoadTime: allPages.length > 0
        ? allPages.reduce((sum, p) => sum + p.loadTime.mean, 0) / allPages.length
        : 0,
      slowestPage: allPages.length > 0
        ? allPages.reduce((max, p) => p.loadTime.mean > max.loadTime.mean ? p : max)
        : null,
      fastestPage: allPages.length > 0
        ? allPages.reduce((min, p) => p.loadTime.mean < min.loadTime.mean ? p : min)
        : null
    }
  };
  
  return summary;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport() {
  const summary = results.summary;
  let markdown = `# Performance Test Report\n\n`;
  markdown += `**Environment:** ${results.environment}\n`;
  markdown += `**Timestamp:** ${results.timestamp}\n`;
  markdown += `**API URL:** ${results.apiUrl}\n`;
  markdown += `**Frontend URL:** ${results.frontendUrl}\n\n`;
  
  // API Performance
  markdown += `## API Performance\n\n`;
  if (summary.api.endpoints > 0) {
    markdown += `- **Endpoints Tested:** ${summary.api.endpoints}\n`;
    markdown += `- **Average Response Time:** ${summary.api.averageResponseTime.toFixed(2)}ms\n`;
    markdown += `- **Fastest Endpoint:** ${summary.api.fastestEndpoint.name} (${summary.api.fastestEndpoint.totalTime.mean.toFixed(2)}ms)\n`;
    markdown += `- **Slowest Endpoint:** ${summary.api.slowestEndpoint.name} (${summary.api.slowestEndpoint.totalTime.mean.toFixed(2)}ms)\n\n`;
    
    markdown += `### Endpoint Details\n\n`;
    markdown += `| Endpoint | Mean (ms) | P50 (ms) | P95 (ms) | P99 (ms) | Min (ms) | Max (ms) |\n`;
    markdown += `|----------|-----------|----------|----------|----------|----------|----------|\n`;
    
    Object.values(results.endpoints).filter(e => e !== null).forEach(endpoint => {
      markdown += `| ${endpoint.name} | ${endpoint.totalTime.mean.toFixed(2)} | ${endpoint.totalTime.p50.toFixed(2)} | ${endpoint.totalTime.p95.toFixed(2)} | ${endpoint.totalTime.p99.toFixed(2)} | ${endpoint.totalTime.min.toFixed(2)} | ${endpoint.totalTime.max.toFixed(2)} |\n`;
    });
  } else {
    markdown += `No API endpoints tested.\n`;
  }
  
  markdown += `\n`;
  
  // Frontend Performance
  markdown += `## Frontend Performance\n\n`;
  if (summary.frontend.pages > 0) {
    markdown += `- **Pages Tested:** ${summary.frontend.pages}\n`;
    markdown += `- **Average Load Time:** ${summary.frontend.averageLoadTime.toFixed(2)}ms\n`;
    markdown += `- **Fastest Page:** ${summary.frontend.fastestPage.name} (${summary.frontend.fastestPage.loadTime.mean.toFixed(2)}ms)\n`;
    markdown += `- **Slowest Page:** ${summary.frontend.slowestPage.name} (${summary.frontend.slowestPage.loadTime.mean.toFixed(2)}ms)\n\n`;
    
    markdown += `### Page Load Details\n\n`;
    markdown += `| Page | Mean (ms) | P50 (ms) | P95 (ms) | P99 (ms) | Size (KB) |\n`;
    markdown += `|------|-----------|----------|----------|----------|----------|\n`;
    
    Object.values(results.frontend).filter(p => p !== null).forEach(page => {
      markdown += `| ${page.name} | ${page.loadTime.mean.toFixed(2)} | ${page.loadTime.p50.toFixed(2)} | ${page.loadTime.p95.toFixed(2)} | ${page.loadTime.p99.toFixed(2)} | ${(page.size.mean / 1024).toFixed(2)} |\n`;
    });
  } else {
    markdown += `No frontend pages tested.\n`;
  }
  
  return markdown;
}

/**
 * Main execution
 */
async function main() {
  console.log('========================================');
  console.log('Performance Testing');
  console.log('========================================');
  console.log(`Environment: ${results.environment}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Requests per endpoint: ${NUM_REQUESTS}`);
  console.log(`Warmup requests: ${WARMUP_REQUESTS}`);
  console.log('========================================\n');
  
  // Test API endpoints
  console.log('API ENDPOINT TESTS');
  console.log('==================');
  
  results.endpoints.health = await measureEndpoint('/api', 'Health Check');
  results.endpoints.usage = await measureEndpoint('/api/usage', 'Usage Analytics');
  results.endpoints.installationStats = await measureEndpoint('/api/installation-stats', 'Installation Stats');
  results.endpoints.versionAnalytics = await measureEndpoint('/api/version-analytics', 'Version Analytics');
  results.endpoints.recentInstallations = await measureEndpoint('/api/recent-installations', 'Recent Installations');
  results.endpoints.newInstallations = await measureEndpoint('/api/new-installations', 'New Installations');
  results.endpoints.heartbeatAnalytics = await measureEndpoint('/api/heartbeat-analytics', 'Heartbeat Analytics');
  
  // Test frontend pages
  console.log('\n\nFRONTEND PAGE TESTS');
  console.log('===================');
  
  results.frontend.home = await measurePageLoad('/', 'Home Page');
  
  // Generate summary
  results.summary = generateSummary();
  
  // Output results
  console.log('\n\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  
  if (results.summary.api && results.summary.api.endpoints > 0) {
    console.log(`\nAPI Performance:`);
    console.log(`  Endpoints tested: ${results.summary.api.endpoints}`);
    console.log(`  Average response time: ${results.summary.api.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Fastest: ${results.summary.api.fastestEndpoint.name} (${results.summary.api.fastestEndpoint.totalTime.mean.toFixed(2)}ms)`);
    console.log(`  Slowest: ${results.summary.api.slowestEndpoint.name} (${results.summary.api.slowestEndpoint.totalTime.mean.toFixed(2)}ms)`);
  }
  
  if (results.summary.frontend && results.summary.frontend.pages > 0) {
    console.log(`\nFrontend Performance:`);
    console.log(`  Pages tested: ${results.summary.frontend.pages}`);
    console.log(`  Average load time: ${results.summary.frontend.averageLoadTime.toFixed(2)}ms`);
    console.log(`  Fastest: ${results.summary.frontend.fastestPage.name} (${results.summary.frontend.fastestPage.loadTime.mean.toFixed(2)}ms)`);
    console.log(`  Slowest: ${results.summary.frontend.slowestPage.name} (${results.summary.frontend.slowestPage.loadTime.mean.toFixed(2)}ms)`);
  }
  
  console.log('\n========================================\n');
  
  // Save results
  const fs = require('fs');
  const path = require('path');
  
  const outputDir = process.env.OUTPUT_DIR || './performance-results';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save JSON
  const jsonPath = path.join(outputDir, 'performance-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${jsonPath}`);
  
  // Save Markdown report
  const markdownPath = path.join(outputDir, 'performance-report.md');
  fs.writeFileSync(markdownPath, generateMarkdownReport());
  console.log(`Report saved to: ${markdownPath}`);
  
  // Exit with error if any endpoint failed
  const failedEndpoints = Object.values(results.endpoints).filter(e => e === null).length;
  const failedPages = Object.values(results.frontend).filter(p => p === null).length;
  
  if (failedEndpoints > 0 || failedPages > 0) {
    console.error(`\n⚠️  Warning: ${failedEndpoints} endpoints and ${failedPages} pages failed`);
    process.exit(1);
  }
  
  console.log('\n✅ Performance testing completed successfully');
}

main().catch(error => {
  console.error('Performance testing failed:', error);
  process.exit(1);
});
