/**
 * Tests for authorization utilities
 * Validates: Requirements 14.4 - One-way communication enforcement
 */

import {
  verifyChannelOwnership,
  verifyAuthenticated,
  verifyAnonymousUser,
  verifyChannelOwner,
  AuthorizationError,
} from '../authorization';
import { Channel } from '@/types/database';

describe('Authorization Utilities', () => {
  describe('verifyChannelOwnership', () => {
    it('should not throw when user owns the channel', () => {
      const channel: Channel = {
        id: 'channel-1',
        owner_id: 'user-1',
        name: 'Test Channel',
        code: 'abc-123',
        status: 'open',
        created_at: new Date(),
      };

      expect(() => verifyChannelOwnership(channel, 'user-1')).not.toThrow();
    });

    it('should throw AuthorizationError when user does not own the channel', () => {
      const channel: Channel = {
        id: 'channel-1',
        owner_id: 'user-1',
        name: 'Test Channel',
        code: 'abc-123',
        status: 'open',
        created_at: new Date(),
      };

      expect(() => verifyChannelOwnership(channel, 'user-2')).toThrow(
        AuthorizationError
      );
      expect(() => verifyChannelOwnership(channel, 'user-2')).toThrow(
        'You do not own this channel'
      );
    });
  });

  describe('verifyAuthenticated', () => {
    it('should not throw when userId is provided', () => {
      expect(() => verifyAuthenticated('user-1')).not.toThrow();
    });

    it('should throw AuthorizationError when userId is undefined', () => {
      expect(() => verifyAuthenticated(undefined)).toThrow(AuthorizationError);
      expect(() => verifyAuthenticated(undefined)).toThrow(
        'Authentication required'
      );
    });
  });

  describe('verifyAnonymousUser', () => {
    it('should not throw when anonUserId is provided and userId is not', () => {
      expect(() => verifyAnonymousUser('anon-1', undefined)).not.toThrow();
    });

    it('should throw AuthorizationError when userId is provided (owner trying to send message)', () => {
      expect(() => verifyAnonymousUser('anon-1', 'user-1')).toThrow(
        AuthorizationError
      );
      expect(() => verifyAnonymousUser('anon-1', 'user-1')).toThrow(
        'Channel owners cannot send messages'
      );
    });

    it('should throw AuthorizationError when anonUserId is undefined', () => {
      expect(() => verifyAnonymousUser(undefined, undefined)).toThrow(
        AuthorizationError
      );
      expect(() => verifyAnonymousUser(undefined, undefined)).toThrow(
        'Anonymous user identity required'
      );
    });
  });

  describe('verifyChannelOwner', () => {
    it('should not throw when userId is provided and anonUserId is not', () => {
      expect(() => verifyChannelOwner('user-1', undefined)).not.toThrow();
    });

    it('should throw AuthorizationError when anonUserId is provided (anonymous user trying to approve)', () => {
      expect(() => verifyChannelOwner(undefined, 'anon-1')).toThrow(
        AuthorizationError
      );
      expect(() => verifyChannelOwner(undefined, 'anon-1')).toThrow(
        'Anonymous users cannot approve or reject messages'
      );
    });

    it('should throw AuthorizationError when userId is undefined', () => {
      expect(() => verifyChannelOwner(undefined, undefined)).toThrow(
        AuthorizationError
      );
      expect(() => verifyChannelOwner(undefined, undefined)).toThrow(
        'Channel owner authentication required'
      );
    });
  });

  describe('Permission Boundaries - Requirement 14.4', () => {
    it('should prevent owners from sending messages', () => {
      // Owner has userId but tries to send message (needs anonUserId)
      expect(() => verifyAnonymousUser(undefined, 'user-1')).toThrow(
        'Channel owners cannot send messages'
      );
    });

    it('should prevent anonymous users from approving messages', () => {
      // Anonymous user has anonUserId but tries to approve (needs userId)
      expect(() => verifyChannelOwner(undefined, 'anon-1')).toThrow(
        'Anonymous users cannot approve or reject messages'
      );
    });

    it('should allow owners to approve messages', () => {
      // Owner has userId and no anonUserId
      expect(() => verifyChannelOwner('user-1', undefined)).not.toThrow();
    });

    it('should allow anonymous users to send messages', () => {
      // Anonymous user has anonUserId and no userId
      expect(() => verifyAnonymousUser('anon-1', undefined)).not.toThrow();
    });
  });
});
