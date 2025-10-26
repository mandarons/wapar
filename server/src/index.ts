import { Hono } from 'hono';
import { installationRoutes } from './routes/installation';
import { heartbeatRoutes } from './routes/heartbeat';
import { usageRoutes } from './routes/usage';
import { versionAnalyticsRoutes } from './routes/version-analytics';
import { handleValidationError, handleGenericError } from './utils/errors';
import { scheduled } from './jobs/enrich-ip';
import { Logger } from './utils/logger';
import { ensureMigrations } from './db/migrations';

type Bindings = { DB: D1Database };

const app = new Hono<{ Bindings: Bindings }>();

// Middleware to ensure migrations run on first request
app.use('*', async (c, next) => {
  try {
    await ensureMigrations(c.env.DB);
  } catch (error) {
    Logger.error('Failed to run migrations', {
      operation: 'middleware.migrations',
      error: error as Error,
      ...Logger.getRequestContext(c)
    });
    // Continue anyway - migrations might already be applied
  }
  await next();
});

app.onError((err, c) => {
  const requestContext = Logger.getRequestContext(c);
  
  // Handle JSON parsing errors specifically
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    Logger.error('Global JSON parsing error caught', {
      operation: 'app.json_parse_error',
      error: err,
      metadata: { 
        errorMessage: err.message,
        contentType: c.req.header('content-type')
      },
      ...requestContext
    });
    return c.json({ 
      message: 'Invalid JSON in request body', 
      statusCode: 400,
      details: err.message
    }, 400);
  }
  
  // Handle Zod errors as 400 Bad Request
  if ((err as any).name === 'ZodError') {
    Logger.error('Global validation error caught', {
      operation: 'app.validation_error',
      error: err,
      metadata: { validationErrors: (err as any).errors },
      ...requestContext
    });
    return handleValidationError(c, err);
  }
  
  Logger.error('Global error caught', {
    operation: 'app.generic_error',
    error: err,
    ...requestContext
  });
  return handleGenericError(c, err);
});

// Main API endpoint with test SQL support for localhost
app.get('/api', (c) => {
  Logger.success('Health check accessed', { operation: 'health_check' });
  return c.text('All good.');
});

// Root endpoint
app.get('/', (c) => {
  Logger.success('Root endpoint accessed', { operation: 'root_access' });
  return c.text('Hello World!');
});

app.post('/api', async (c) => {
  const requestContext = Logger.getRequestContext(c);
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
          await Logger.measureOperation(
            'test_sql.exec',
            () => boundStmt.run(),
            {
              metadata: { sql: sql.substring(0, 100), paramCount: params.length },
              ...requestContext
            }
          );
          Logger.success('Test SQL execution completed', {
            operation: 'test_sql.exec',
            metadata: { sqlType: 'exec' }
          });
          return c.json({ ok: true });
        } else {
          const result = await Logger.measureOperation(
            'test_sql.query',
            () => boundStmt.first(),
            {
              metadata: { sql: sql.substring(0, 100), paramCount: params.length },
              ...requestContext
            }
          );
          Logger.success('Test SQL query completed', {
            operation: 'test_sql.query',
            metadata: { sqlType: 'query', hasResult: !!result }
          });
          return c.json(result);
        }
      } catch (error) {
        Logger.error('Test SQL execution failed', {
          operation: 'test_sql.error',
          error: error as Error,
          ...requestContext
        });
        return c.json({ error: String(error) }, 500);
      }
    }
  } else {
    Logger.warning('Non-localhost POST request to /api', {
      operation: 'api.unauthorized_post',
      metadata: { host },
      ...requestContext
    });
  }
  
  // Return 404 for non-test POST requests
  return c.notFound();
});

// Test endpoint for scheduled function (localhost only)
app.post('/__test/run-scheduled', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  const host = new URL(c.req.url).hostname;
  const isLocalhost = host === '127.0.0.1' || host === 'localhost';
  
  if (!isLocalhost) {
    Logger.warning('Non-localhost access to test scheduled endpoint', {
      operation: 'test_scheduled.unauthorized',
      metadata: { host },
      ...requestContext
    });
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
    
    Logger.info('Test scheduled job triggered', {
      operation: 'test_scheduled.trigger',
      metadata: { 
        batchSize: body.batch?.length || 0,
        cron: mockEvent.cron
      },
      ...requestContext
    });
    
    await scheduled(mockEvent, testEnv, { 
      waitUntil: () => {}, 
      passThroughOnException: () => {},
      props: {} // Required property for ExecutionContext
    });
    
    Logger.success('Test scheduled job completed', {
      operation: 'test_scheduled.complete'
    });
    
    return c.json({ ok: true });
  } catch (error) {
    Logger.error('Test scheduled job failed', {
      operation: 'test_scheduled.error',
      error: error as Error,
      ...requestContext
    });
    return c.json({ error: String(error) }, 500);
  }
});

app.route('/api/installation', installationRoutes);
app.route('/api/heartbeat', heartbeatRoutes);
app.route('/api/usage', usageRoutes);
app.route('/api/version-analytics', versionAnalyticsRoutes);

export default app;
export { scheduled };
