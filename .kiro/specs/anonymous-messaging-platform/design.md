# Design Document: Anonymous Messaging Platform

## Overview

This document describes the technical design for an anonymous messaging platform built as a Next.js monolithic application. The system enables Channel Owners to receive moderated feedback from Anonymous Users through unique channel codes. The architecture uses Next.js API routes for REST endpoints, Socket.io for real-time messaging, Amazon Cognito for authentication, and PostgreSQL for data persistence.

The design emphasizes simplicity and minimal infrastructure footprint while supporting 100 concurrent users with sub-second message delivery latency.

## Architecture

### System Architecture

The application follows a monolithic Next.js architecture with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Application                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)                                            │
│  - Landing Page (login or join as guest)                    │
│  - Channel Owner Dashboard                                   │
│  - Anonymous User Channel View                               │
│  - Authentication UI                                         │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Next.js API Routes)                             │
│  - REST endpoints for CRUD operations                        │
│  - Cognito callback handler                                  │
│  - Session management                                        │
├─────────────────────────────────────────────────────────────┤
│  WebSocket Layer (Socket.io)                                │
│  - Real-time message delivery                                │
│  - Channel room management                                   │
│  - Event broadcasting                                        │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                        │
│  - Channel management                                        │
│  - Message approval workflow                                 │
│  - Anonymous identity generation                             │
├─────────────────────────────────────────────────────────────┤
│  Data Access Layer                                          │
│  - PostgreSQL queries                                        │
│  - Database connection pooling                               │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌──────────────────┐              ┌──────────────────┐
│  Amazon Cognito  │              │   PostgreSQL     │
│  (Authentication)│              │   (AWS RDS)      │
└──────────────────┘              └──────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 14+ with React, TypeScript
- **Backend**: Next.js API Routes
- **Real-time**: Socket.io (WebSocket library)
- **Database**: PostgreSQL on AWS RDS
- **Authentication**: Amazon Cognito with Hosted Login
- **Deployment**: Docker container
- **ORM/Query Builder**: pg (node-postgres) for direct SQL queries

### Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Docker Container                 │
│  ┌───────────────────────────────────┐  │
│  │     Next.js Application           │  │
│  │  - HTTP Server (port 3000)        │  │
│  │  - Socket.io Server (same port)   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │              │
              ▼              ▼
    ┌──────────────┐  ┌──────────────┐
    │   Cognito    │  │  PostgreSQL  │
    │   (AWS)      │  │  (AWS RDS)   │
    └──────────────┘  └──────────────┘
```

## Components and Interfaces

### 0. Landing Page Module

**Purpose**: Provide entry point for visitors to choose between owner login or guest access

**Components**:
- `LandingPage`: React component for the home page
- `ChannelCodeInput`: Component for entering channel code as guest

**Interfaces**:

```typescript
interface LandingPageProps {
  // No props needed - static page
}

interface ChannelCodeInputProps {
  onSubmit: (code: string) => void;
  error?: string;
}
```

**User Flow**:
```
1. Visitor lands on / (root URL)
2. See two options:
   a. "Login as User" button → Redirects to /api/auth/login → Cognito
   b. "Join Channel as Guest" button → Shows channel code input
3. If guest path:
   a. Enter channel code (format: xxx-xxx)
   b. Validate format client-side
   c. Submit to /api/channels/:code
   d. If valid → Redirect to /channel/:code
   e. If invalid → Show error message
```

**UI Design**:
- Simple, clean interface
- Two prominent buttons centered on page
- Channel code input appears below "Join as Guest" button when clicked
- Input validates format (xxx-xxx) with real-time feedback
- Error messages displayed inline

### 1. Authentication Module

**Purpose**: Handle Amazon Cognito authentication for Channel Owners

**Components**:
- `CognitoAuthHandler`: Processes Cognito OAuth callbacks
- `SessionManager`: Manages user sessions using HTTP-only cookies
- `AuthMiddleware`: Validates authentication for protected routes

**Interfaces**:

```typescript
interface User {
  id: string;              // UUID
  fullName: string;
  email: string;
  cognitoId: string;       // Cognito user sub
  createdAt: Date;
}

interface Session {
  userId: string;
  cognitoAccessToken: string;
  expiresAt: Date;
}

interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  domain: string;
  redirectUri: string;
}
```

**Authentication Flow**:
1. User clicks "Login" → Redirect to Cognito Hosted UI
2. User authenticates with Cognito
3. Cognito redirects to `/api/auth/cognito-callback` with authorization code
4. Exchange code for tokens using Cognito Token endpoint
5. Extract user info from ID token
6. Create/update user in database
7. Create session and set HTTP-only cookie
8. Redirect to dashboard

### 2. Channel Management Module

**Purpose**: Handle channel creation, lookup, and status management

**Components**:
- `ChannelService`: Business logic for channel operations
- `CodeGenerator`: Generates unique 6-character channel codes
- `ChannelRepository`: Database operations for channels

**Interfaces**:

```typescript
interface Channel {
  id: string;              // UUID
  ownerId: string;         // Foreign key to User
  name: string;
  code: string;            // Format: xxx-xxx (case-sensitive)
  status: 'open' | 'closed';
  createdAt: Date;
}

interface CreateChannelRequest {
  name: string;
  ownerId: string;
}

interface UpdateChannelStatusRequest {
  channelId: string;
  status: 'open' | 'closed';
}
```

**Code Generation Algorithm**:
```
1. Generate 6 random alphanumeric characters (a-z, A-Z, 0-9)
2. Format as xxx-xxx (3 chars, dash, 3 chars)
3. Check database for uniqueness
4. If collision, retry (max 5 attempts)
5. Return code or throw error if max attempts exceeded
```

**Channel Lookup**:
- Index on `code` column for O(1) lookup
- Case-sensitive comparison using database collation

### 3. Anonymous Identity Module

**Purpose**: Generate and manage anonymous user identities

**Components**:
- `IdentityGenerator`: Creates random anonymous identities
- `IdentityRepository`: Stores and retrieves anonymous user records
- `IdentityConfig`: Loads animal names and icons from JSON file

**Interfaces**:

```typescript
interface AnonymousUser {
  id: string;              // UUID
  channelId: string;       // Foreign key to Channel
  sessionId: string;       // Browser session identifier
  name: string;            // e.g., "Anonymous Panda"
  iconUrl: string;         // URL to animal icon
  iconBackgroundColor: string; // RGB color string
  createdAt: Date;
}

interface IdentityConfig {
  animalNames: string[];   // e.g., ["Panda", "Tiger", "Eagle"]
  iconUrls: string[];      // URLs to icon images
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
```

**Identity Generation Algorithm**:
```
1. Check if sessionId exists for this channel
2. If exists, return existing identity
3. If not exists:
   a. Select random animal name from config
   b. Select random icon URL from config
   c. Select random background color from predefined list
   d. Create AnonymousUser record
   e. Return new identity
```

**Configuration File** (`config/anonymous-identities.json`):
```json
{
  "animalNames": [
    "Panda", "Tiger", "Eagle", "Dolphin", "Fox",
    "Wolf", "Bear", "Lion", "Owl", "Hawk"
  ],
  "iconUrls": [
    "/icons/panda.svg",
    "/icons/tiger.svg",
    "/icons/eagle.svg"
  ]
}
```

### 4. Message Module

**Purpose**: Handle message submission, approval, and retrieval

**Components**:
- `MessageService`: Business logic for message operations
- `MessageRepository`: Database operations for messages
- `MessageValidator`: Validates message content and permissions

**Interfaces**:

```typescript
interface Message {
  id: string;              // UUID
  channelId: string;       // Foreign key to Channel
  anonUserId: string;      // Foreign key to AnonymousUser
  content: string;         // No length limit
  status: 'pending' | 'approved' | 'rejected';
  sentAt: Date;
  approvedAt: Date | null;
}

interface SendMessageRequest {
  channelId: string;
  anonUserId: string;
  content: string;
}

interface ApproveMessageRequest {
  messageId: string;
  ownerId: string;         // For authorization
}

interface MessageWithIdentity extends Message {
  anonUser: {
    name: string;
    iconUrl: string;
    iconBackgroundColor: string;
  };
}

interface PaginatedMessages {
  messages: MessageWithIdentity[];
  hasMore: boolean;
  cursor: string | null;   // For pagination
}
```

**Message Approval Workflow**:
```
1. Anonymous user sends message
2. Create message with status='pending', sentAt=now
3. Emit 'message_pending' event to channel owner via WebSocket
4. Owner sees message in their view
5. Owner clicks approve/reject
6. If approve:
   a. Update status='approved', approvedAt=now
   b. Broadcast 'new_message' to all users in channel
7. If reject:
   a. Delete message from database
   b. Emit 'message_rejected' to sender
```

### 5. WebSocket Module (Socket.io)

**Purpose**: Provide real-time message delivery and channel updates

**Components**:
- `SocketServer`: Socket.io server instance
- `ChannelRoomManager`: Manages Socket.io rooms per channel
- `EventHandlers`: Handle incoming WebSocket events

**Socket.io Events**:

```typescript
// Client → Server Events
interface ClientToServerEvents {
  join_channel: (data: {
    channelId: string;
    sessionId: string;
    isOwner: boolean;
  }) => void;
  
  send_message: (data: {
    channelId: string;
    content: string;
  }) => void;
  
  approve_message: (data: {
    messageId: string;
  }) => void;
  
  reject_message: (data: {
    messageId: string;
  }) => void;
}

// Server → Client Events
interface ServerToClientEvents {
  identity_assigned: (data: {
    anonUser: AnonymousUser;
  }) => void;
  
  message_pending: (data: {
    message: MessageWithIdentity;
  }) => void;
  
  new_message: (data: {
    message: MessageWithIdentity;
  }) => void;
  
  message_rejected: (data: {
    messageId: string;
  }) => void;
  
  channel_closed: (data: {
    channelId: string;
  }) => void;
  
  channel_opened: (data: {
    channelId: string;
  }) => void;
  
  error: (data: {
    message: string;
  }) => void;
}
```

**Room Management**:
- Each channel has a Socket.io room: `channel:{channelId}`
- Channel owners join room: `owner:{channelId}`
- Anonymous users join room: `channel:{channelId}`
- Pending messages only sent to owner room
- Approved messages broadcast to entire channel room

**Connection Flow**:
```
1. Client connects to Socket.io server
2. Client emits 'join_channel' with channelId and sessionId
3. Server validates channel exists
4. If anonymous user:
   a. Generate/retrieve anonymous identity
   b. Join channel room
   c. Emit 'identity_assigned' to client
5. If owner:
   a. Validate ownership
   b. Join owner room and channel room
6. Client is now subscribed to channel events
```

### 6. REST API Module

**Purpose**: Provide HTTP endpoints for CRUD operations

**API Endpoints**:

```typescript
// Authentication
POST   /api/auth/cognito-callback
  Query: { code: string }
  Response: { redirect: string }

GET    /api/auth/session
  Response: { user: User | null }

POST   /api/auth/logout
  Response: { success: boolean }

// Channels
GET    /api/channels
  Headers: { Cookie: session }
  Response: { channels: Channel[] }

POST   /api/channels
  Headers: { Cookie: session }
  Body: { name: string }
  Response: { channel: Channel }

PATCH  /api/channels/:id
  Headers: { Cookie: session }
  Body: { status: 'open' | 'closed' }
  Response: { channel: Channel }

GET    /api/channels/:code
  Response: { channel: Channel }

// Messages
GET    /api/messages/:channelId
  Query: { limit?: number, cursor?: string }
  Response: { messages: MessageWithIdentity[], hasMore: boolean, cursor: string | null }

POST   /api/messages/:messageId/approve
  Headers: { Cookie: session }
  Response: { message: Message }

DELETE /api/messages/:messageId
  Headers: { Cookie: session }
  Response: { success: boolean }
```

**Middleware Stack**:
```
Request → CORS → Body Parser → Session Validator → Route Handler → Response
```

## Data Models

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  cognito_id VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_cognito_id ON users(cognito_id);
CREATE INDEX idx_users_email ON users(email);

-- Channels table
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(7) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_channels_code ON channels(code);
CREATE INDEX idx_channels_owner_id ON channels(owner_id);

-- Anonymous users table
CREATE TABLE anonymous_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  icon_url VARCHAR(500) NOT NULL,
  icon_background_color VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, session_id)
);

CREATE INDEX idx_anon_users_channel_session ON anonymous_users(channel_id, session_id);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  anon_user_id UUID NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP
);

CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_approved_at ON messages(approved_at DESC) WHERE status = 'approved';
```

### Data Access Patterns

**Channel Owner Dashboard**:
```sql
-- Get all channels for owner, sorted by recent activity
SELECT c.*, 
       MAX(m.approved_at) as last_activity
FROM channels c
LEFT JOIN messages m ON c.id = m.channel_id AND m.status = 'approved'
WHERE c.owner_id = $1
GROUP BY c.id
ORDER BY last_activity DESC NULLS LAST;
```

**Message History (Initial Load)**:
```sql
-- Get 15 most recent approved messages with anonymous user info
SELECT m.*, 
       au.name, au.icon_url, au.icon_background_color
FROM messages m
JOIN anonymous_users au ON m.anon_user_id = au.id
WHERE m.channel_id = $1 AND m.status = 'approved'
ORDER BY m.approved_at DESC
LIMIT 15;
```

**Message History (Pagination)**:
```sql
-- Get next 10 messages before cursor
SELECT m.*, 
       au.name, au.icon_url, au.icon_background_color
FROM messages m
JOIN anonymous_users au ON m.anon_user_id = au.id
WHERE m.channel_id = $1 
  AND m.status = 'approved'
  AND m.approved_at < $2
ORDER BY m.approved_at DESC
LIMIT 10;
```

**Owner Message View**:
```sql
-- Get all messages (pending and approved) for owner
SELECT m.*, 
       au.name, au.icon_url, au.icon_background_color
FROM messages m
JOIN anonymous_users au ON m.anon_user_id = au.id
WHERE m.channel_id = $1 AND m.status IN ('pending', 'approved')
ORDER BY 
  CASE WHEN m.status = 'pending' THEN m.sent_at ELSE m.approved_at END DESC;
```

### Connection Pooling

Use `pg.Pool` with the following configuration:
```typescript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                    // Maximum pool size
  idleTimeoutMillis: 30000,   // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Fail fast if can't connect
});
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I've identified several areas where properties can be consolidated:

- **Identity generation properties (4.1, 4.2, 4.3)** can be combined into a single comprehensive property about identity configuration compliance
- **Data completeness properties (15.1-15.4)** can be combined into properties about schema validation
- **Message visibility properties (8.1, 8.2, 8.3)** can be combined into a single property about visibility rules
- **Pagination properties (10.1, 10.2)** are distinct and should remain separate
- **Channel status properties (3.1, 3.2, 3.3)** test different aspects and should remain separate

### Core Properties

**Property 1: Landing page displays required buttons**
*For any* visitor accessing the root URL, the landing page must display both a "Login as User" button and a "Join Channel as Guest" button.
**Validates: Requirements 1.1, 1.2, 1.3**

**Property 2: Login button redirects to authentication**
*For any* visitor clicking the "Login as User" button, the system must redirect to the Cognito authentication flow.
**Validates: Requirements 1.4**

**Property 3: Guest button shows channel code input**
*For any* visitor clicking the "Join Channel as Guest" button, the system must display a channel code input interface.
**Validates: Requirements 1.5**

**Property 4: Channel code format and uniqueness**
*For any* channel created by the system, the channel code must match the format xxx-xxx (3 alphanumeric characters, dash, 3 alphanumeric characters) and must be unique across all channels in the database.
**Validates: Requirements 2.1, 2.2**

**Property 2: Channel code case sensitivity**
*For any* two channel codes that differ only in character casing, the system must treat them as distinct channels and allow both to exist simultaneously.
**Validates: Requirements 2.2, 5.1**

**Property 3: Channel creation completeness**
*For any* channel creation request, the resulting channel record must contain all required fields: id, ownerId, name, code, status (set to 'open'), and createdAt timestamp.
**Validates: Requirements 2.3**

**Property 4: Channel ownership filtering**
*For any* user requesting their channels, the returned list must contain all and only channels where that user is the owner.
**Validates: Requirements 2.4**

**Property 5: Channel closure preserves messages**
*For any* channel with messages, closing the channel must update the status to 'closed' while preserving all message records unchanged.
**Validates: Requirements 3.1**

**Property 6: Closed channels reject new messages**
*For any* channel with status 'closed', attempts by anonymous users to send messages must be rejected with an appropriate error.
**Validates: Requirements 3.2, 3.5**

**Property 7: Closed channels allow message history access**
*For any* channel with status 'closed', anonymous users must still be able to retrieve all approved messages.
**Validates: Requirements 3.3**

**Property 8: Channel reopen round-trip**
*For any* channel, closing it and then reopening it must restore the status to 'open' and allow new messages to be sent.
**Validates: Requirements 3.4**

**Property 9: Anonymous identity configuration compliance**
*For any* anonymous identity generated by the system, the animal name must be from the configured list, the icon URL must be from the configured list, and the background color must be one of the 11 predefined RGB values.
**Validates: Requirements 4.1, 4.2, 4.3**

**Property 10: Session identity persistence**
*For any* anonymous user session within a channel, all messages sent during that session must be associated with the same anonymous identity (same name, icon, and color).
**Validates: Requirements 4.4**

**Property 11: New session generates new identity**
*For any* two different session IDs joining the same channel, the system must generate distinct anonymous identities for each session.
**Validates: Requirements 4.5**

**Property 12: Valid channel code establishes connection**
*For any* valid channel code provided by an anonymous user, the system must successfully establish a WebSocket connection and return the channel information.
**Validates: Requirements 5.2**

**Property 13: Invalid channel code returns error**
*For any* channel code that does not exist in the database, lookup attempts must return an error indicating the channel was not found.
**Validates: Requirements 5.3**

**Property 14: Initial message load size**
*For any* channel with at least 15 approved messages, joining the channel must return exactly 15 messages; for channels with fewer than 15 approved messages, it must return all available approved messages.
**Validates: Requirements 5.5, 10.1**

**Property 15: Message creation with pending status**
*For any* message submitted by an anonymous user, the system must create a message record with status 'pending', associate it with the sender's anonymous identity, and set the sentAt timestamp.
**Validates: Requirements 6.1, 6.2, 6.3**

**Property 16: Message length acceptance**
*For any* message content of any length (including very long messages exceeding 10,000 characters), the system must accept and store the complete content without truncation.
**Validates: Requirements 6.4**

**Property 17: Sender sees own pending messages**
*For any* message submitted by an anonymous user, that user must immediately see their message in their view with a pending status indicator.
**Validates: Requirements 6.5**

**Property 18: Message approval updates status and timestamp**
*For any* pending message that is approved, the system must update the status to 'approved' and set the approvedAt timestamp to the current time.
**Validates: Requirements 7.1**

**Property 19: Message approval broadcasts to all users**
*For any* message that is approved, the system must broadcast the message via WebSocket to all anonymous users currently connected to that channel.
**Validates: Requirements 7.2**

**Property 20: Message rejection deletes record**
*For any* message that is rejected, the system must delete the message record from the database.
**Validates: Requirements 7.3**

**Property 21: Message visibility rules**
*For any* anonymous user viewing a channel, they must see: (1) all approved messages from all users, (2) their own pending messages, and (3) no pending messages from other users.
**Validates: Requirements 8.1, 8.2, 8.3**

**Property 22: Owner sees all messages**
*For any* channel owner viewing their channel, they must see all messages with status 'pending' or 'approved', regardless of sender.
**Validates: Requirements 7.5**

**Property 23: Message ordering by approval time**
*For any* list of approved messages returned by the system, the messages must be ordered by approvedAt timestamp in descending order (most recent first).
**Validates: Requirements 8.5, 10.4**

**Property 24: Pagination returns correct batch size**
*For any* pagination request for older messages, the system must return exactly 10 messages if at least 10 older messages exist, or all remaining messages if fewer than 10 exist.
**Validates: Requirements 10.2**

**Property 25: Pagination termination indicator**
*For any* pagination request where no more older messages exist, the system must set the hasMore flag to false.
**Validates: Requirements 10.3**

**Property 26: Long message collapse state**
*For any* message with content exceeding 400 characters, the UI component must render it in a collapsed state by default with an expand button visible.
**Validates: Requirements 11.1, 11.2**

**Property 27: Message expand/collapse round-trip**
*For any* message that is collapsed, expanding it and then collapsing it again must return the message to its original collapsed state.
**Validates: Requirements 11.3, 11.4, 11.5**

**Property 28: Inbox channel completeness**
*For any* channel owner, their inbox must display all channels they own with no duplicates and no channels owned by other users.
**Validates: Requirements 12.1**

**Property 29: Inbox sorting by activity**
*For any* channel owner's inbox, channels must be sorted by the timestamp of their most recent approved message, with channels having no messages appearing last.
**Validates: Requirements 12.2**

**Property 30: Channel message filtering**
*For any* channel selected by an owner, the displayed messages must all belong to that channel and no messages from other channels must be included.
**Validates: Requirements 12.4**

**Property 31: Permission boundaries**
*For any* user, if they are a channel owner, they must be able to approve/reject messages but not send messages; if they are an anonymous user, they must be able to send messages but not approve/reject messages.
**Validates: Requirements 13.4**

**Property 32: User record schema completeness**
*For any* user record in the database, it must contain non-null values for: id, fullName, email, cognitoId, and createdAt.
**Validates: Requirements 15.1**

**Property 33: Channel record schema completeness**
*For any* channel record in the database, it must contain non-null values for: id, ownerId, name, code, status, and createdAt.
**Validates: Requirements 15.2**

**Property 34: Anonymous user record schema completeness**
*For any* anonymous user record in the database, it must contain non-null values for: id, channelId, sessionId, name, iconUrl, iconBackgroundColor, and createdAt.
**Validates: Requirements 15.3**

**Property 35: Message record schema completeness**
*For any* message record in the database, it must contain non-null values for: id, channelId, anonUserId, content, status, and sentAt; approvedAt may be null for pending messages.
**Validates: Requirements 15.4**

### Example-Based Tests

These are specific scenarios that should be tested with concrete examples rather than property-based testing:

**Example 1: Landing page renders correctly**
When a user accesses the root URL `/`, the landing page should display both "Login as User" and "Join Channel as Guest" buttons.
**Validates: Requirements 1.1, 1.2, 1.3**

**Example 2: Authentication redirect**
When a user accesses `/api/auth/login`, the system should redirect to the Amazon Cognito Hosted Login URL with correct parameters.
**Validates: Requirements 2.1**

**Example 3: Identity configuration file exists**
The system should have a valid JSON configuration file at `config/anonymous-identities.json` containing arrays of animal names and icon URLs.
**Validates: Requirements 5.6**

**Example 4: No owner-to-user messaging**
The API should not expose any endpoint that allows channel owners to send messages to anonymous users.
**Validates: Requirements 14.1**

**Example 5: No read receipts**
Message responses should not include any read receipt or "seen by" information.
**Validates: Requirements 14.2**

**Example 6: No typing indicators**
The WebSocket server should not emit any typing indicator events.
**Validates: Requirements 14.3**

**Example 7: 100 concurrent connections**
The system should successfully handle 100 concurrent WebSocket connections without errors or connection rejections.
**Validates: Requirements 15.1**

**Example 8: Docker deployment**
A Dockerfile should exist and successfully build a container image that runs the application.
**Validates: Requirements 15.4**

**Example 9: Channel code index exists**
The database schema should include a unique index on the channels.code column.
**Validates: Requirements 16.5**

**Example 10: Message channel_id index exists**
The database schema should include an index on the messages.channel_id column.
**Validates: Requirements 16.6**

## Error Handling

### Error Categories

**1. Authentication Errors**
- Invalid Cognito token → Return 401 Unauthorized
- Expired session → Return 401 Unauthorized, clear session cookie
- Missing session → Return 401 Unauthorized
- Cognito service unavailable → Return 503 Service Unavailable, retry with exponential backoff

**2. Authorization Errors**
- User attempts to access another user's channel → Return 403 Forbidden
- Anonymous user attempts to approve message → Return 403 Forbidden
- Owner attempts to send message → Return 403 Forbidden

**3. Validation Errors**
- Invalid channel code format → Return 400 Bad Request with error message
- Empty message content → Return 400 Bad Request with error message
- Missing required fields → Return 400 Bad Request with field-specific errors
- Invalid channel status value → Return 400 Bad Request

**4. Not Found Errors**
- Channel code does not exist → Return 404 Not Found
- Message ID does not exist → Return 404 Not Found
- User ID does not exist → Return 404 Not Found

**5. Conflict Errors**
- Channel code collision (after max retries) → Return 409 Conflict, suggest retry
- Duplicate user email → Return 409 Conflict

**6. Database Errors**
- Connection timeout → Return 503 Service Unavailable, retry
- Query timeout → Return 504 Gateway Timeout
- Constraint violation → Return 400 Bad Request with specific error
- Connection pool exhausted → Return 503 Service Unavailable, queue request

**7. WebSocket Errors**
- Connection failed → Emit 'error' event to client, attempt reconnection
- Invalid event payload → Emit 'error' event with validation details
- Channel not found during join → Emit 'error' event, close connection
- Message send to closed channel → Emit 'error' event with channel status

### Error Response Format

**REST API Errors**:
```typescript
interface ErrorResponse {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable error message
    details?: any;          // Optional additional context
    timestamp: string;      // ISO 8601 timestamp
  };
}
```

**WebSocket Errors**:
```typescript
interface SocketErrorEvent {
  type: 'error';
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Error Handling Strategies

**Retry Logic**:
- Database connection failures: Exponential backoff (100ms, 200ms, 400ms, 800ms, 1600ms)
- Cognito API calls: Exponential backoff (200ms, 400ms, 800ms)
- WebSocket reconnection: Exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)

**Circuit Breaker**:
- Cognito API: Open circuit after 5 consecutive failures, half-open after 30s
- Database: Open circuit after 10 consecutive failures, half-open after 10s

**Graceful Degradation**:
- If WebSocket fails, fall back to polling for message updates (every 5s)
- If database read fails, return cached data if available
- If identity config file missing, use hardcoded fallback list

**Logging**:
- Log all errors with context (user ID, channel ID, request ID)
- Include stack traces for 500-level errors
- Sanitize sensitive data (tokens, passwords) from logs

## Testing Strategy

### Dual Testing Approach

This system requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property tests**: Verify universal properties across all inputs through randomization

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing

**Framework**: Use `fast-check` for TypeScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `// Feature: anonymous-messaging-platform, Property {number}: {property_text}`

**Property Test Examples**:

```typescript
// Feature: anonymous-messaging-platform, Property 1: Channel code format and uniqueness
test('all generated channel codes match format xxx-xxx', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), async (channelName) => {
      const code = await generateChannelCode();
      expect(code).toMatch(/^[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}$/);
    }),
    { numRuns: 100 }
  );
});

// Feature: anonymous-messaging-platform, Property 9: Anonymous identity configuration compliance
test('all generated identities use configured values', async () => {
  await fc.assert(
    fc.asyncProperty(fc.uuid(), fc.uuid(), async (channelId, sessionId) => {
      const identity = await generateAnonymousIdentity(channelId, sessionId);
      const config = await loadIdentityConfig();
      
      expect(config.animalNames).toContain(identity.name.replace('Anonymous ', ''));
      expect(config.iconUrls).toContain(identity.iconUrl);
      expect(BACKGROUND_COLORS).toContain(identity.iconBackgroundColor);
    }),
    { numRuns: 100 }
  );
});

// Feature: anonymous-messaging-platform, Property 21: Message visibility rules
test('anonymous users see correct message visibility', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.record({
        content: fc.string(),
        status: fc.constantFrom('pending', 'approved'),
        isOwnMessage: fc.boolean()
      })),
      async (messages) => {
        const visibleMessages = filterMessagesForAnonymousUser(messages, 'user-session-id');
        
        // All approved messages should be visible
        const approvedMessages = messages.filter(m => m.status === 'approved');
        expect(visibleMessages.filter(m => m.status === 'approved').length)
          .toBe(approvedMessages.length);
        
        // Only own pending messages should be visible
        const ownPendingMessages = messages.filter(m => m.status === 'pending' && m.isOwnMessage);
        expect(visibleMessages.filter(m => m.status === 'pending').length)
          .toBe(ownPendingMessages.length);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Framework**: Jest with TypeScript

**Test Categories**:

1. **API Endpoint Tests**
   - Test each REST endpoint with valid inputs
   - Test authentication and authorization
   - Test error responses for invalid inputs
   - Test pagination edge cases (empty list, single item, exact page boundary)

2. **WebSocket Event Tests**
   - Test each Socket.io event handler
   - Test room joining and leaving
   - Test message broadcasting
   - Test error event emission

3. **Database Tests**
   - Test each query with sample data
   - Test constraint violations
   - Test transaction rollback on errors
   - Test connection pool behavior

4. **Business Logic Tests**
   - Test channel code generation (collision handling)
   - Test anonymous identity generation
   - Test message approval workflow
   - Test channel status transitions

5. **Integration Tests**
   - Test complete authentication flow
   - Test complete message submission and approval flow
   - Test WebSocket connection and message delivery
   - Test pagination with database

6. **Edge Case Tests**
   - Empty channel (no messages)
   - Channel with exactly 15 messages
   - Message with exactly 400 characters
   - Very long messages (>10,000 characters)
   - Closed channel behavior
   - Invalid channel codes (wrong format, non-existent)

### Test Data Generators

For property-based testing, create generators for:

```typescript
// Channel code generator
const channelCodeArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
  { minLength: 3, maxLength: 3 }
).chain(part1 => 
  fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
    { minLength: 3, maxLength: 3 }
  ).map(part2 => `${part1}-${part2}`)
);

// Message generator
const messageArb = fc.record({
  id: fc.uuid(),
  channelId: fc.uuid(),
  anonUserId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 5000 }),
  status: fc.constantFrom('pending', 'approved', 'rejected'),
  sentAt: fc.date(),
  approvedAt: fc.option(fc.date(), { nil: null })
});

// Anonymous identity generator
const anonymousUserArb = fc.record({
  id: fc.uuid(),
  channelId: fc.uuid(),
  sessionId: fc.uuid(),
  name: fc.constantFrom('Panda', 'Tiger', 'Eagle', 'Dolphin', 'Fox').map(n => `Anonymous ${n}`),
  iconUrl: fc.constantFrom('/icons/panda.svg', '/icons/tiger.svg', '/icons/eagle.svg'),
  iconBackgroundColor: fc.constantFrom(...BACKGROUND_COLORS)
});
```

### Test Coverage Goals

- **Line coverage**: >80%
- **Branch coverage**: >75%
- **Function coverage**: >85%
- **Critical paths**: 100% (authentication, message approval, WebSocket events)

### Performance Testing

While not part of automated testing, manual performance testing should verify:
- 100 concurrent WebSocket connections
- Message delivery latency <1 second under normal load
- Database query performance with 10,000+ messages
- Memory usage remains stable over 24-hour period

### Testing Checklist

Before deployment, verify:
- [ ] All property tests pass (38 properties)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Landing page displays correctly with both buttons
- [ ] Database migrations run successfully
- [ ] Cognito integration works in staging environment
- [ ] WebSocket connections establish successfully
- [ ] Docker container builds and runs
- [ ] Environment variables configured correctly
- [ ] Database indexes exist
- [ ] Identity configuration file is valid JSON
