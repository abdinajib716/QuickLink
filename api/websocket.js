// Compatibility redirect for Pages Router structure
// Redirects to the App Router implementation
export default function handler(req, res) {
  // Just redirect to the App Router implementation
  res.redirect(307, '/api/websocket');
} 