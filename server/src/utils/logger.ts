export enum LogLevel {
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  INFO = 'INFO'
}

export interface LogContext {
  operation: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: Error;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.formatTimestamp();
    const baseLog = `[${timestamp}] ${level}: ${message}`;
    
    if (!context) return baseLog;

    const contextParts: string[] = [];
    
    if (context.operation) contextParts.push(`op=${context.operation}`);
    if (context.duration !== undefined) contextParts.push(`duration=${context.duration}ms`);
    if (context.requestId) contextParts.push(`reqId=${context.requestId}`);
    if (context.ipAddress) contextParts.push(`ip=${context.ipAddress}`);
    if (context.userAgent) contextParts.push(`ua=${context.userAgent.substring(0, 50)}...`);
    
    if (context.metadata) {
      Object.entries(context.metadata).forEach(([key, value]) => {
        contextParts.push(`${key}=${JSON.stringify(value)}`);
      });
    }

    if (context.error) {
      contextParts.push(`error=${context.error.message}`);
      contextParts.push(`stack=${context.error.stack}`);
    }

    return contextParts.length > 0 ? `${baseLog} | ${contextParts.join(' ')}` : baseLog;
  }

  static success(message: string, context?: LogContext): void {
    // Minimal logging for success cases
    if (context?.operation) {
      const duration = context.duration ? ` (${context.duration}ms)` : '';
      console.log(`✅ ${context.operation}${duration}`);
    } else {
      console.log(`✅ ${message}`);
    }
  }

  static warning(message: string, context?: LogContext): void {
    // More detailed logging for warnings
    const formattedMessage = this.formatMessage(LogLevel.WARNING, message, context);
    console.warn(`⚠️  ${formattedMessage}`);
  }

  static error(message: string, context?: LogContext): void {
    // Comprehensive logging for errors
    const formattedMessage = this.formatMessage(LogLevel.ERROR, message, context);
    console.error(`❌ ${formattedMessage}`);
  }

  static info(message: string, context?: LogContext): void {
    // Standard info logging
    const formattedMessage = this.formatMessage(LogLevel.INFO, message, context);
    console.log(`ℹ️  ${formattedMessage}`);
  }

  // Utility method to measure operation duration
  static async measureOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    additionalContext?: Partial<LogContext>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.success(`${operation} completed`, {
        operation,
        duration,
        ...additionalContext
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.error(`${operation} failed`, {
        operation,
        duration,
        error: error as Error,
        ...additionalContext
      });
      
      throw error;
    }
  }

  // Helper to extract request context from Hono context
  static getRequestContext(c: any): Partial<LogContext> {
    return {
      requestId: crypto.randomUUID(),
      ipAddress: c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || 'unknown',
      userAgent: c.req.header('User-Agent') || 'unknown'
    };
  }
}
