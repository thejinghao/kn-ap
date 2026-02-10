import { eq, desc } from 'drizzle-orm';
import { getDb } from '../index';
import { savedRequests } from '../schema';

export async function listSaved() {
  const db = getDb();
  if (!db) return [];

  return db.select().from(savedRequests).orderBy(desc(savedRequests.updatedAt));
}

export async function createSaved(data: typeof savedRequests.$inferInsert) {
  const db = getDb();
  if (!db) return null;

  const [result] = await db.insert(savedRequests).values(data).returning();
  return result;
}

export async function updateSaved(
  id: string,
  data: Partial<Omit<typeof savedRequests.$inferInsert, 'id'>>
) {
  const db = getDb();
  if (!db) return null;

  const now = new Date().toISOString();
  const [result] = await db
    .update(savedRequests)
    .set({ ...data, updatedAt: now })
    .where(eq(savedRequests.id, id))
    .returning();
  return result;
}

export async function deleteSaved(id: string) {
  const db = getDb();
  if (!db) return false;

  await db.delete(savedRequests).where(eq(savedRequests.id, id));
  return true;
}
