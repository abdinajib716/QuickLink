import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Link from '@/lib/models/Link';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST() {
  try {
    logger.info('Starting database cleanup operation');
    await connectDB();
    
    // Option 1: Completely remove deleted links
    const result = await Link.deleteMany({ deleted: true });
    
    // Option 2: Only keep deleted links for 30 days then remove them
    // const thirtyDaysAgo = new Date();
    // thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // const result = await Link.deleteMany({ 
    //   deleted: true,
    //   updatedAt: { $lt: thirtyDaysAgo }
    // });
    
    logger.info(`Cleanup complete: removed ${result.deletedCount} links`);
    
    return NextResponse.json({
      success: true,
      removed: result.deletedCount
    });
  } catch (error) {
    logger.error('Error during cleanup operation:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
} 