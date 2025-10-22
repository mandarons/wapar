import { Hono } from 'hono';
import { HeartbeatSchema } from '../utils/validation';
import { getDb } from '../db/client';
import { installations, heartbeats, type NewHeartbeat } from '../db/schema';
import { NotFoundError, handleValidationError, handleGenericError } from '../utils/errors';
import { eq, and, gte, lte } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const heartbeatRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

/**
 * Heartbeat endpoint
 * 
 * Supports both JSON and form-encoded requests for backward compatibility.
 * 
 * @see FORM_ENCODING_SUPPORT.md for detailed documentation
 * 
 * Modern clients should use JSON format (Content-Type: application/json)
 * Form-encoded support maintained for older icloud-docker versions (< 2.0.0)
 * 
 * IMPORTANT: For form-encoded requests, the 'data' field must be a valid JSON string
 * that will be parsed. Invalid JSON will cause a 500 error.
 */
heartbeatRoutes.post('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  try {
    // Get raw body text first for debugging
    const rawBody = await c.req.text();
    const contentType = c.req.header('content-type') || '';
    
    // Log raw body for debugging (truncated for security)
    Logger.info('Heartbeat request received', {
      operation: 'heartbeat.request',
      metadata: { 
        bodyLength: rawBody.length,
        bodyPreview: rawBody.substring(0, 100),
        contentType: contentType
      },
      ...requestContext
    });

    // Parse body based on content type
    let parsedBody;
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form-encoded data (legacy support for older icloud-docker clients)
      // NOTE: data field must be a valid JSON string if provided
      const formData = new URLSearchParams(rawBody);
      const dataStr = formData.get('data');
      parsedBody = {
        installationId: formData.get('installationId') || undefined,
        data: dataStr ? JSON.parse(dataStr) : undefined
      };
      
      Logger.info('Parsed form-encoded data', {
        operation: 'heartbeat.form_parse',
        metadata: { 
          installationId: parsedBody.installationId,
          hasData: !!parsedBody.data
        },
        ...requestContext
      });
    } else {
      // Default to JSON parsing (recommended for all new clients)
      try {
        parsedBody = JSON.parse(rawBody);
      } catch (parseError) {
        Logger.error('JSON parsing failed', {
          operation: 'heartbeat.json_parse',
          error: parseError as Error,
          metadata: { 
            bodyLength: rawBody.length,
            bodyPreview: rawBody.substring(0, 200),
            contentType: contentType
          },
          ...requestContext
        });
        return c.json({ 
          message: 'Invalid JSON in request body', 
          statusCode: 400,
          details: (parseError as Error).message
        }, 400);
      }
    }

    const body = HeartbeatSchema.parse(parsedBody);

    const db = getDb(c.env);

    // Verify installation exists
    const installation = await Logger.measureOperation(
      'heartbeat.verify_installation',
      () => db.select({ id: installations.id })
        .from(installations)
        .where(eq(installations.id, body.installationId))
        .limit(1),
      {
        metadata: { installationId: body.installationId },
        ...requestContext
      }
    );

    if (!installation.length) {
      Logger.warning('Heartbeat attempted for non-existent installation', {
        operation: 'heartbeat.verify_installation',
        metadata: { installationId: body.installationId },
        ...requestContext
      });
      throw new NotFoundError('Installation not found.');
    }

    // Check if a heartbeat exists for today (UTC)
    const start = new Date(); start.setUTCHours(0,0,0,0);
    const end = new Date(); end.setUTCHours(23,59,59,999);

    const existing = await Logger.measureOperation(
      'heartbeat.check_existing',
      () => db.select({ id: heartbeats.id })
        .from(heartbeats)
        .where(and(
          eq(heartbeats.installationId, body.installationId),
          gte(heartbeats.createdAt, start.toISOString()),
          lte(heartbeats.createdAt, end.toISOString())
        ))
        .limit(1),
      {
        metadata: { 
          installationId: body.installationId,
          dateRange: `${start.toISOString()} - ${end.toISOString()}`
        },
        ...requestContext
      }
    );

    if (!existing.length) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const newHeartbeat: NewHeartbeat = {
        id,
        installationId: body.installationId,
        data: body.data ? JSON.stringify(body.data) : null,
        createdAt: now,
        updatedAt: now,
      };

      await Logger.measureOperation(
        'heartbeat.db_insert',
        () => db.insert(heartbeats).values(newHeartbeat),
        {
          metadata: { 
            heartbeatId: id,
            installationId: body.installationId,
            hasData: !!body.data
          },
          ...requestContext
        }
      );

      Logger.success('New heartbeat created', {
        operation: 'heartbeat.create',
        metadata: { 
          heartbeatId: id,
          installationId: body.installationId
        }
      });
    } else {
      Logger.info('Duplicate heartbeat skipped', {
        operation: 'heartbeat.duplicate_skip',
        metadata: { 
          installationId: body.installationId,
          existingHeartbeatId: existing[0].id
        }
      });
    }
    
    return c.json({ id: body.installationId }, 201);
  } catch (error) {
    // Handle Zod validation errors
    if ((error as any).name === 'ZodError') {
      Logger.error('Heartbeat validation failed', {
        operation: 'heartbeat.validation',
        error: error as Error,
        metadata: { validationErrors: (error as any).errors },
        ...requestContext
      });
      return handleValidationError(c, error);
    }
    // Handle custom HTTP errors with statusCode
    if (error instanceof NotFoundError) {
      Logger.error('Heartbeat failed - installation not found', {
        operation: 'heartbeat.not_found',
        error: error as Error,
        ...requestContext
      });
      return c.json({ 
        message: error.message, 
        statusCode: error.status 
      }, error.status as any);
    }
    // Handle all other errors
    Logger.error('Heartbeat creation failed', {
      operation: 'heartbeat.create',
      error: error as Error,
      ...requestContext
    });
    return handleGenericError(c, error as Error);
  }
});
