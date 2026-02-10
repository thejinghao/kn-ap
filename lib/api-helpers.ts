import { NextRequest, NextResponse } from 'next/server';

type RouteHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse>;

/**
 * Wraps an API route handler with standardized error handling.
 * Catches errors and returns consistent JSON error responses.
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: unknown) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error(`[API Error] ${req.method} ${req.nextUrl.pathname}:`, error);
      const message =
        error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
