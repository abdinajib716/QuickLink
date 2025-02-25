import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    mongoUri: process.env.MONGODB_URI?.replace(/(mongodb\+srv:\/\/[^:]+:)([^@]+)(@.+)/, '$1[PASSWORD_HIDDEN]$3'),
    nodeEnv: process.env.NODE_ENV,
  });
} 