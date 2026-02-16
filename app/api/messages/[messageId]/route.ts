import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { MessageService } from '@/lib/message-service';
import { ChannelService } from '@/lib/channel-service';
import { verifyChannelOwnership, AuthorizationError } from '@/lib/authorization';

const messageService = new MessageService();
const channelService = new ChannelService();

// DELETE /api/messages/:messageId - Reject a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const auth = await requireAuth(request);
    
    // Get the message to verify it exists and get channel info
    const message = await messageService.getMessageById(params.messageId);
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Verify the user owns the channel
    const channel = await channelService.getChannelById(message.channel_id);
    
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
    
    // Reject the message (deletes it)
    await messageService.rejectMessage(params.messageId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      if (error.message === 'Only pending messages can be rejected') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    console.error('Error rejecting message:', error);
    return NextResponse.json(
      { error: 'Failed to reject message' },
      { status: 500 }
    );
  }
}
