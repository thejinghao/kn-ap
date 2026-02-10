import { drizzle } from 'drizzle-orm/libsql';
import { getTursoClient } from './client';
import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (db) return db;

  const client = getTursoClient();
  if (!client) return null;

  db = drizzle(client, { schema });
  return db;
}
