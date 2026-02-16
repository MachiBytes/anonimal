# Requirements Document

## Introduction

This document specifies the requirements for an anonymous messaging platform that enables Channel Owners to receive real-time feedback from Anonymous Users through unique channel codes. The system provides message moderation capabilities where owners must approve messages before they become publicly visible to all users in the channel.

## Glossary

- **Channel_Owner**: An authenticated user who creates and manages channels
- **Anonymous_User**: An unauthenticated visitor who sends messages to channels using a channel code
- **Channel**: A message space owned by a Channel_Owner, identified by a unique code
- **Channel_Code**: A unique 6-character alphanumeric identifier in format xxx-xxx (case-sensitive)
- **Message**: Content submitted by an Anonymous_User to a Channel
- **Message_Status**: The approval state of a message (pending, approved, or rejected)
- **Anonymous_Identity**: A randomly assigned name and visual appearance for an Anonymous_User
- **Session**: A browser session for an Anonymous_User within a specific Channel
- **Platform**: The anonymous messaging system
- **WebSocket_Connection**: A Socket.io connection for real-time message delivery
- **Cognito**: Amazon Cognito authentication service for Channel_Owner authentication

## Requirements

### Requirement 1: Landing Page

**User Story:** As a visitor, I want to see a landing page with clear options to either login as a channel owner or join a channel as a guest, so that I can quickly access the appropriate functionality.

#### Acceptance Criteria

1. WHEN a visitor accesses the root URL, THE Platform SHALL display a landing page
2. THE Platform SHALL display a "Login as User" button on the landing page
3. THE Platform SHALL display a "Join Channel as Guest" button on the landing page
4. WHEN a visitor clicks "Login as User", THE Platform SHALL redirect to the authentication flow
5. WHEN a visitor clicks "Join Channel as Guest", THE Platform SHALL display a channel code input interface

### Requirement 2: Channel Owner Authentication

**User Story:** As a channel owner, I want to authenticate using Amazon Cognito Hosted Login, so that I can securely access and manage my channels without managing passwords.

#### Acceptance Criteria

1. WHEN a user accesses the authentication endpoint, THE Platform SHALL redirect to Amazon Cognito Hosted Login
2. WHEN Cognito returns an authentication callback, THE Platform SHALL create or retrieve the user account using the Cognito ID
3. WHEN a Channel_Owner session is established, THE Platform SHALL store the user's full name, email, and Cognito ID
4. WHEN an authenticated request is made, THE Platform SHALL validate the session and return the current user information

### Requirement 3: Channel Creation and Management

**User Story:** As a channel owner, I want to create multiple channels with unique codes, so that I can organize different feedback streams.

#### Acceptance Criteria

1. WHEN a Channel_Owner creates a channel, THE Platform SHALL generate a unique 6-character alphanumeric code in format xxx-xxx
2. THE Platform SHALL ensure all Channel_Codes are case-sensitive and unique across the system
3. WHEN a Channel_Owner creates a channel, THE Platform SHALL store the channel name, owner ID, code, status (open), and creation timestamp
4. WHEN a Channel_Owner requests their channels, THE Platform SHALL return all channels owned by that user
5. THE Platform SHALL allow unlimited channels per Channel_Owner

### Requirement 4: Channel Status Management

**User Story:** As a channel owner, I want to close and reopen my channels, so that I can control when users can send new messages while preserving message history.

#### Acceptance Criteria

1. WHEN a Channel_Owner closes a channel, THE Platform SHALL update the channel status to closed and preserve all message history
2. WHEN a channel is closed, THE Platform SHALL prevent Anonymous_Users from sending new messages to that channel
3. WHEN a channel is closed, THE Platform SHALL allow Anonymous_Users to view the complete approved message history
4. WHEN a Channel_Owner reopens a channel, THE Platform SHALL update the channel status to open and allow new messages
5. WHEN an Anonymous_User attempts to send a message to a closed channel, THE Platform SHALL reject the message and indicate the channel is closed

### Requirement 5: Anonymous Identity Assignment

**User Story:** As an anonymous user, I want to receive a unique identity when I join a channel, so that my messages are distinguishable without revealing my real identity.

#### Acceptance Criteria

1. WHEN an Anonymous_User joins a channel, THE Platform SHALL assign a random animal name from a predefined list
2. WHEN an Anonymous_User joins a channel, THE Platform SHALL assign a random icon URL from a predefined list
3. WHEN an Anonymous_User joins a channel, THE Platform SHALL assign one of 11 predefined background colors: rgb(0,163,187), rgb(161,60,180), rgb(166,50,50), rgb(241,118,167), rgb(253,87,61), rgb(255,0,122), rgb(255,0,26), rgb(27,136,122), rgb(31,161,93), rgb(93,175,221), rgb(99,120,47)
4. WHEN an Anonymous_User sends multiple messages in the same session, THE Platform SHALL maintain the same identity across all messages
5. WHEN an Anonymous_User refreshes the browser or rejoins a channel, THE Platform SHALL generate a new identity
6. THE Platform SHALL store the anonymous identity configuration (animal names and icon URLs) in a JSON file within the codebase

### Requirement 6: Anonymous Channel Access

**User Story:** As an anonymous user, I want to access a channel using its unique code, so that I can view messages and participate in the conversation.

#### Acceptance Criteria

1. WHEN an Anonymous_User provides a Channel_Code, THE Platform SHALL look up the channel using the case-sensitive code
2. WHEN a valid Channel_Code is provided, THE Platform SHALL establish a WebSocket_Connection for that Anonymous_User
3. WHEN an invalid Channel_Code is provided, THE Platform SHALL return an error indicating the channel does not exist
4. WHEN an Anonymous_User joins a channel, THE Platform SHALL create or retrieve their Anonymous_Identity for that session
5. WHEN an Anonymous_User joins a channel, THE Platform SHALL load the 15 most recent approved messages

### Requirement 7: Message Submission

**User Story:** As an anonymous user, I want to send messages to a channel, so that I can provide feedback to the channel owner.

#### Acceptance Criteria

1. WHEN an Anonymous_User submits a message, THE Platform SHALL create a message record with status "pending"
2. WHEN an Anonymous_User submits a message, THE Platform SHALL associate the message with their Anonymous_Identity
3. WHEN an Anonymous_User submits a message, THE Platform SHALL store the message content, channel ID, anonymous user ID, sent timestamp, and status
4. THE Platform SHALL allow messages of any length without character limits
5. WHEN an Anonymous_User submits a message, THE Platform SHALL immediately display it to the sender with a "pending approval" indicator
6. WHEN an Anonymous_User submits a message, THE Platform SHALL notify the Channel_Owner via WebSocket

### Requirement 8: Message Approval System

**User Story:** As a channel owner, I want to approve or reject messages before they become visible to all users, so that I can moderate content in my channels.

#### Acceptance Criteria

1. WHEN a Channel_Owner approves a message, THE Platform SHALL update the message status to "approved" and record the approval timestamp
2. WHEN a Channel_Owner approves a message, THE Platform SHALL broadcast the message to all Anonymous_Users in the channel via WebSocket
3. WHEN a Channel_Owner rejects a message, THE Platform SHALL delete the message from the database
4. WHEN a Channel_Owner rejects a message, THE Platform SHALL notify the sender via WebSocket
5. WHEN a Channel_Owner views their channel, THE Platform SHALL display all messages (pending and approved) in the same conversation view
6. WHEN a Channel_Owner views approved messages, THE Platform SHALL display them with a grayed-out visual style
7. THE Platform SHALL allow Channel_Owners to approve or reject messages one at a time

### Requirement 9: Message Visibility Rules

**User Story:** As an anonymous user, I want to see all approved messages from all users, so that I can follow the complete conversation in the channel.

#### Acceptance Criteria

1. WHEN an Anonymous_User views a channel, THE Platform SHALL display all approved messages from all Anonymous_Users
2. WHEN an Anonymous_User views a channel, THE Platform SHALL display their own pending messages with a "pending approval" indicator
3. WHEN an Anonymous_User views a channel, THE Platform SHALL not display pending messages from other Anonymous_Users
4. WHEN a message is approved, THE Platform SHALL display it to all Anonymous_Users in the channel in real-time
5. WHEN messages are displayed, THE Platform SHALL order them by approval timestamp, not send timestamp

### Requirement 10: Real-Time Message Delivery

**User Story:** As a user, I want messages to be delivered in real-time, so that I can have near-instant communication.

#### Acceptance Criteria

1. THE Platform SHALL use Socket.io for WebSocket_Connection management
2. WHEN a message is approved, THE Platform SHALL deliver it to all connected Anonymous_Users within one second
3. WHEN an Anonymous_User sends a message, THE Platform SHALL deliver the pending notification to the Channel_Owner within one second
4. WHEN a message is rejected, THE Platform SHALL notify the sender within one second
5. THE Platform SHALL establish WebSocket_Connections only when Anonymous_Users join a channel with a valid code

### Requirement 11: Message History and Pagination

**User Story:** As an anonymous user, I want to load older messages by scrolling up, so that I can view the complete conversation history.

#### Acceptance Criteria

1. WHEN an Anonymous_User initially joins a channel, THE Platform SHALL load the 15 most recent approved messages
2. WHEN an Anonymous_User scrolls to the top of the message list, THE Platform SHALL load 10 additional older approved messages
3. WHEN there are no more messages to load, THE Platform SHALL indicate that the beginning of the conversation has been reached
4. THE Platform SHALL return messages in chronological order by approval timestamp
5. THE Platform SHALL implement infinite scroll pagination for message history

### Requirement 12: Message Display and Formatting

**User Story:** As a user, I want long messages to be collapsed by default, so that the interface remains clean and scannable.

#### Acceptance Criteria

1. WHEN a message exceeds 400 characters, THE Platform SHALL display it in a collapsed state by default
2. WHEN a message is collapsed, THE Platform SHALL show an expand icon button
3. WHEN a user clicks the expand button, THE Platform SHALL display the full message content
4. WHEN a message is expanded, THE Platform SHALL show a collapse icon button
5. WHEN a user clicks the collapse button, THE Platform SHALL return the message to its collapsed state

### Requirement 13: Channel Owner Inbox

**User Story:** As a channel owner, I want to see all my channels in a feed sorted by recent activity, so that I can quickly access channels with new messages.

#### Acceptance Criteria

1. WHEN a Channel_Owner views their inbox, THE Platform SHALL display all their channels in a list
2. WHEN a Channel_Owner views their inbox, THE Platform SHALL sort channels by most recent message activity
3. WHEN a Channel_Owner views their inbox, THE Platform SHALL display each channel as a separate inbox (similar to Facebook Messenger group chats)
4. WHEN a Channel_Owner selects a channel, THE Platform SHALL display all messages (pending and approved) for that channel
5. WHEN a new message arrives in any channel, THE Platform SHALL update the channel's position in the feed

### Requirement 14: One-Way Communication

**User Story:** As a system architect, I want to enforce one-way communication from anonymous users to channel owners, so that the platform maintains its feedback-focused purpose.

#### Acceptance Criteria

1. THE Platform SHALL not provide any mechanism for Channel_Owners to send messages to Anonymous_Users
2. THE Platform SHALL not display read receipts to any users
3. THE Platform SHALL not display typing indicators to any users
4. THE Platform SHALL only allow Anonymous_Users to send messages and Channel_Owners to approve or reject them

### Requirement 15: Performance and Scalability

**User Story:** As a system administrator, I want the platform to support 100 concurrent users with minimal infrastructure, so that we can run a cost-effective demo application.

#### Acceptance Criteria

1. THE Platform SHALL support at least 100 concurrent WebSocket_Connections across all channels
2. WHEN the system is under load, THE Platform SHALL maintain sub-second message delivery latency
3. THE Platform SHALL use PostgreSQL on AWS RDS for data persistence
4. THE Platform SHALL be deployable as a Docker container
5. THE Platform SHALL minimize infrastructure footprint for cost-effective operation

### Requirement 16: Data Persistence

**User Story:** As a channel owner, I want all my channels and messages to be persisted in a database, so that data is not lost between sessions.

#### Acceptance Criteria

1. THE Platform SHALL store all User records with ID, full name, email, and Cognito ID
2. THE Platform SHALL store all Channel records with ID, owner ID, name, code, status, and creation timestamp
3. THE Platform SHALL store all Anonymous_Identity records with ID, channel ID, session ID, name, icon URL, and background color
4. THE Platform SHALL store all Message records with ID, channel ID, anonymous user ID, content, status, sent timestamp, and approval timestamp
5. THE Platform SHALL index Channel_Code for efficient lookup
6. THE Platform SHALL index Message channel_id for efficient query performance
