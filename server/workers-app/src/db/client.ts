import { drizzle } from 'drizzle-orm/d1';
import { installations, heartbeats } from './schema';

export type Env = { DB: D1Database };

export function getDb(env: Env) {
  return drizzle(env.DB, { schema: { installations, heartbeats } });
}
