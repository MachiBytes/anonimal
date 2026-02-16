import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { MessageService } from '@/lib/message-service';
import { ChannelService } from '@/lib/channel-service';
import { verifyChannelOwnership, AuthorizationError } from '@/lib/authorization';
import { getIO, isIOInitialized } from '@/lib/socket-server';
import { getChannelRoom } from '@/lib/socket-handlers';

const messageService = new MessageService();
const channelService = new ChannelService();

// POST /api/messages/:messageId/approve - Approve a message
export async function POST(
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
    
    // Approve the message
    await messageService.approveMessage(params.messageId);
    
    // Get the approved message with identity information
    const messages = await messageService.getMessagesForOwner(message.channel_id);
    const approvedMessageWithIdentity = messages.find(m => m.id === params.messageId);
    
    if (!approvedMessageWithIdentity) {
      throw new Error('Failed to retrieve approved message with identity');
    }
    
    // Broadcast the approved message to all users in the channel via WebSocket
    if (isIOInitialized()) {
      const channelRoom = getChannelRoom(message.channel_id);
      getIO().to(channelRoom).emit('new_message', {
        message: approvedMessageWithIdentity
      });
    }
    
    return NextResponse.json({ message: approvedMessageWithIdentity });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      if (error.message === 'Only pending messages can be approved') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    console.error('Error approving message:', error);
    return NextResponse.json(
      { error: 'Failed to approve message' },
      { status: 500 }
    );
  }
}
