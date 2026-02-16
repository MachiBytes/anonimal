import { query } from './db';
import { Message, MessageWithIdentity } from '@/types/database';

export interface PaginatedMessages {
  messages: MessageWithIdentity[];
  hasMore: boolean;
  cursor: string | null;
}

interface MessageRow {
  id: string;
  channel_id: string;
  anon_user_id: string;
  content: string;
  status: 'approved' | 'pending' | 'rejected';
  sent_at: Date;
  approved_at: Date | null;
  name: string;
  icon_url: string;
  icon_background_color: string;
}

export class MessageRepository {
  /**
   * Create a new message with pending status
   */
  async create(
    channelId: string,
    anonUserId: string,
    content: string
  ): Promise<Message> {
    const result = await query(
      `INSERT INTO messages (channel_id, anon_user_id, content, status, sent_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING id, channel_id, anon_user_id, content, status, sent_at, approved_at`,
      [channelId, anonUserId, content]
    );

    return result.rows[0] as Message;
  }

  /**
   * Approve a message by updating status and setting approval timestamp
   */
  async approve(messageId: string): Promise<Message> {
    const result = await query(
      `UPDATE messages
       SET status = 'approved', approved_at = NOW()
       WHERE id = $1
       RETURNING id, channel_id, anon_user_id, content, status, sent_at, approved_at`,
      [messageId]
    );

    if (result.rows.length === 0) {
      throw new Error('Message not found');
    }

    return result.rows[0] as Message;
  }

  /**
   * Reject a message by deleting it from the database
   */
  async reject(messageId: string): Promise<void> {
    await query(
      `DELETE FROM messages WHERE id = $1`,
      [messageId]
    );
  }

  /**
   * Get message by ID
   */
  async findById(messageId: string): Promise<Message | null> {
    const result = await query(
      `SELECT id, channel_id, anon_user_id, content, status, sent_at, approved_at
       FROM messages
       WHERE id = $1`,
      [messageId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Message;
  }

  /**
   * Get initial message history (15 most recent approved messages, oldest first)
   */
  async getInitialHistory(channelId: string): Promise<MessageWithIdentity[]> {
    const result = await query(
      `SELECT 
         m.id, m.channel_id, m.anon_user_id, m.content, m.status, m.sent_at, m.approved_at,
         au.name, au.icon_url, au.icon_background_color
       FROM messages m
       JOIN anonymous_users au ON m.anon_user_id = au.id
       WHERE m.channel_id = $1 AND m.status = 'approved'
       ORDER BY m.approved_at ASC
       LIMIT 15`,
      [channelId]
    );

    return (result.rows as MessageRow[]).map((row) => ({
      id: row.id,
      channel_id: row.channel_id,
      anon_user_id: row.anon_user_id,
      content: row.content,
      status: row.status,
      sent_at: row.sent_at,
      approved_at: row.approved_at,
      anon_user: {
        name: row.name,
        icon_url: row.icon_url,
        icon_background_color: row.icon_background_color
      }
    }));
  }

  /**
   * Get paginated message history (10 older messages before cursor)
   */
  async getPaginatedHistory(
    channelId: string,
    cursor: string
  ): Promise<PaginatedMessages> {
    const result = await query(
      `SELECT 
         m.id, m.channel_id, m.anon_user_id, m.content, m.status, m.sent_at, m.approved_at,
         au.name, au.icon_url, au.icon_background_color
       FROM messages m
       JOIN anonymous_users au ON m.anon_user_id = au.id
       WHERE m.channel_id = $1 
         AND m.status = 'approved'
         AND m.approved_at < $2
       ORDER BY m.approved_at DESC
       LIMIT 11`,
      [channelId, cursor]
    );

    // Reverse to get oldest first
    const messages = (result.rows as MessageRow[]).slice(0, 10).reverse().map((row) => ({
      id: row.id,
      channel_id: row.channel_id,
      anon_user_id: row.anon_user_id,
      content: row.content,
      status: row.status,
      sent_at: row.sent_at,
      approved_at: row.approved_at,
      anon_user: {
        name: row.name,
        icon_url: row.icon_url,
        icon_background_color: row.icon_background_color
      }
    }));

    const hasMore = result.rows.length > 10;
    const newCursor = messages.length > 0 ? messages[0].approved_at?.toISOString() || null : null;

    return {
      messages,
      hasMore,
      cursor: newCursor
    };
  }

  /**
   * Get messages for anonymous user view (all approved + own pending, oldest first)
   */
  async getMessagesForAnonymousUser(
    channelId: string,
    anonUserId: string
  ): Promise<MessageWithIdentity[]> {
    const result = await query(
      `SELECT 
         m.id, m.channel_id, m.anon_user_id, m.content, m.status, m.sent_at, m.approved_at,
         au.name, au.icon_url, au.icon_background_color
       FROM messages m
       JOIN anonymous_users au ON m.anon_user_id = au.id
       WHERE m.channel_id = $1 
         AND (m.status = 'approved' OR (m.status = 'pending' AND m.anon_user_id = $2))
       ORDER BY 
         CASE WHEN m.status = 'pending' THEN m.sent_at ELSE m.approved_at END ASC`,
      [channelId, anonUserId]
    );

    return (result.rows as MessageRow[]).map((row) => ({
      id: row.id,
      channel_id: row.channel_id,
      anon_user_id: row.anon_user_id,
      content: row.content,
      status: row.status,
      sent_at: row.sent_at,
      approved_at: row.approved_at,
      anon_user: {
        name: row.name,
        icon_url: row.icon_url,
        icon_background_color: row.icon_background_color
      }
    }));
  }

  /**
   * Get all messages for channel owner (all pending and approved, oldest first)
   */
  async getMessagesForOwner(channelId: string): Promise<MessageWithIdentity[]> {
    const result = await query(
      `SELECT 
         m.id, m.channel_id, m.anon_user_id, m.content, m.status, m.sent_at, m.approved_at,
         au.name, au.icon_url, au.icon_background_color
       FROM messages m
       JOIN anonymous_users au ON m.anon_user_id = au.id
       WHERE m.channel_id = $1 AND m.status IN ('pending', 'approved')
       ORDER BY 
         CASE WHEN m.status = 'pending' THEN m.sent_at ELSE m.approved_at END ASC`,
      [channelId]
    );

    return (result.rows as MessageRow[]).map((row) => ({
      id: row.id,
      channel_id: row.channel_id,
      anon_user_id: row.anon_user_id,
      content: row.content,
      status: row.status,
      sent_at: row.sent_at,
      approved_at: row.approved_at,
      anon_user: {
        name: row.name,
        icon_url: row.icon_url,
        icon_background_color: row.icon_background_color
      }
    }));
  }
}

export class MessageService {
  private repository: MessageRepository;

  constructor(repository?: MessageRepository) {
    this.repository = repository || new MessageRepository();
  }

  /**
   * Submit a new message to a channel
   */
  async submitMessage(
    channelId: string,
    anonUserId: string,
    content: string
  ): Promise<Message> {
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    return await this.repository.create(channelId, anonUserId, content);
  }

  /**
   * Approve a pending message
   */
  async approveMessage(messageId: string): Promise<Message> {
    const message = await this.repository.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.status !== 'pending') {
      throw new Error('Only pending messages can be approved');
    }

    return await this.repository.approve(messageId);
  }

  /**
   * Reject a pending message
   */
  async rejectMessage(messageId: string): Promise<void> {
    const message = await this.repository.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.status !== 'pending') {
      throw new Error('Only pending messages can be rejected');
    }

    await this.repository.reject(messageId);
  }

  /**
   * Get initial message history for a channel (15 most recent approved)
   */
  async getInitialHistory(channelId: string): Promise<MessageWithIdentity[]> {
    return await this.repository.getInitialHistory(channelId);
  }

  /**
   * Get paginated message history
   */
  async getPaginatedHistory(
    channelId: string,
    cursor: string
  ): Promise<PaginatedMessages> {
    return await this.repository.getPaginatedHistory(channelId, cursor);
  }

  /**
   * Get messages visible to an anonymous user
   * (all approved messages + their own pending messages)
   */
  async getMessagesForAnonymousUser(
    channelId: string,
    anonUserId: string
  ): Promise<MessageWithIdentity[]> {
    return await this.repository.getMessagesForAnonymousUser(channelId, anonUserId);
  }

  /**
   * Get all messages for channel owner
   * (all pending and approved messages)
   */
  async getMessagesForOwner(channelId: string): Promise<MessageWithIdentity[]> {
    return await this.repository.getMessagesForOwner(channelId);
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string): Promise<Message | null> {
    return await this.repository.findById(messageId);
  }
}
