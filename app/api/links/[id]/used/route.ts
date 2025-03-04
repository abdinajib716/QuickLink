import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Link from '@/lib/models/Link'
import { broadcaster } from '@/lib/websocket-broadcaster'

export const runtime = 'nodejs'

// PATCH /api/links/[id]/used
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    console.log(`PATCH /api/links/${id}/used - Marking link as used`)
    
    if (!id) {
      return NextResponse.json({ error: 'Missing link ID' }, { status: 400 })
    }

    await connectDB()
    
    const link = await Link.findByIdAndUpdate(
      id,
      { used: true },
      { new: true }
    )
    
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    
    // Convert to plain object to ensure the used field is properly included
    const linkData = link.toObject();
    // Force the used field to be true in the return data
    linkData.used = true;
    
    console.log('Link marked as used with data:', linkData);
    
    // Notify connected WebSocket clients
    try {
      const wsMessage = {
        type: 'link_updated',
        payload: linkData,
        timestamp: Date.now(),
      }
      
      console.log('PATCH /api/links/[id]/used - Broadcasting WebSocket message:', wsMessage)
      await broadcaster.broadcast(wsMessage)
    } catch (error) {
      console.error('PATCH /api/links/[id]/used - Failed to broadcast WebSocket message:', error)
      // Continue anyway, the link was updated
    }
    
    return NextResponse.json(linkData, { status: 200 })
  } catch (error) {
    console.error('PATCH /api/links/[id]/used - Error:', error)
    return NextResponse.json({ error: 'Failed to update link' }, { status: 500 })
  }
}
