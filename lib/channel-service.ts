import { query } from './db';
import { Channel } from '@/types/database';

const ALPHANUMERIC_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const MAX_COLLISION_RETRIES = 5;

function getRandomChar(): string {
  return ALPHANUMERIC_CHARS[Math.floor(Math.random() * ALPHANUMERIC_CHARS.length)];
}

function generateCodeFormat(): string {
  const part1 = Array.from({ length: 3 }, () => getRandomChar()).join('');
  const part2 = Array.from({ length: 3 }, () => getRandomChar()).join('');
  return `${part1}-${part2}`;
}

export class ChannelRepository {
  async findByCode(code: string): Promise<Channel | null> {
    const result = await query(
      `SELECT id, owner_id, name, code, status, created_at
       FROM channels
       WHERE code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Channel;
  }

  async findByOwnerId(ownerId: string): Promise<Channel[]> {
    const result = await query(
      `SELECT c.id, c.owner_id, c.name, c.code, c.status, c.created_at
       FROM channels c
       WHERE c.owner_id = $1
       ORDER BY c.created_at DESC`,
      [ownerId]
    );

    return result.rows as Channel[];
  }

  async create(ownerId: string, name: string, code: string): Promise<Channel> {
    const result = await query(
      `INSERT INTO channels (owner_id, name, code, status)
       VALUES ($1, $2, $3, 'open')
       RETURNING id, owner_id, name, code, status, created_at`,
      [ownerId, name, code]
    );

    return result.rows[0] as Channel;
  }

  async updateStatus(channelId: string, status: 'open' | 'closed'): Promise<Channel> {
    const result = await query(
      `UPDATE channels
       SET status = $1
       WHERE id = $2
       RETURNING id, owner_id, name, code, status, created_at`,
      [status, channelId]
    );

    if (result.rows.length === 0) {
      throw new Error('Channel not found');
    }

    return result.rows[0] as Channel;
  }

  async findById(channelId: string): Promise<Channel | null> {
    const result = await query(
      `SELECT id, owner_id, name, code, status, created_at
       FROM channels
       WHERE id = $1`,
      [channelId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Channel;
  }
}

export class ChannelService {
  private repository: ChannelRepository;

  constructor(repository?: ChannelRepository) {
    this.repository = repository || new ChannelRepository();
  }

  async generateUniqueChannelCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
      const code = generateCodeFormat();
      
      // Check if code already exists
      const existingChannel = await this.repository.findByCode(code);
      
      if (!existingChannel) {
        return code;
      }
    }

    throw new Error('Failed to generate unique channel code after maximum retries');
  }

  async createChannel(ownerId: string, name: string): Promise<Channel> {
    const code = await this.generateUniqueChannelCode();
    return await this.repository.create(ownerId, name, code);
  }

  async getChannelByCode(code: string): Promise<Channel | null> {
    return await this.repository.findByCode(code);
  }

  async getChannelsByOwner(ownerId: string): Promise<Channel[]> {
    return await this.repository.findByOwnerId(ownerId);
  }

  async updateChannelStatus(channelId: string, status: 'open' | 'closed'): Promise<Channel> {
    return await this.repository.updateStatus(channelId, status);
  }

  async getChannelById(channelId: string): Promise<Channel | null> {
    return await this.repository.findById(channelId);
  }
}
