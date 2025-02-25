import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  logger.info('Socket API route accessed - redirecting to WebSocket endpoint');
  
  // Return a response directing users to use the WebSocket endpoint instead
  return NextResponse.json({
    error: 'This endpoint has been deprecated. Please use /api/websocket instead.',
    websocket_url: '/api/websocket'
  }, { status: 308 });
} 