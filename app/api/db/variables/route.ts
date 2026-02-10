import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-helpers';
import { listVars, upsertVar, bulkUpsert, deleteVar } from '@/lib/db/queries/env-variables';

export const GET = withErrorHandling(async () => {
  const variables = await listVars();
  return NextResponse.json({ variables });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const data = await req.json();

  // Support bulk upsert via { variables: [...] }
  if (Array.isArray(data.variables)) {
    const results = await bulkUpsert(data.variables);
    return NextResponse.json({ variables: results }, { status: 201 });
  }

  // Single upsert
  const variable = await upsertVar(data);
  if (!variable) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  return NextResponse.json({ variable }, { status: 201 });
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const ok = await deleteVar(name);
  if (!ok) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  return NextResponse.json({ success: true });
});
