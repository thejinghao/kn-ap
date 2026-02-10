import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-helpers';
import { getPreference, setPreference } from '@/lib/db/queries/preferences';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Key parameter is required' }, { status: 400 });
  }
  const value = await getPreference(key);
  return NextResponse.json({ key, value });
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const { key, value } = await req.json();
  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }
  const result = await setPreference(key, JSON.stringify(value));
  if (!result) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  return NextResponse.json({ preference: result });
});
