import { Hono } from 'hono';
import { installationRoutes } from './routes/installation';
import { heartbeatRoutes } from './routes/heartbeat';
import { usageRoutes } from './routes/usage';
import { handleValidationError, handleGenericError } from './utils/errors';
import { scheduled } from './jobs/enrich-ip';

type Bindings = { DB: D1Database };

const app = new Hono<{ Bindings: Bindings }>();

app.onError((err, c) => {
  // Handle Zod errors as 400 Bad Request
  if ((err as any).name === 'ZodError') {
    return handleValidationError(c, err);
  }
  
  return handleGenericError(c, err);
});

// Main API endpoint with test SQL support for localhost
app.get('/api', (c) => c.text('All good.'));

// Root endpoint
app.get('/', (c) => c.text('Hello World!'));

app.post('/api', async (c) => {
  const host = new URL(c.req.url).hostname;
  const isLocalhost = host === '127.0.0.1' || host === 'localhost';
  
  // Handle test SQL requests only from localhost
  if (isLocalhost) {
    const testSqlType = c.req.header('X-Test-SQL');
    if (testSqlType && (testSqlType === 'exec' || testSqlType === 'query')) {
      try {
        const { sql, params = [] } = await c.req.json();
        const stmt = c.env.DB.prepare(sql);
        const boundStmt = params.length > 0 ? stmt.bind(...params) : stmt;
        
        if (testSqlType === 'exec') {
          await boundStmt.run();
          return c.json({ ok: true });
        } else {
          const result = await boundStmt.first();
          return c.json(result);
        }
      } catch (error) {
        return c.json({ error: String(error) }, 500);
      }
    }
  }
  
  // Return 404 for non-test POST requests
  return c.notFound();
});

// Test endpoint for scheduled function (localhost only)
app.post('/__test/run-scheduled', async (c) => {
  const host = new URL(c.req.url).hostname;
  const isLocalhost = host === '127.0.0.1' || host === 'localhost';
  
  if (!isLocalhost) {
    return c.notFound();
  }
  
  try {
    const body = await c.req.json();
    const mockEvent: ScheduledController = {
      cron: '0 * * * *',
      scheduledTime: Date.now(),
      noRetry: () => {} 
    };
    
    // Pass mock batch data through environment for testing
    const testEnv = {
      ...c.env,
      __TEST_BATCH_DATA: body.batch
    };
    
    await scheduled(mockEvent, testEnv, { 
      waitUntil: () => {}, 
      passThroughOnException: () => {},
      props: {} // Required property for ExecutionContext
    });
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.route('/api/installation', installationRoutes);
app.route('/api/heartbeat', heartbeatRoutes);
app.route('/api/usage', usageRoutes);

export default app;
