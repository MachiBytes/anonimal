/**
 * Authorization utilities for enforcing permission boundaries
 * 
 * Requirements 14.4: One-way communication enforcement
 * - Channel owners can only approve/reject messages, not send them
 * - Anonymous users can only send messages, not approve/reject them
 * - Owners can only access their own channels
 */

import { Channel } from '@/types/database';

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Verify that a user owns a specific channel
 * @throws AuthorizationError if user does not own the channel
 */
export function verifyChannelOwnership(channel: Channel, userId: string): void {
  if (channel.owner_id !== userId) {
    throw new AuthorizationError('You do not own this channel');
  }
}

/**
 * Verify that a user is authenticated (has a userId)
 * @throws AuthorizationError if user is not authenticated
 */
export function verifyAuthenticated(userId: string | undefined): asserts userId is string {
  if (!userId) {
    throw new AuthorizationError('Authentication required');
  }
}

/**
 * Verify that a user is an anonymous user (has an anonUserId but no userId)
 * @throws AuthorizationError if user is not anonymous
 */
export function verifyAnonymousUser(anonUserId: string | undefined, userId: string | undefined): asserts anonUserId is string {
  if (userId) {
    throw new AuthorizationError('Channel owners cannot send messages');
  }
  if (!anonUserId) {
    throw new AuthorizationError('Anonymous user identity required');
  }
}

/**
 * Verify that a user is a channel owner (has userId, not anonUserId)
 * @throws AuthorizationError if user is not a channel owner
 */
export function verifyChannelOwner(userId: string | undefined, anonUserId: string | undefined): asserts userId is string {
  if (anonUserId && !userId) {
    throw new AuthorizationError('Anonymous users cannot approve or reject messages');
  }
  if (!userId) {
    throw new AuthorizationError('Channel owner authentication required');
  }
}
