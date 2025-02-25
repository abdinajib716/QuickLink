import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Link from '@/lib/models/Link';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// This endpoint can be called by a Vercel Cron Job
export async function GET(request: NextRequest) {
  try {
    logger.info('Running scheduled cleanup...');
    
    // Connect to database
    await connectDB();
    
    // Example: Delete links older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Link.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    
    logger.info(`Cleanup completed: deleted ${result.deletedCount} old links`);
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed: deleted ${result.deletedCount} old links`
    });
  } catch (error) {
    logger.error('Error during cleanup:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Cleanup operation failed' 
    }, { status: 500 });
  }
} 