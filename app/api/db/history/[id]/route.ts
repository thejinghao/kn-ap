import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-helpers';
import { updateCall, deleteCall } from '@/lib/db/queries/call-history';

export const PATCH = withErrorHandling(async (req: NextRequest, context: unknown) => {
  const { id } = (context as { params: Promise<{ id: string }> }).params
    ? await (context as { params: Promise<{ id: string }> }).params
    : { id: '' };
  const data = await req.json();
  const call = await updateCall(id, data);
  if (!call) {
    return NextResponse.json({ error: 'Not found or DB not configured' }, { status: 404 });
  }
  return NextResponse.json({ call });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, context: unknown) => {
  const { id } = (context as { params: Promise<{ id: string }> }).params
    ? await (context as { params: Promise<{ id: string }> }).params
    : { id: '' };
  const ok = await deleteCall(id);
  if (!ok) {
    return NextResponse.json({ error: 'Not found or DB not configured' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
});
