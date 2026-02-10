import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiCallEntry, ProxyResponse } from '@/lib/types';

/**
 * Hook for managing call history with optimistic local state and background DB sync.
 * Falls back to ephemeral (in-memory only) behavior if DB is unavailable.
 */
export function useCallHistory() {
  const [calls, setCalls] = useState<ApiCallEntry[]>([]);
  const [isDbAvailable, setIsDbAvailable] = useState(true);
  const initialLoadDone = useRef(false);

  // Load history from DB on mount
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    async function loadFromDb() {
      try {
        const res = await fetch('/api/db/history?limit=100');
        if (!res.ok) {
          setIsDbAvailable(false);
          return;
        }
        const data = await res.json();
        if (data.calls && data.calls.length > 0) {
          // Convert DB rows back to ApiCallEntry format
          const entries: ApiCallEntry[] = data.calls.map(dbRowToCallEntry);
          setCalls(entries);
        }
      } catch {
        setIsDbAvailable(false);
      }
    }

    loadFromDb();
  }, []);

  // Add a new call entry (optimistic + async DB write)
  const addCall = useCallback(
    (entry: ApiCallEntry) => {
      setCalls((prev) => [entry, ...prev]);

      if (isDbAvailable) {
        fetch('/api/db/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(callEntryToDbRow(entry)),
        }).catch(() => {
          // Silent failure — data stays in local state
        });
      }
    },
    [isDbAvailable]
  );

  // Update an existing call entry (optimistic + async DB patch)
  const updateCall = useCallback(
    (id: string, updates: Partial<ApiCallEntry>) => {
      setCalls((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );

      if (isDbAvailable) {
        fetch(`/api/db/history/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(callEntryUpdatesToDbRow(updates)),
        }).catch(() => {
          // Silent failure
        });
      }
    },
    [isDbAvailable]
  );

  return { calls, addCall, updateCall };
}

// ---- Conversion helpers ----

function dbRowToCallEntry(row: Record<string, unknown>): ApiCallEntry {
  let response: ProxyResponse | undefined;
  if (row.responseBody) {
    try {
      const data = JSON.parse(row.responseBody as string);
      const headers = row.responseHeaders
        ? JSON.parse(row.responseHeaders as string)
        : {};
      response = {
        success: (row.status as string) === 'success',
        status: (row.httpStatus as number) || 0,
        statusText: (row.httpStatusText as string) || '',
        headers,
        data,
        requestMetadata: {
          timestamp: row.createdAt as string,
          fullUrl: (row.fullUrl as string) || '',
          method: row.method as string,
          correlationId: (row.correlationId as string) || '',
          idempotencyKey: (row.idempotencyKey as string) || undefined,
        },
      };
    } catch {
      // ignore parse errors
    }
  }

  return {
    id: row.id as string,
    name: (row.name as string) || undefined,
    method: row.method as ApiCallEntry['method'],
    path: row.path as string,
    timestamp: new Date(row.createdAt as string),
    status: row.status as ApiCallEntry['status'],
    requestBody: row.requestBody ? JSON.parse(row.requestBody as string) : undefined,
    response,
    error: (row.error as string) || undefined,
    duration: (row.duration as number) || undefined,
  };
}

function callEntryToDbRow(entry: ApiCallEntry) {
  return {
    id: entry.id,
    name: entry.name || null,
    method: entry.method,
    path: entry.path,
    status: entry.status,
    httpStatus: entry.response?.status || null,
    httpStatusText: entry.response?.statusText || null,
    requestBody: entry.requestBody ? JSON.stringify(entry.requestBody) : null,
    responseBody: entry.response?.data ? JSON.stringify(entry.response.data) : null,
    responseHeaders: entry.response?.headers
      ? JSON.stringify(entry.response.headers)
      : null,
    correlationId: entry.response?.requestMetadata?.correlationId || null,
    idempotencyKey: entry.response?.requestMetadata?.idempotencyKey || null,
    fullUrl: entry.response?.requestMetadata?.fullUrl || null,
    error: entry.error || null,
    duration: entry.duration || null,
    createdAt: entry.timestamp.toISOString(),
  };
}

function callEntryUpdatesToDbRow(updates: Partial<ApiCallEntry>) {
  const row: Record<string, unknown> = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.error !== undefined) row.error = updates.error;
  if (updates.duration !== undefined) row.duration = updates.duration;
  if (updates.response) {
    row.httpStatus = updates.response.status;
    row.httpStatusText = updates.response.statusText;
    row.responseBody = JSON.stringify(updates.response.data);
    row.responseHeaders = JSON.stringify(updates.response.headers);
    row.correlationId = updates.response.requestMetadata?.correlationId;
    row.idempotencyKey = updates.response.requestMetadata?.idempotencyKey;
    row.fullUrl = updates.response.requestMetadata?.fullUrl;
  }
  return row;
}
