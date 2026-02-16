import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { ChannelService } from '@/lib/channel-service';
import { getIO, isIOInitialized } from '@/lib/socket-server';
import { getChannelRoom } from '@/lib/socket-handlers';
import { verifyChannelOwnership, AuthorizationError } from '@/lib/authorization';

const channelService = new ChannelService();

// GET /api/channels/:id - Get channel details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    
    const channel = await channelService.getChannelById(params.id);
    
    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }
    
    // Verify user is the owner
    try {
      verifyChannelOwnership(channel, auth.user.id);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }
    
    return NextResponse.json({ channel });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Error fetching channel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channel' },
      { status: 500 }
    );
  }
}

// PATCH /api/channels/:id - Update channel status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    
    const { status } = body;
    
    if (!status || (status !== 'open' && status !== 'closed')) {
      return NextResponse.json(
        { error: 'Status must be either "open" or "closed"' },
        { status: 400 }
      );
    }
    
    // Verify channel exists and user is the owner
    const channel = await channelService.getChannelById(params.id);
    
    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }
    
    // Use authorization utility to verify ownership
    try {
      verifyChannelOwnership(channel, auth.user.id);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }
    
    const updatedChannel = await channelService.updateChannelStatus(params.id, status);
    
    // Emit WebSocket event for channel status change
    if (isIOInitialized()) {
      const io = getIO();
      const channelRoom = getChannelRoom(params.id);
      
      if (status === 'closed') {
        io.to(channelRoom).emit('channel_closed', {
          channelId: params.id
        });
      } else if (status === 'open') {
        io.to(channelRoom).emit('channel_opened', {
          channelId: params.id
        });
      }
    }
    
    return NextResponse.json({ channel: updatedChannel });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.error('Error updating channel:', error);
    return NextResponse.json(
      { error: 'Failed to update channel' },
      { status: 500 }
    );
  }
}
