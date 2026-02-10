import { eq } from 'drizzle-orm';
import { getDb } from '../index';
import { environmentVariables } from '../schema';

export async function listVars() {
  const db = getDb();
  if (!db) return [];

  return db.select().from(environmentVariables);
}

export async function upsertVar(data: {
  name: string;
  value: string;
  source?: 'user' | 'response';
  description?: string;
  isSecret?: boolean;
  metadataEndpoint?: string;
  metadataMethod?: string;
  metadataTimestamp?: string;
  metadataResponseStatus?: number;
  metadataJsonPath?: string;
}) {
  const db = getDb();
  if (!db) return null;

  const now = new Date().toISOString();
  const [result] = await db
    .insert(environmentVariables)
    .values({
      ...data,
      source: data.source || 'user',
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: environmentVariables.name,
      set: {
        value: data.value,
        source: data.source || 'user',
        description: data.description,
        isSecret: data.isSecret,
        updatedAt: now,
        metadataEndpoint: data.metadataEndpoint,
        metadataMethod: data.metadataMethod,
        metadataTimestamp: data.metadataTimestamp,
        metadataResponseStatus: data.metadataResponseStatus,
        metadataJsonPath: data.metadataJsonPath,
      },
    })
    .returning();
  return result;
}

export async function bulkUpsert(
  vars: Array<{
    name: string;
    value: string;
    source?: 'user' | 'response';
    description?: string;
    isSecret?: boolean;
  }>
) {
  const db = getDb();
  if (!db) return [];

  const now = new Date().toISOString();
  const results = [];
  for (const v of vars) {
    const [result] = await db
      .insert(environmentVariables)
      .values({
        ...v,
        source: v.source || 'user',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: environmentVariables.name,
        set: {
          value: v.value,
          source: v.source || 'user',
          description: v.description,
          isSecret: v.isSecret,
          updatedAt: now,
        },
      })
      .returning();
    results.push(result);
  }
  return results;
}

export async function deleteVar(name: string) {
  const db = getDb();
  if (!db) return false;

  await db.delete(environmentVariables).where(eq(environmentVariables.name, name));
  return true;
}
