import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-helpers';
import { listSaved, createSaved } from '@/lib/db/queries/saved-requests';

export const GET = withErrorHandling(async () => {
  const requests = await listSaved();
  return NextResponse.json({ requests });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const data = await req.json();
  const saved = await createSaved(data);
  if (!saved) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  return NextResponse.json({ request: saved }, { status: 201 });
});
