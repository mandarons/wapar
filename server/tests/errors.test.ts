import { describe, it, expect } from 'bun:test';
import {
  HttpError,
  ValidationError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
  createErrorResponse,
  handleValidationError,
  handleGenericError
} from '../src/utils/errors';
import { Hono } from 'hono';

describe('Error Classes', () => {
  describe('HttpError', () => {
    it('should create error with correct properties', () => {
      const error = new HttpError('Internal Server Error', 500);
      expect(error.status).toBe(500);
      expect(error.message).toBe('Internal Server Error');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');
      expect(error.status).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should include issues when provided', () => {
      const issues = [{ field: 'email', issue: 'invalid format' }];
      const error = new ValidationError('Validation failed', issues);
      expect(error.status).toBe(400);
      expect(error.message).toBe('Validation failed');
      expect(error.issues).toEqual(issues);
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.status).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    it('should use default message when not provided', () => {
      const error = new NotFoundError();
      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
    });
  });

  describe('BadRequestError', () => {
    it('should create 400 error', () => {
      const error = new BadRequestError('Bad request');
      expect(error.status).toBe(400);
      expect(error.message).toBe('Bad request');
    });

    it('should use default message when not provided', () => {
      const error = new BadRequestError();
      expect(error.status).toBe(400);
      expect(error.message).toBe('Bad request');
    });
  });

  describe('InternalServerError', () => {
    it('should create 500 error', () => {
      const error = new InternalServerError('Server error');
      expect(error.status).toBe(500);
      expect(error.message).toBe('Server error');
    });

    it('should use default message when not provided', () => {
      const error = new InternalServerError();
      expect(error.status).toBe(500);
      expect(error.message).toBe('Internal server error');
    });
  });
});

describe('Error Response Functions', () => {
  describe('createErrorResponse', () => {
    it('should create basic error response', async () => {
      const app = new Hono();
      app.get('/test-error', (c) => {
        const error = new InternalServerError('Something went wrong');
        return createErrorResponse(c, error);
      });

      const res = await app.request('/test-error');
      expect(res.status).toBe(500);
      
      const data = await res.json() as any;
      expect(data.message).toBe('Something went wrong');
      expect(data.statusCode).toBe(500);
    });

    it('should include issues for ValidationError', async () => {
      const app = new Hono();
      app.get('/test-validation', (c) => {
        const issues = [{ field: 'email', message: 'invalid' }];
        const error = new ValidationError('Validation failed', issues);
        return createErrorResponse(c, error);
      });

      const res = await app.request('/test-validation');
      expect(res.status).toBe(400);
      
      const data = await res.json() as any;
      expect(data.message).toBe('Validation failed');
      expect(data.statusCode).toBe(400);
      expect(data.issues).toEqual([{ field: 'email', message: 'invalid' }]);
    });
  });

  describe('handleValidationError', () => {
    it('should format Zod validation errors', async () => {
      const app = new Hono();
      app.get('/test-zod', (c) => {
        const zodError = {
          issues: [
            { path: ['email'], message: 'Invalid email', code: 'invalid_string' },
            { path: ['age'], message: 'Too young', code: 'too_small' }
          ]
        };
        return handleValidationError(c, zodError);
      });

      const res = await app.request('/test-zod');
      expect(res.status).toBe(400);
      
      const data = await res.json() as any;
      expect(data.message).toBe('Validation failed');
      expect(data.statusCode).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.issues).toHaveLength(2);
      expect(data.issues[0].field).toBe('email');
      expect(data.issues[1].field).toBe('age');
    });

    it('should handle errors with nested paths', async () => {
      const app = new Hono();
      app.get('/test-nested', (c) => {
        const zodError = {
          issues: [
            { path: ['user', 'profile', 'name'], message: 'Required', code: 'invalid_type' }
          ]
        };
        return handleValidationError(c, zodError);
      });

      const res = await app.request('/test-nested');
      const data = await res.json() as any;
      expect(data.issues[0].field).toBe('user.profile.name');
    });

    it('should handle errors without path', async () => {
      const app = new Hono();
      app.get('/test-no-path', (c) => {
        const zodError = {
          issues: [
            { message: 'General error', code: 'custom' }
          ]
        };
        return handleValidationError(c, zodError);
      });

      const res = await app.request('/test-no-path');
      const data = await res.json() as any;
      expect(data.issues[0].field).toBe('unknown');
    });
  });

  describe('handleGenericError', () => {
    it('should handle HttpError correctly', async () => {
      const app = new Hono();
      app.get('/test-http-error', (c) => {
        const error = new BadRequestError('Invalid data');
        return handleGenericError(c, error);
      });

      const res = await app.request('/test-http-error');
      expect(res.status).toBe(400);
      
      const data = await res.json() as any;
      expect(data.message).toBe('Invalid data');
      expect(data.statusCode).toBe(400);
    });

    it('should handle ValidationError with issues', async () => {
      const app = new Hono();
      app.get('/test-validation-error', (c) => {
        const issues = [{ field: 'username', message: 'Required' }];
        const error = new ValidationError('Invalid username', issues);
        return handleGenericError(c, error);
      });

      const res = await app.request('/test-validation-error');
      expect(res.status).toBe(400);
      
      const data = await res.json() as any;
      expect(data.message).toBe('Invalid username');
      expect(data.statusCode).toBe(400);
      expect(data.issues).toEqual([{ field: 'username', message: 'Required' }]);
    });

    it('should handle generic errors as 500', async () => {
      const app = new Hono();
      app.get('/test-generic-error', (c) => {
        const error = new Error('Something unexpected');
        return handleGenericError(c, error);
      });

      const res = await app.request('/test-generic-error');
      expect(res.status).toBe(500);
      
      const data = await res.json() as any;
      expect(data.message).toBe('Internal Server Error');
      expect(data.statusCode).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });
  });
});
