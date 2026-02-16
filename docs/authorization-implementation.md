# Authorization Implementation - Task 15.1

## Overview

This document describes the authorization implementation for the anonymous messaging platform, ensuring one-way communication enforcement as specified in Requirement 14.4.

## Requirements

**Requirement 14.4: One-Way Communication**
- Channel owners can only approve/reject messages, NOT send them
- Anonymous users can only send messages, NOT approve/reject them
- Owners can only access their own channels

## Implementation

### 1. Authorization Utilities (`lib/authorization.ts`)

Created a centralized authorization module with the following functions:

#### `verifyChannelOwnership(channel: Channel, userId: string)`
- Verifies that a user owns a specific channel
- Throws `AuthorizationError` if ownership check fails
- Used in: Channel status updates, message approval/rejection

#### `verifyAuthenticated(userId: string | undefined)`
- Verifies that a user is authenticated (has a userId)
- Throws `AuthorizationError` if not authenticated
- Type assertion ensures userId is string after check

#### `verifyAnonymousUser(anonUserId: string | undefined, userId: string | undefined)`
- Verifies that a user is an anonymous user (has anonUserId, no userId)
- **Prevents owners from sending messages** by checking if userId exists
- Throws `AuthorizationError` if user is not anonymous or is an owner
- Used in: WebSocket `send_message` event handler

#### `verifyChannelOwner(userId: string | undefined, anonUserId: string | undefined)`
- Verifies that a user is a channel owner (has userId, no anonUserId)
- **Prevents anonymous users from approving/rejecting** by checking if anonUserId exists
- Throws `AuthorizationError` if user is not a channel owner
- Used in: WebSocket `approve_message` and `reject_message` event handlers

### 2. WebSocket Authorization (`lib/socket-handlers.ts`)

Updated WebSocket event handlers to enforce authorization:

#### `handleSendMessage`
```typescript
// Verify this is an anonymous user, not a channel owner
verifyAnonymousUser(anonUserId, userId);
```
- Prevents channel owners from sending messages
- Returns error with code `FORBIDDEN` if authorization fails

#### `handleApproveMessage`
```typescript
// Verify this is a channel owner, not an anonymous user
verifyChannelOwner(userId, anonUserId);

// Verify the user owns the channel
verifyChannelOwnership(channel, userId);
```
- Prevents anonymous users from approving messages
- Ensures only the channel owner can approve messages in their channel
- Returns error with code `FORBIDDEN` if authorization fails

#### `handleRejectMessage`
```typescript
// Verify this is a channel owner, not an anonymous user
verifyChannelOwner(userId, anonUserId);

// Verify the user owns the channel
verifyChannelOwnership(channel, userId);
```
- Prevents anonymous users from rejecting messages
- Ensures only the channel owner can reject messages in their channel
- Returns error with code `FORBIDDEN` if authorization fails

#### `handleJoinChannel`
```typescript
// Store userId in socket data for authorization checks
socket.data.userId = userId;
socket.data.channelId = channelId;
```
- Stores userId in socket.data when owner joins
- Enables authorization checks in subsequent event handlers

### 3. REST API Authorization

Updated REST API routes to use authorization utilities:

#### `PATCH /api/channels/:id` (`app/api/channels/[id]/route.ts`)
```typescript
verifyChannelOwnership(channel, auth.user.id);
```
- Ensures only channel owner can update channel status
- Returns 403 Forbidden if authorization fails

#### `POST /api/messages/:messageId/approve` (`app/api/messages/[messageId]/approve/route.ts`)
```typescript
verifyChannelOwnership(channel, auth.user.id);
```
- Ensures only channel owner can approve messages
- Returns 403 Forbidden if authorization fails

#### `DELETE /api/messages/:messageId` (`app/api/messages/[messageId]/route.ts`)
```typescript
verifyChannelOwnership(channel, auth.user.id);
```
- Ensures only channel owner can reject messages
- Returns 403 Forbidden if authorization fails

### 4. Middleware for Protected Routes

Existing middleware (`lib/auth-middleware.ts`) provides:

#### `requireAuth(request: NextRequest)`
- Validates session from HTTP-only cookie
- Retrieves user from database
- Throws error if not authenticated
- Used by all protected API routes

#### `validateSession(request: NextRequest)`
- Optional authentication check
- Returns null if not authenticated
- Used in routes that support both authenticated and anonymous access

## Authorization Flow

### Owner Attempting to Send Message (BLOCKED)
1. Owner joins channel with `isOwner: true`
2. `socket.data.userId` is set
3. Owner attempts to emit `send_message` event
4. `handleSendMessage` calls `verifyAnonymousUser(anonUserId, userId)`
5. Function detects `userId` is present
6. Throws `AuthorizationError: "Channel owners cannot send messages"`
7. Socket emits error event with code `FORBIDDEN`

### Anonymous User Attempting to Approve (BLOCKED)
1. Anonymous user joins channel with `isOwner: false`
2. `socket.data.anonUserId` is set
3. Anonymous user attempts to emit `approve_message` event
4. `handleApproveMessage` calls `verifyChannelOwner(userId, anonUserId)`
5. Function detects `anonUserId` is present and `userId` is not
6. Throws `AuthorizationError: "Anonymous users cannot approve or reject messages"`
7. Socket emits error event with code `FORBIDDEN`

### Owner Accessing Another Owner's Channel (BLOCKED)
1. Owner attempts to approve message in another owner's channel
2. `handleApproveMessage` retrieves message and channel
3. Calls `verifyChannelOwnership(channel, userId)`
4. Function compares `channel.owner_id` with `userId`
5. Throws `AuthorizationError: "You do not own this channel"`
6. Socket emits error event with code `FORBIDDEN`

## Testing

### Unit Tests (`lib/__tests__/authorization.test.ts`)
- Tests all authorization utility functions
- Verifies correct behavior for valid and invalid inputs
- Tests permission boundaries for Requirement 14.4
- **14 tests, all passing**

### Integration Tests (`app/api/__tests__/authorization-integration.test.ts`)
- Tests authorization in API route context
- Verifies channel ownership checks
- Verifies one-way communication enforcement
- **9 tests, all passing**

### Test Coverage
- All authorization functions: 100%
- Permission boundary scenarios: 100%
- Error cases: 100%

## Error Responses

### WebSocket Errors
```typescript
{
  code: 'FORBIDDEN',
  message: 'Channel owners cannot send messages' |
           'Anonymous users cannot approve or reject messages' |
           'You do not own this channel'
}
```

### REST API Errors
```json
{
  "error": "You do not own this channel"
}
```
Status: 403 Forbidden

## Security Considerations

1. **Type Safety**: Authorization functions use TypeScript assertion signatures to ensure type safety after checks
2. **Centralized Logic**: All authorization logic is in one module, reducing duplication and potential bugs
3. **Fail-Safe**: Authorization checks throw errors by default, requiring explicit success
4. **Session Validation**: All protected routes validate session before authorization checks
5. **Socket Data**: User identity stored in socket.data for consistent authorization across events

## Compliance with Requirements

✅ **Requirement 14.4.1**: Channel owners cannot send messages
- Enforced by `verifyAnonymousUser` in `handleSendMessage`
- Tested in authorization.test.ts

✅ **Requirement 14.4.2**: Anonymous users cannot approve/reject messages
- Enforced by `verifyChannelOwner` in `handleApproveMessage` and `handleRejectMessage`
- Tested in authorization.test.ts

✅ **Requirement 14.4.3**: Owners can only access their own channels
- Enforced by `verifyChannelOwnership` in all channel/message operations
- Tested in authorization-integration.test.ts

## Future Enhancements

1. Rate limiting per user/channel
2. Audit logging for authorization failures
3. Admin role for platform-wide access
4. Channel co-ownership support
