import { NextRequest, NextResponse } from 'next/server';
import { ChannelService } from '@/lib/channel-service';

const channelService = new ChannelService();

export const dynamic = 'force-dynamic';

// GET /api/channels/lookup?code=xxx-xxx - Lookup channel by code
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json(
        { error: 'Channel code is required' },
        { status: 400 }
      );
    }
    
    const channel = await channelService.getChannelByCode(code);
    
    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ channel });
  } catch (error) {
    console.error('Error looking up channel:', error);
    return NextResponse.json(
      { error: 'Failed to lookup channel' },
      { status: 500 }
    );
  }
}
