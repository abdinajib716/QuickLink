// Forward to App Router implementation
export default function handler(req, res) {
  res.status(307).redirect('/api/websocket');
} 