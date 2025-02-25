import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';
import Link from '@/lib/models/Link';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('Debugging database connection...');
    
    // Get URL params
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    // Connect to the database
    await connectDB();
    
    if (action === 'create-test') {
      // Create a test document
      const testLink = await Link.create({
        url: 'https://example.com/test',
        title: 'Test Link',
        description: 'This is a test link created via debug API',
      });
      
      return NextResponse.json({
        status: 'Created test document',
        document: testLink,
      });
    }
    
    // Get database stats
    const dbName = mongoose.connection.db!.databaseName;
    const collections = await mongoose.connection.db!.collections();
    const collectionInfo = collections.map(c => c.collectionName);
    
    // Count documents in Link collection
    const linkCount = await Link.countDocuments();
    
    // Check for recent links
    const recentLinks = await Link.find()
      .sort({ createdAt: -1 })
      .limit(3);
    
    // Get mongoose model names
    const modelNames = Object.keys(mongoose.models);
    
    return NextResponse.json({
      database: {
        name: dbName,
        connectionString: process.env.MONGODB_URI?.replace(/(mongodb\+srv:\/\/[^:]+:)([^@]+)(@.+)/, '$1[PASSWORD_HIDDEN]$3'),
        collections: collectionInfo,
      },
      models: {
        registered: modelNames,
        linkSchema: mongoose.models.Link?.schema?.paths ? 
          Object.keys(mongoose.models.Link.schema.paths) : 
          'No schema found',
      },
      counts: {
        links: linkCount,
      },
      samples: {
        recentLinks,
      },
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      status: 'Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error,
    }, { status: 500 });
  }
} 