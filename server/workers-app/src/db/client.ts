export type Env = { DB: D1Database };

export async function queryOne<T>(env: Env, sql: string, ...params: unknown[]): Promise<T | null> {
  const res = await env.DB.prepare(sql).bind(...params).first<T>();
  return (res as T) ?? null;
}

export async function queryAll<T>(env: Env, sql: string, ...params: unknown[]): Promise<T[]> {
  const res = await env.DB.prepare(sql).bind(...params).all<T>();
  return (res?.results as T[]) ?? [];
}

export async function execute(env: Env, sql: string, ...params: unknown[]): Promise<void> {
  await env.DB.prepare(sql).bind(...params).run();
}
