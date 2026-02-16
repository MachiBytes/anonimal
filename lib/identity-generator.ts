import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './db';
import { AnonymousUser } from '@/types/database';

interface IdentityConfig {
  animalNames: string[];
  iconUrls: string[];
}

const BACKGROUND_COLORS = [
  'rgb(0,163,187)',
  'rgb(161,60,180)',
  'rgb(166,50,50)',
  'rgb(241,118,167)',
  'rgb(253,87,61)',
  'rgb(255,0,122)',
  'rgb(255,0,26)',
  'rgb(27,136,122)',
  'rgb(31,161,93)',
  'rgb(93,175,221)',
  'rgb(99,120,47)'
];

let identityConfig: IdentityConfig | null = null;

function loadIdentityConfig(): IdentityConfig {
  if (!identityConfig) {
    const configPath = join(process.cwd(), 'config', 'anonymous-identities.json');
    const configData = readFileSync(configPath, 'utf-8');
    identityConfig = JSON.parse(configData);
  }
  return identityConfig!;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export class AnonymousUserRepository {
  async findByChannelAndSession(channelId: string, sessionId: string): Promise<AnonymousUser | null> {
    const result = await query(
      `SELECT id, channel_id, session_id, name, icon_url, icon_background_color, created_at
       FROM anonymous_users
       WHERE channel_id = $1 AND session_id = $2`,
      [channelId, sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as AnonymousUser;
  }

  async create(
    channelId: string,
    sessionId: string,
    name: string,
    iconUrl: string,
    iconBackgroundColor: string
  ): Promise<AnonymousUser> {
    const result = await query(
      `INSERT INTO anonymous_users (channel_id, session_id, name, icon_url, icon_background_color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, channel_id, session_id, name, icon_url, icon_background_color, created_at`,
      [channelId, sessionId, name, iconUrl, iconBackgroundColor]
    );

    return result.rows[0] as AnonymousUser;
  }
}

export class IdentityGenerator {
  private repository: AnonymousUserRepository;

  constructor(repository?: AnonymousUserRepository) {
    this.repository = repository || new AnonymousUserRepository();
  }

  async getOrCreateIdentity(channelId: string, sessionId: string): Promise<AnonymousUser> {
    // Check if identity already exists for this session
    const existingIdentity = await this.repository.findByChannelAndSession(channelId, sessionId);
    
    if (existingIdentity) {
      return existingIdentity;
    }

    // Generate new identity
    const config = loadIdentityConfig();
    const name = `Anonymous ${getRandomElement(config.animalNames)}`;
    const iconUrl = getRandomElement(config.iconUrls);
    const iconBackgroundColor = getRandomElement(BACKGROUND_COLORS);

    // Create and return new identity
    return await this.repository.create(channelId, sessionId, name, iconUrl, iconBackgroundColor);
  }
}
