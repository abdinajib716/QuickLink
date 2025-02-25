import { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import Redis from 'ioredis'

let io: SocketIOServer | null = null

export async function GET(request: NextRequest) {
  try {
    const { socket: res } = request as any
    
    if (!io) {
      io = new SocketIOServer({
        path: '/api/socket',
        addTrailingSlash: false,
      })
      
      // Setup Redis pub/sub for broadcasting messages
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
      redis.subscribe('websocket_messages')
      
      redis.on('message', (_channel, message) => {
        if (io) {
          const data = JSON.parse(message)
          io.emit('realtime_update', data)
        }
      })
      
      io.on('connection', (socket) => {
        console.log('Client connected', socket.id)
        
        socket.on('disconnect', () => {
          console.log('Client disconnected', socket.id)
        })
      })
    }
    
    // Let Socket.IO handle the upgrade
    const { socket: clientSocket } = res
    const upgradeHeader = request.headers.get('upgrade') || ''
    
    if (upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: WebSocket', { status: 426 })
    }
    
    // Adapt the NextRequest to a format Socket.IO can understand
    const reqAdapter = {
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method,
      url: request.url,
    }
    
    // Let Socket.IO handle the upgrade
    await new Promise((resolve) => {
      io!.engine.handleUpgrade(reqAdapter as any, clientSocket, Buffer.from([]), () => {
        resolve(undefined)
      })
    })
    
    return new Response(null)
  } catch (error) {
    console.error('Socket.IO error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 