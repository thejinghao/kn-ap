import { eq } from 'drizzle-orm';
import { getDb } from '../index';
import { userPreferences } from '../schema';

export async function getPreference(key: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.key, key));
  return row?.value ?? null;
}

export async function setPreference(key: string, value: string) {
  const db = getDb();
  if (!db) return null;

  const now = new Date().toISOString();
  const [result] = await db
    .insert(userPreferences)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: userPreferences.key,
      set: { value, updatedAt: now },
    })
    .returning();
  return result;
}
