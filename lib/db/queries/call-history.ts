import { eq, desc } from 'drizzle-orm';
import { getDb } from '../index';
import { apiCallHistory } from '../schema';

export async function listCalls(limit = 100) {
  const db = getDb();
  if (!db) return [];

  return db
    .select()
    .from(apiCallHistory)
    .orderBy(desc(apiCallHistory.createdAt))
    .limit(limit);
}

export async function createCall(data: typeof apiCallHistory.$inferInsert) {
  const db = getDb();
  if (!db) return null;

  const [result] = await db.insert(apiCallHistory).values(data).returning();
  return result;
}

export async function updateCall(
  id: string,
  data: Partial<Omit<typeof apiCallHistory.$inferInsert, 'id'>>
) {
  const db = getDb();
  if (!db) return null;

  const [result] = await db
    .update(apiCallHistory)
    .set(data)
    .where(eq(apiCallHistory.id, id))
    .returning();
  return result;
}

export async function deleteCall(id: string) {
  const db = getDb();
  if (!db) return false;

  await db.delete(apiCallHistory).where(eq(apiCallHistory.id, id));
  return true;
}
