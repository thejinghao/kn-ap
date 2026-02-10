import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-helpers';
import { listCalls, createCall } from '@/lib/db/queries/call-history';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const limit = Number(req.nextUrl.searchParams.get('limit') || '100');
  const calls = await listCalls(limit);
  return NextResponse.json({ calls });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const data = await req.json();
  const call = await createCall(data);
  if (!call) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  return NextResponse.json({ call }, { status: 201 });
});
