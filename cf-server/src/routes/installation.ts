import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db/client';
import { installations, type NewInstallation } from '../db/schema';
import { handleValidationError, handleGenericError } from '../utils/errors';
import { Logger } from '../utils/logger';

const installationSchema = z.object({
  appName: z.string().min(1),
  appVersion: z.string().min(1),
  ipAddress: z.string().optional(),
  previousId: z.string().optional(),
  data: z.string().optional(),
  countryCode: z.string().optional(),
  region: z.string().optional(),
});

export const installationRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

installationRoutes.post('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  try {
    // Get raw body text first for debugging
    const rawBody = await c.req.text();
    
    // Log raw body for debugging (truncated for security)
    Logger.info('Installation request received', {
      operation: 'installation.request',
      metadata: { 
        bodyLength: rawBody.length,
        bodyPreview: rawBody.substring(0, 100),
        contentType: c.req.header('content-type')
      },
      ...requestContext
    });

    // Try to parse JSON
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      Logger.error('JSON parsing failed', {
        operation: 'installation.json_parse',
        error: parseError as Error,
        metadata: { 
          bodyLength: rawBody.length,
          bodyPreview: rawBody.substring(0, 200),
          contentType: c.req.header('content-type')
        },
        ...requestContext
      });
      return c.json({ 
        message: 'Invalid JSON in request body', 
        statusCode: 400,
        details: (parseError as Error).message
      }, 400);
    }

    const validatedData = installationSchema.parse(body);
    
    const db = getDb(c.env);
    const installationId = crypto.randomUUID();
    const now = new Date().toISOString();
    const ipAddress = validatedData.ipAddress || c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || '0.0.0.0';
    
    // Log warning if IP address fallback is used
    if (!validatedData.ipAddress && ipAddress === '0.0.0.0') {
      Logger.warning('Installation created with fallback IP address', {
        operation: 'installation.create',
        metadata: { 
          appName: validatedData.appName, 
          appVersion: validatedData.appVersion,
          hasCloudflareIP: !!c.req.header('CF-Connecting-IP'),
          hasForwardedIP: !!c.req.header('x-forwarded-for')
        },
        ...requestContext
      });
    }
    
    const newInstallation: NewInstallation = {
      id: installationId,
      appName: validatedData.appName,
      appVersion: validatedData.appVersion,
      ipAddress,
      previousId: validatedData.previousId || null,
      data: validatedData.data || null,
      countryCode: validatedData.countryCode || null,
      region: validatedData.region || null,
      createdAt: now,
      updatedAt: now,
    };

    await Logger.measureOperation(
      'installation.db_insert',
      () => db.insert(installations).values(newInstallation),
      {
        metadata: { 
          appName: validatedData.appName, 
          appVersion: validatedData.appVersion,
          hasPreviousId: !!validatedData.previousId,
          hasGeoData: !!(validatedData.countryCode && validatedData.region)
        },
        ...requestContext
      }
    );

    Logger.success('Installation created', {
      operation: 'installation.create',
      metadata: { 
        installationId,
        appName: validatedData.appName 
      }
    });

    return c.json({ id: installationId }, 201);
  } catch (error) {
    if ((error as any).name === 'ZodError') {
      Logger.error('Installation validation failed', {
        operation: 'installation.validation',
        error: error as Error,
        metadata: { validationErrors: (error as any).errors },
        ...requestContext
      });
      return handleValidationError(c, error as Error);
    }
    
    Logger.error('Installation creation failed', {
      operation: 'installation.create',
      error: error as Error,
      ...requestContext
    });
    return handleGenericError(c, error as Error);
  }
});
