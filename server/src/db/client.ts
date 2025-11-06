import { drizzle } from 'drizzle-orm/d1';
import { installations, heartbeats } from './schema';
import type { D1Database, Env } from '../types/database';

export { type Env };

export function getDb(env: Env) {
  return drizzle(env.DB, { schema: { installations, heartbeats } });
}
