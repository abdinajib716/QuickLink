import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Link from '@/lib/models/Link'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const since = Number(url.searchParams.get('since')) || Date.now() - 60000 // Default to last minute
    
    await connectDB()
    
    // Find links created or updated since the timestamp
    const recentLinks = await Link.find({
      $or: [
        { createdAt: { $gt: new Date(since) } },
        { updatedAt: { $gt: new Date(since) } }
      ]
    }).sort({ updatedAt: -1 })
    
    // Find links that were deleted since the timestamp
    const deletedLinks = await Link.find({
      deleted: true,
      updatedAt: { $gt: new Date(since) }
    }).select('_id title')
    
    // Format updates
    const updates = [
      ...recentLinks.map(link => ({
        type: 'link_added',
        payload: link,
        timestamp: new Date(link.updatedAt).getTime()
      })),
      ...deletedLinks.map(link => ({
        type: 'link_deleted',
        payload: { 
          id: link._id,
          title: link.title || 'Link'
        },
        timestamp: new Date(link.updatedAt).getTime()
      }))
    ].sort((a, b) => a.timestamp - b.timestamp)
    
    return NextResponse.json({
      timestamp: Date.now(),
      updates
    })
  } catch (error) {
    console.error('Error in updates API:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch updates',
      timestamp: Date.now(),
      updates: []
    }, { status: 500 })
  }
} 