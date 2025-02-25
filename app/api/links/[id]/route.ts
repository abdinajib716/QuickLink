import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Link from '@/lib/models/Link'
import { broadcaster } from '@/lib/websocket-broadcaster'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'; // Force Node.js runtime for this route

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  logger.info(`DELETE /api/links/${id} - Processing request`);
  
  try {
    // Connect to MongoDB
    logger.startTimer('db-connect');
    await connectDB();
    logger.endTimer('db-connect');
    
    // First find the link to get its data for the WebSocket notification
    logger.startTimer('find-link');
    const link = await Link.findById(id);
    logger.endTimer('find-link');
    
    if (!link) {
      logger.warn(`Link not found: ${id}`);
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }
    
    // Store link data for notification
    const linkData = {
      id: link._id.toString(),
      title: link.title || 'Link'
    };
    
    // Perform hard delete - completely remove from database
    logger.startTimer('delete-operation');
    const result = await Link.findByIdAndDelete(id);
    logger.endTimer('delete-operation');
    
    if (!result) {
      logger.error(`Failed to delete link: ${id}`);
      return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
    }
    
    // Still send WebSocket notification
    logger.startTimer('ws-broadcast');
    await broadcaster.broadcast({
      type: 'link_deleted',
      payload: linkData,
      timestamp: Date.now()
    });
    logger.endTimer('ws-broadcast');
    
    logger.info(`Successfully deleted link: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`Failed to delete link ${id}:`, error);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
} 