import { Context } from 'hono';

export class HttpError extends Error {
  constructor(public message: string, public status: number) {
    super(message);
    this.name = 'HttpError';
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, public issues?: any[]) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}

// Error response utilities
export function createErrorResponse(c: Context, error: HttpError): Response {
  const response = {
    message: error.message,
    statusCode: error.status,
    ...(error instanceof ValidationError && error.issues ? { issues: error.issues } : {})
  };
  
  return c.json(response, error.status as any);    
}

export function handleValidationError(c: Context, zodError: any): Response {
  const issues = zodError.issues?.map((issue: any) => ({
    field: issue.path?.join('.') || 'unknown',
    message: issue.message,
    code: issue.code
  })) || [];
  
  return c.json({
    message: 'Validation failed',
    statusCode: 400,
    error: 'Bad Request',
    issues
  }, 400);
}

export function handleGenericError(c: Context, error: Error): Response {
  console.error('Unhandled error:', error);
  
  if (error instanceof HttpError) {
    return createErrorResponse(c, error);
  }
  
  return c.json({
    message: 'Internal Server Error',
    statusCode: 500,
    error: 'Internal Server Error'
  }, 500);
}
