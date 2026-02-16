# WebSocket API Documentation

## Overview

The anonymous messaging platform uses Socket.io for real-time communication between clients and the server. This document describes the WebSocket events and their usage.

## Connection

Connect to the Socket.io server at the same URL as the HTTP server:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling']
});
```

## Client → Server Events

### join_channel

Join a channel as either an owner or anonymous user.

**Payload:**
```typescript
{
  channelId: string;
  sessionId: string;
  isOwner: boolean;
  userId?: string; // Required if isOwner is true
}
```

**Response Events:**
- `joined_channel` - Successfully joined
- `identity_assigned` - Anonymous user identity (for non-owners)
- `error` - Failed to join

### send_message

Send a message to a channel (anonymous users only).

**Payload:**
```typescript
{
  channelId: string;
  content: string;
  sessionId: string;
}
```

**Response Events:**
- `message_sent` - Message created successfully
- `error` - Failed to send message

### approve_message

Approve a pending message (channel owners only).

**Payload:**
```typescript
{
  messageId: string;
  userId: string;
}
```

**Response Events:**
- `new_message` - Broadcast to all channel users
- `error` - Failed to approve

### reject_message

Reject a pending message (channel owners only).

**Payload:**
```typescript
{
  messageId: string;
  userId: string;
}
```

**Response Events:**
- `message_rejected` - Sent to message sender
- `error` - Failed to reject

## Server → Client Events

### joined_channel

Emitted when successfully joined a channel.

**Payload:**
```typescript
{
  channelId: string;
  isOwner: boolean;
  channel: Channel;
}
```

### identity_assigned

Emitted to anonymous users with their assigned identity.

**Payload:**
```typescript
{
  anonUser: {
    id: string;
    name: string;
    icon_url: string;
    icon_background_color: string;
  }
}
```

### message_sent

Emitted to sender when message is created.

**Payload:**
```typescript
{
  message: MessageWithIdentity;
}
```

### message_pending

Emitted to channel owner when new message arrives.

**Payload:**
```typescript
{
  message: MessageWithIdentity;
}
```

### new_message

Broadcast to all channel users when message is approved.

**Payload:**
```typescript
{
  message: MessageWithIdentity;
}
```

### message_rejected

Emitted to sender when their message is rejected.

**Payload:**
```typescript
{
  messageId: string;
}
```

### channel_closed

Broadcast when channel is closed.

**Payload:**
```typescript
{
  channelId: string;
}
```

### channel_opened

Broadcast when channel is reopened.

**Payload:**
```typescript
{
  channelId: string;
}
```

### error

Emitted when an error occurs.

**Payload:**
```typescript
{
  code: string;
  message: string;
}
```

## Room Structure

- `channel:{channelId}` - All users in a channel
- `owner:{channelId}` - Channel owner only

## Error Codes

- `CHANNEL_NOT_FOUND` - Channel does not exist
- `UNAUTHORIZED` - Not authorized for this action
- `NOT_AUTHENTICATED` - Must join channel first
- `CHANNEL_CLOSED` - Channel is closed
- `MESSAGE_NOT_FOUND` - Message does not exist
- `JOIN_CHANNEL_ERROR` - Failed to join channel
- `SEND_MESSAGE_ERROR` - Failed to send message
- `APPROVE_MESSAGE_ERROR` - Failed to approve message
- `REJECT_MESSAGE_ERROR` - Failed to reject message
