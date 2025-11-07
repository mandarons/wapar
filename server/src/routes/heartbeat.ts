import { Hono } from 'hono';
import type { D1Database } from '../types/database';
import { HeartbeatSchema } from '../utils/validation';
import { getDb } from '../db/client';
import { installations, heartbeats, type NewHeartbeat, type NewInstallation } from '../db/schema';
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
    
    // Parse the data field if present
    let parsedData = undefined;
    if (dataStr) {
      parsedData = JSON.parse(dataStr); // Will be caught by global error handler
    }
    
    parsedBody = {
      installationId: formData.get('installationId') || undefined,
      data: parsedData
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
    parsedBody = JSON.parse(rawBody); // Will be caught by global error handler
  }

  const body = HeartbeatSchema.parse(parsedBody);

    const db = getDb(c.env);

    // Verify installation exists, create if missing
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
      Logger.warning('Heartbeat attempted for non-existent installation, auto-creating', {
        operation: 'heartbeat.verify_installation',
        metadata: { installationId: body.installationId },
        ...requestContext
      });
      
      // Auto-create installation with default values to recover from data loss/corruption
      const now = new Date().toISOString();
      const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '0.0.0.0';
      
      const newInstallation: NewInstallation = {
        id: body.installationId,
        appName: 'unknown',
        appVersion: 'unknown',
        ipAddress,
        data: null,
        previousId: null,
        countryCode: null,
        region: null,
        lastHeartbeatAt: now,
        createdAt: now,
        updatedAt: now,
      };

      await Logger.measureOperation(
        'heartbeat.create_installation',
        () => db.insert(installations).values(newInstallation),
        {
          metadata: { 
            installationId: body.installationId,
            reason: 'auto-created from heartbeat'
          },
          ...requestContext
        }
      );

      Logger.success('Auto-created installation from heartbeat', {
        operation: 'heartbeat.create_installation',
        metadata: { 
          installationId: body.installationId,
          ipAddress
        }
      });
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

      // Update installation's lastHeartbeatAt
      await Logger.measureOperation(
        'heartbeat.update_installation',
        () => db.update(installations)
          .set({ lastHeartbeatAt: now })
          .where(eq(installations.id, body.installationId)),
        {
          metadata: { 
            installationId: body.installationId,
            lastHeartbeatAt: now
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
      // Even if heartbeat exists for today, update lastHeartbeatAt to current time
      const duplicateNow = new Date().toISOString();
      await Logger.measureOperation(
        'heartbeat.update_installation',
        () => db.update(installations)
          .set({ lastHeartbeatAt: duplicateNow })
          .where(eq(installations.id, body.installationId)),
        {
          metadata: { 
            installationId: body.installationId,
            lastHeartbeatAt: duplicateNow
          },
          ...requestContext
        }
      );

      Logger.info('Duplicate heartbeat skipped', {
        operation: 'heartbeat.duplicate_skip',
        metadata: { 
          installationId: body.installationId,
          existingHeartbeatId: existing[0].id
        }
      });
    }
    
    return c.json({ id: body.installationId }, 201);
});
