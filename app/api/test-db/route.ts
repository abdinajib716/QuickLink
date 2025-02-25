import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('Testing MongoDB connection...');
    await connectDB();
    
    // List all collections in the database
    const collections = await mongoose.connection.db!.collections();
    const collectionNames = collections.map(c => c.collectionName);
    
    // Get database name
    const dbName = mongoose.connection.db!.databaseName;
    
    return NextResponse.json({
      status: 'Connected',
      databaseName: dbName,
      connectionString: process.env.MONGODB_URI?.replace(/(mongodb\+srv:\/\/[^:]+:)([^@]+)(@.+)/, '$1[PASSWORD_HIDDEN]$3'),
      collections: collectionNames,
      mongooseVersion: mongoose.version,
    });
  } catch (error) {
    console.error('MongoDB connection test failed:', error);
    return NextResponse.json({
      status: 'Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 