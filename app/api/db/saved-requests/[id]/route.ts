import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-helpers';
import { updateSaved, deleteSaved } from '@/lib/db/queries/saved-requests';

export const PATCH = withErrorHandling(async (req: NextRequest, context: unknown) => {
  const { id } = (context as { params: Promise<{ id: string }> }).params
    ? await (context as { params: Promise<{ id: string }> }).params
    : { id: '' };
  const data = await req.json();
  const saved = await updateSaved(id, data);
  if (!saved) {
    return NextResponse.json({ error: 'Not found or DB not configured' }, { status: 404 });
  }
  return NextResponse.json({ request: saved });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, context: unknown) => {
  const { id } = (context as { params: Promise<{ id: string }> }).params
    ? await (context as { params: Promise<{ id: string }> }).params
    : { id: '' };
  const ok = await deleteSaved(id);
  if (!ok) {
    return NextResponse.json({ error: 'Not found or DB not configured' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
});
