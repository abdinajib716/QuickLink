import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Link from '@/lib/models/Link'
import { broadcaster } from '@/lib/websocket-broadcaster'
import mongoose from 'mongoose'

export const runtime = 'nodejs'; // Force Node.js runtime for this route

export async function GET() {
  try {
    console.log('GET /api/links - Connecting to database...');
    await connectDB()
    
    console.log('GET /api/links - Fetching links from database...');
    const links = await Link.find({ deleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(100)
    
    console.log(`GET /api/links - Successfully fetched ${links.length} links`);
    return NextResponse.json(links, { status: 200 })
  } catch (error) {
    console.error('GET /api/links - Error:', error)
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/links - Processing request...');
    const body = await request.json()
    const { url, description } = body
    
    if (!url) {
      console.error('POST /api/links - URL is required');
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }
    
    // Validate URL
    try {
      new URL(url)
    } catch (error) {
      console.error('POST /api/links - Invalid URL format');
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    
    console.log('POST /api/links - Connecting to database...');
    await connectDB()
    
    // Create link without waiting for metadata
    const linkData = {
      url,
      description: description || '',
    };
    
    console.log('POST /api/links - Creating link in database:', linkData);
    const newLink = await Link.create(linkData);
    console.log('POST /api/links - Link created with ID:', newLink._id);
    
    // Try to fetch metadata in the background
    let metadataUpdated = false;
    try {
      console.log('POST /api/links - Fetching metadata from URL...');
      const response = await fetch(url, {
        headers: { 'User-Agent': 'QuickLink-Saver/1.0' },
        signal: AbortSignal.timeout(5000), // 5-second timeout
      });
      
      if (response.ok) {
        const html = await response.text()
        const titleMatch = html.match(/<title>(.*?)<\/title>/)
        const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i)
        
        const title = titleMatch ? titleMatch[1] : undefined
        let favicon = faviconMatch ? faviconMatch[1] : undefined
        
        // Handle relative favicon URLs
        if (favicon && !favicon.startsWith('http')) {
          const urlObj = new URL(url)
          if (favicon.startsWith('/')) {
            favicon = `${urlObj.origin}${favicon}`
          } else {
            favicon = `${urlObj.origin}/${favicon}`
          }
        }
        
        if (title || favicon) {
          console.log('POST /api/links - Updating link with metadata:', { title, favicon });
          const updatedLink = await Link.findByIdAndUpdate(
            newLink._id,
            { title, favicon },
            { new: true }
          );
          
          if (updatedLink) {
            console.log('POST /api/links - Link updated with metadata');
            metadataUpdated = true;
            newLink.title = updatedLink.title;
            newLink.favicon = updatedLink.favicon;
          }
        }
      }
    } catch (error) {
      console.error('POST /api/links - Error fetching metadata:', error);
      // Continue without metadata
    }
    
    // Notify connected WebSocket clients
    try {
      const wsMessage = {
        type: 'link_added',
        payload: metadataUpdated ? newLink.toJSON() : newLink,
        timestamp: Date.now(),
      };
      
      console.log('POST /api/links - Broadcasting WebSocket message:', wsMessage);
      await broadcaster.broadcast(wsMessage);
    } catch (error) {
      console.error('POST /api/links - Failed to broadcast WebSocket message:', error);
      // Continue anyway, the link was saved
    }
    
    return NextResponse.json(newLink, { status: 201 })
  } catch (error) {
    console.error('POST /api/links - Error creating link:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
} 