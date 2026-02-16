import { Socket } from 'socket.io';
import { ChannelService } from './channel-service';
import { MessageService } from './message-service';
import { IdentityGenerator } from './identity-generator';
import { getIO } from './socket-server';
import { 
  verifyAnonymousUser, 
  verifyChannelOwner, 
  verifyChannelOwnership,
  AuthorizationError 
} from './authorization';

/**
 * Socket.io event interfaces
 */
export interface JoinChannelData {
  channelId: string;
  sessionId: string;
  isOwner: boolean;
  userId?: string;
}

export interface SendMessageData {
  channelId: string;
  content: string;
  sessionId: string;
}

export interface ApproveMessageData {
  messageId: string;
  userId: string;
}

export interface RejectMessageData {
  messageId: string;
  userId: string;
}

/**
 * Room naming conventions
 */
export function getChannelRoom(channelId: string): string {
  return `channel:${channelId}`;
}

export function getOwnerRoom(channelId: string): string {
  return `owner:${channelId}`;
}

/**
 * Socket.io event handlers
 */
export class SocketHandlers {
  private channelService: ChannelService;
  private messageService: MessageService;
  private identityGenerator: IdentityGenerator;

  constructor(
    channelService?: ChannelService,
    messageService?: MessageService,
    identityGenerator?: IdentityGenerator
  ) {
    this.channelService = channelService || new ChannelService();
    this.messageService = messageService || new MessageService();
    this.identityGenerator = identityGenerator || new IdentityGenerator();
  }

  async handleJoinChannel(socket: Socket, data: JoinChannelData): Promise<void> {
    try {
      console.log('handleJoinChannel called with data:', data);
      const { channelId, sessionId, isOwner, userId } = data;

      console.log('Fetching channel:', channelId);
      const channel = await this.channelService.getChannelById(channelId);
      if (!channel) {
        console.log('Channel not found:', channelId);
        socket.emit('error', {
          code: 'CHANNEL_NOT_FOUND',
          message: 'Channel does not exist'
        });
        return;
      }

      console.log('Channel found:', channel);
      const channelRoom = getChannelRoom(channelId);
      socket.join(channelRoom);

      if (isOwner) {
        if (!userId || channel.owner_id !== userId) {
          socket.emit('error', {
            code: 'UNAUTHORIZED',
            message: 'You are not the owner of this channel'
          });
          socket.leave(channelRoom);
          return;
        }

        const ownerRoom = getOwnerRoom(channelId);
        socket.join(ownerRoom);

        // Store userId in socket data for authorization checks
        socket.data.userId = userId;
        socket.data.channelId = channelId;

        socket.emit('joined_channel', {
          channelId,
          isOwner: true,
          channel
        });
      } else {
        console.log('Getting or creating identity for session:', sessionId);
        const identity = await this.identityGenerator.getOrCreateIdentity(channelId, sessionId);
        console.log('Identity obtained:', identity);

        socket.data.anonUserId = identity.id;
        socket.data.channelId = channelId;
        socket.data.sessionId = sessionId;

        console.log('Emitting identity_assigned');
        socket.emit('identity_assigned', {
          anonUser: identity
        });

        console.log('Emitting joined_channel');
        socket.emit('joined_channel', {
          channelId,
          isOwner: false,
          channel
        });
      }

      console.log(`Socket ${socket.id} joined channel ${channelId} (owner: ${isOwner})`);
    } catch (error) {
      console.error('Error in handleJoinChannel:', error);
      socket.emit('error', {
        code: 'JOIN_CHANNEL_ERROR',
        message: 'Failed to join channel'
      });
    }
  }

  async handleSendMessage(socket: Socket, data: SendMessageData): Promise<void> {
    try {
      const { channelId, content, sessionId } = data;
      const anonUserId = socket.data.anonUserId;
      const userId = socket.data.userId;

      // Verify this is an anonymous user, not a channel owner
      verifyAnonymousUser(anonUserId, userId);

      const channel = await this.channelService.getChannelById(channelId);
      if (!channel) {
        socket.emit('error', {
          code: 'CHANNEL_NOT_FOUND',
          message: 'Channel does not exist'
        });
        return;
      }

      if (channel.status === 'closed') {
        socket.emit('error', {
          code: 'CHANNEL_CLOSED',
          message: 'This channel is closed and not accepting new messages'
        });
        return;
      }

      const message = await this.messageService.submitMessage(channelId, anonUserId, content);

      const identity = await this.identityGenerator.getOrCreateIdentity(channelId, sessionId);

      const messageWithIdentity = {
        ...message,
        anon_user: {
          name: identity.name,
          icon_url: identity.icon_url,
          icon_background_color: identity.icon_background_color
        }
      };

      socket.emit('message_sent', {
        message: messageWithIdentity
      });

      const ownerRoom = getOwnerRoom(channelId);
      getIO().to(ownerRoom).emit('message_pending', {
        message: messageWithIdentity
      });

      console.log(`Message ${message.id} sent to channel ${channelId}`);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: error.message
        });
        return;
      }
      
      console.error('Error in handleSendMessage:', error);
      socket.emit('error', {
        code: 'SEND_MESSAGE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to send message'
      });
    }
  }

  async handleApproveMessage(socket: Socket, data: ApproveMessageData): Promise<void> {
    try {
      const { messageId, userId } = data;
      const anonUserId = socket.data.anonUserId;

      // Verify this is a channel owner, not an anonymous user
      verifyChannelOwner(userId, anonUserId);

      const message = await this.messageService.getMessageById(messageId);
      if (!message) {
        socket.emit('error', {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message does not exist'
        });
        return;
      }

      const channel = await this.channelService.getChannelById(message.channel_id);
      if (!channel) {
        socket.emit('error', {
          code: 'CHANNEL_NOT_FOUND',
          message: 'Channel does not exist'
        });
        return;
      }

      // Verify the user owns the channel
      verifyChannelOwnership(channel, userId);

      await this.messageService.approveMessage(messageId);

      const messages = await this.messageService.getMessagesForOwner(message.channel_id);
      const messageWithIdentity = messages.find(m => m.id === messageId);

      if (!messageWithIdentity) {
        throw new Error('Failed to retrieve approved message with identity');
      }

      const channelRoom = getChannelRoom(message.channel_id);
      getIO().to(channelRoom).emit('new_message', {
        message: messageWithIdentity
      });

      console.log(`Message ${messageId} approved and broadcast to channel ${message.channel_id}`);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: error.message
        });
        return;
      }
      
      console.error('Error in handleApproveMessage:', error);
      socket.emit('error', {
        code: 'APPROVE_MESSAGE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to approve message'
      });
    }
  }

  async handleRejectMessage(socket: Socket, data: RejectMessageData): Promise<void> {
    try {
      const { messageId, userId } = data;
      const anonUserId = socket.data.anonUserId;

      // Verify this is a channel owner, not an anonymous user
      verifyChannelOwner(userId, anonUserId);

      const message = await this.messageService.getMessageById(messageId);
      if (!message) {
        socket.emit('error', {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message does not exist'
        });
        return;
      }

      const channel = await this.channelService.getChannelById(message.channel_id);
      if (!channel) {
        socket.emit('error', {
          code: 'CHANNEL_NOT_FOUND',
          message: 'Channel does not exist'
        });
        return;
      }

      // Verify the user owns the channel
      verifyChannelOwnership(channel, userId);

      const senderId = message.anon_user_id;

      await this.messageService.rejectMessage(messageId);

      const channelRoom = getChannelRoom(message.channel_id);
      const socketsInRoom = await getIO().in(channelRoom).fetchSockets();
      
      for (const sock of socketsInRoom) {
        if (sock.data.anonUserId === senderId) {
          sock.emit('message_rejected', {
            messageId
          });
        }
      }

      console.log(`Message ${messageId} rejected and sender notified`);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: error.message
        });
        return;
      }
      
      console.error('Error in handleRejectMessage:', error);
      socket.emit('error', {
        code: 'REJECT_MESSAGE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reject message'
      });
    }
  }
}
