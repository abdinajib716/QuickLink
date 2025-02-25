import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Link from '@/lib/models/Link';
import { broadcaster } from '@/lib/websocket-broadcaster';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// Batch delete endpoint
export async function DELETE(request: NextRequest) {
  try {
    logger.info('Batch delete operation started');
    
    // Get IDs from request body
    const data = await request.json();
    const { ids } = data;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }
    
    await connectDB();
    
    // Get links before deletion for notifications
    const links = await Link.find({ _id: { $in: ids } });
    
    if (links.length === 0) {
      return NextResponse.json({ error: 'No links found with provided IDs' }, { status: 404 });
    }
    
    // Delete the links
    const result = await Link.deleteMany({ _id: { $in: ids } });
    
    // Send WebSocket notifications for each deleted link
    const notifications = links.map(link => 
      broadcaster.broadcast({
        type: 'link_deleted',
        payload: { 
          id: link._id.toString(),
          title: link.title || 'Link'
        },
        timestamp: Date.now()
      })
    );
    
    await Promise.all(notifications);
    
    logger.info(`Batch delete completed: removed ${result.deletedCount} links`);
    
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Error during batch delete operation:', error);
    return NextResponse.json({ error: 'Failed to delete links' }, { status: 500 });
  }
} 