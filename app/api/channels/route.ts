import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { ChannelService } from '@/lib/channel-service';

const channelService = new ChannelService();

// GET /api/channels - List owner's channels
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const channels = await channelService.getChannelsByOwner(auth.user.id);
    
    return NextResponse.json({ channels });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST /api/channels - Create channel
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    
    const { name } = body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      );
    }
    
    const channel = await channelService.createChannel(auth.user.id, name.trim());
    
    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}
