import { Hono } from 'hono';
import { installationRoutes } from './routes/installation';
import { heartbeatRoutes } from './routes/heartbeat';
import { usageRoutes } from './routes/usage';
import { testRoutes } from './routes/test';
import { handleValidationError, handleGenericError } from './utils/errors';

type Bindings = { DB: D1Database; ENABLE_TEST_ROUTES?: string };

const app = new Hono<{ Bindings: Bindings }>();

app.onError((err, c) => {
  // Handle Zod errors as 400 Bad Request
  if ((err as any).name === 'ZodError') {
    return handleValidationError(c, err);
  }
  
  return handleGenericError(c, err);
});

app.get('/api', (c) => c.text('All good.'));
app.route('/api/installation', installationRoutes);
app.route('/api/heartbeat', heartbeatRoutes);
app.route('/api/usage', usageRoutes);

// Test utilities (only used in local/dev CI). Keep unlisted under /__test.
app.use('/__test/*', async (c, next) => {
  const host = new URL(c.req.url).hostname;
  const allowed = c.env.ENABLE_TEST_ROUTES === '1' || host === '127.0.0.1' || host === 'localhost';
  if (allowed) return next();
  return c.json({ ok: false, message: 'Test routes disabled' }, 404);
});
app.route('/__test', testRoutes);

export default app;
export { scheduled } from './jobs/enrich-ip';
