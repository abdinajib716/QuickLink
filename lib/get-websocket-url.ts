export function getWebSocketUrl(): string {
  // For local development
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3000/api/websocket';
  }

  // For production (Vercel)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return process.env.NEXT_PUBLIC_WEBSOCKET_URL || 
    `${protocol}//${window.location.host}/api/websocket`;
} 