import { createClient } from '@libsql/client';

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    return null;
  }

  return createClient({
    url,
    authToken,
  });
}

// Singleton — reuse across requests in the same process
let client: ReturnType<typeof getClient> | undefined;

export function getTursoClient() {
  if (client === undefined) {
    client = getClient();
  }
  return client;
}
