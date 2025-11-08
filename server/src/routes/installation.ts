import { Hono } from 'hono';
import { z } from 'zod';
import type { D1Database } from '../types/database';
import { getDb } from '../db/client';
import { installations, type NewInstallation } from '../db/schema';
import { Logger } from '../utils/logger';
import { extractClientIp, extractCountryCode } from '../utils/network';

const installationSchema = z.object({
  appName: z.string().min(1),
  appVersion: z.string().min(1),
  ipAddress: z.string().optional(),
  previousId: z.string().uuid("Previous ID must be a valid UUID").optional(),
  data: z.string().optional(),
  countryCode: z.string().optional(),
  region: z.string().optional(),
});

export const installationRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

/**
 * Installation endpoint
 * 
 * Supports both JSON and form-encoded requests for backward compatibility.
 * 
 * @see FORM_ENCODING_SUPPORT.md for detailed documentation
 * 
 * Modern clients should use JSON format (Content-Type: application/json)
 * Form-encoded support maintained for older icloud-docker versions (< 2.0.0)
 */
installationRoutes.post('/', async (c) => {
  const requestContext = Logger.getRequestContext(c);
  
  // Get raw body text first for debugging
  const rawBody = await c.req.text();
  const contentType = c.req.header('content-type') || '';
  
  // Log raw body for debugging (truncated for security)
  Logger.info('Installation request received', {
    operation: 'installation.request',
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
      const formData = new URLSearchParams(rawBody);
      
      // Helper function to get value from form data, supporting both camelCase and snake_case
      const getFormValue = (camelCase: string, snakeCase: string): string | undefined => {
        const value = formData.get(camelCase) || formData.get(snakeCase);
        return value || undefined;
      };
      
      parsedBody = {
        appName: getFormValue('appName', 'app_name'),
        appVersion: getFormValue('appVersion', 'app_version'),
        ipAddress: getFormValue('ipAddress', 'ip_address'),
        previousId: getFormValue('previousId', 'previous_id'),
        data: getFormValue('data', 'data'),
        countryCode: getFormValue('countryCode', 'country_code'),
        region: getFormValue('region', 'region')
      };
      
      Logger.info('Parsed form-encoded data', {
        operation: 'installation.form_parse',
        metadata: { 
          appName: parsedBody.appName,
          appVersion: parsedBody.appVersion,
          hasData: !!parsedBody.data
        },
        ...requestContext
      });
    } else {
      // Default to JSON parsing (recommended for all new clients)
      const rawParsed = JSON.parse(rawBody);
      
      // Transform snake_case to camelCase for backward compatibility
      parsedBody = {
        appName: rawParsed.appName || rawParsed.app_name,
        appVersion: rawParsed.appVersion || rawParsed.app_version,
        ipAddress: rawParsed.ipAddress || rawParsed.ip_address,
        previousId: rawParsed.previousId || rawParsed.previous_id,
        data: rawParsed.data,
        countryCode: rawParsed.countryCode || rawParsed.country_code,
        region: rawParsed.region
      };
    }

    const validatedData = installationSchema.parse(parsedBody);
    
    const db = getDb(c.env);
    const installationId = crypto.randomUUID();
    const now = new Date().toISOString();
    const ipAddress = validatedData.ipAddress || extractClientIp(
      c.req.header('x-forwarded-for'),
      c.req.header('x-real-ip')
    );
    
    // Extract country code from Cloudflare header
    const cfCountryCode = extractCountryCode(c.req.header('cf-ipcountry'));
    
    // Extract geo data with fallback to Cloudflare header
    // Client-provided values take precedence for backward compatibility
    const countryCode = validatedData.countryCode || cfCountryCode || null;
    const region = validatedData.region || null;
    
    // Log warning if IP address fallback is used
    if (!validatedData.ipAddress && ipAddress === '0.0.0.0') {
      Logger.warning('Installation created with fallback IP address', {
        operation: 'installation.create',
        metadata: { 
          appName: validatedData.appName, 
          appVersion: validatedData.appVersion,
          hasForwardedIP: !!c.req.header('x-forwarded-for'),
          hasRealIP: !!c.req.header('x-real-ip')
        },
        ...requestContext
      });
    }
    
    // Log geo enrichment status
    if (countryCode) {
      Logger.info('Installation enriched with geo data', {
        operation: 'installation.geo_enrichment',
        metadata: {
          countryCode,
          region: region || 'unknown',
          source: validatedData.countryCode ? 'client' : 'cloudflare-header'
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
      countryCode,
      region,
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
          hasGeoData: !!countryCode,
          geoSource: validatedData.countryCode ? 'client' : (countryCode ? 'cloudflare-header' : 'none')
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
});
