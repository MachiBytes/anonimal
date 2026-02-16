****# Implementation Plan: Anonymous Messaging Platform

## Overview

This implementation plan breaks down the anonymous messaging platform into discrete coding tasks. The approach follows a bottom-up strategy: database and core services first, then API endpoints, WebSocket integration, and finally UI components. Each task builds incrementally to ensure continuous integration and early validation.

## Tasks

- [x] 1. Project setup and database foundation
  - Initialize Next.js 14+ project with TypeScript
  - Configure PostgreSQL connection with pg library
  - Create database schema with migrations
  - Set up environment variables for database and Cognito
  - Create connection pool configuration
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

- [ ]* 1.1 Write property test for database schema completeness
  - **Property 35: User record schema completeness**
  - **Property 36: Channel record schema completeness**
  - **Property 37: Anonymous user record schema completeness**
  - **Property 38: Message record schema completeness**
  - **Validates: Requirements 16.1, 16.2, 16.3, 16.4**

- [ ]* 1.2 Write example tests for database indexes
  - **Example 9: Channel code index exists**
  - **Example 10: Message channel_id index exists**
  - **Validates: Requirements 16.5, 16.6**

- [x] 2. Anonymous identity configuration and generation
  - [x] 2.1 Create anonymous identity configuration JSON file
    - Define animal names array
    - Define icon URLs array
    - Store at `config/anonymous-identities.json`
    - _Requirements: 5.6_

  - [ ]* 2.2 Write example test for identity configuration file
    - **Example 3: Identity configuration file exists**
    - **Validates: Requirements 5.6**

  - [x] 2.3 Implement identity generator service
    - Load configuration from JSON file
    - Implement random selection for name, icon, and color
    - Implement session-based identity retrieval
    - Create database repository for anonymous users
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.4 Write property tests for identity generation
    - **Property 12: Anonymous identity configuration compliance**
    - **Property 13: Session identity persistence**
    - **Property 14: New session generates new identity**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 3. Channel management service
  - [x] 3.1 Implement channel code generator
    - Generate 6-character alphanumeric codes in xxx-xxx format
    - Implement uniqueness check with retry logic
    - Handle collision scenarios
    - _Requirements: 3.1, 3.2_

  - [ ]* 3.2 Write property tests for channel code generation
    - **Property 4: Channel code format and uniqueness**
    - **Property 5: Channel code case sensitivity**
    - **Validates: Requirements 3.1, 3.2, 6.1**

  - [x] 3.3 Implement channel service and repository
    - Create channel creation logic
    - Implement channel lookup by code (case-sensitive)
    - Implement channel status update (open/close)
    - Implement owner-based channel filtering
    - _Requirements: 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.4 Write property tests for channel operations
    - **Property 6: Channel creation completeness**
    - **Property 7: Channel ownership filtering**
    - **Property 8: Channel closure preserves messages**
    - **Property 9: Closed channels reject new messages**
    - **Property 10: Closed channels allow message history access**
    - **Property 11: Channel reopen round-trip**
    - **Validates: Requirements 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Message service and approval workflow
  - [x] 5.1 Implement message repository
    - Create message submission logic
    - Implement message approval/rejection
    - Implement message history queries with pagination
    - Implement visibility filtering (owner vs anonymous user)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 11.1, 11.2, 11.3, 11.4_

  - [ ]* 5.2 Write property tests for message operations
    - **Property 18: Message creation with pending status**
    - **Property 19: Message length acceptance**
    - **Property 20: Sender sees own pending messages**
    - **Property 21: Message approval updates status and timestamp**
    - **Property 23: Message rejection deletes record**
    - **Property 24: Message visibility rules**
    - **Property 25: Owner sees all messages**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.3, 8.5, 9.1, 9.2, 9.3**

  - [ ]* 5.3 Write property tests for message ordering and pagination
    - **Property 26: Message ordering by approval time**
    - **Property 27: Pagination returns correct batch size**
    - **Property 28: Pagination termination indicator**
    - **Property 17: Initial message load size**
    - **Validates: Requirements 6.5, 9.5, 11.1, 11.2, 11.3, 11.4**

- [x] 6. Amazon Cognito authentication
  - [x] 6.1 Configure Cognito client
    - Set up Cognito configuration from environment variables
    - Implement OAuth redirect to Cognito Hosted UI
    - _Requirements: 2.1_

  - [ ]* 6.2 Write example test for authentication redirect
    - **Example 2: Authentication redirect**
    - **Validates: Requirements 2.1**

  - [x] 6.2 Implement Cognito callback handler
    - Exchange authorization code for tokens
    - Extract user info from ID token
    - Create or update user in database
    - Create session with HTTP-only cookie
    - _Requirements: 2.2, 2.3_

  - [x] 6.3 Implement session management
    - Create session validation middleware
    - Implement session retrieval endpoint
    - Implement logout functionality
    - _Requirements: 2.4_

  - [ ]* 6.4 Write property tests for authentication
    - **Property 2: Login button redirects to authentication** (integration test)
    - **Validates: Requirements 1.4, 2.1, 2.2, 2.3, 2.4**

- [x] 7. REST API endpoints
  - [x] 7.1 Implement authentication endpoints
    - POST /api/auth/cognito-callback
    - GET /api/auth/session
    - POST /api/auth/logout
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 7.2 Implement channel endpoints
    - GET /api/channels (list owner's channels)
    - POST /api/channels (create channel)
    - PATCH /api/channels/:id (update status)
    - GET /api/channels/:code (lookup by code)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.4, 6.1, 6.2, 6.3_

  - [x] 7.3 Implement message endpoints
    - GET /api/messages/:channelId (paginated history)
    - POST /api/messages/:messageId/approve
    - DELETE /api/messages/:messageId (reject)
    - _Requirements: 8.1, 8.3, 11.1, 11.2_

  - [ ]* 7.4 Write integration tests for API endpoints
    - Test authentication flow
    - Test channel CRUD operations
    - Test message approval workflow
    - Test error responses (401, 403, 404, 400)
    - _Requirements: All API-related requirements_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Socket.io WebSocket integration
  - [x] 9.1 Set up Socket.io server
    - Initialize Socket.io with Next.js custom server
    - Configure CORS and connection settings
    - _Requirements: 10.1, 10.5_

  - [x] 9.2 Implement channel room management
    - Implement join_channel event handler
    - Create room naming convention (channel:{id}, owner:{id})
    - Implement identity assignment on join
    - _Requirements: 6.2, 6.4, 10.5_

  - [ ]* 9.3 Write property test for WebSocket connection
    - **Property 15: Valid channel code establishes connection**
    - **Property 16: Invalid channel code returns error**
    - **Validates: Requirements 6.2, 6.3**

  - [x] 9.4 Implement message WebSocket events
    - Implement send_message event (create pending message)
    - Implement approve_message event (broadcast to all)
    - Implement reject_message event (notify sender)
    - Emit message_pending to owner only
    - Emit new_message to all channel users
    - Emit message_rejected to sender
    - _Requirements: 7.6, 8.2, 8.4, 9.4, 10.2, 10.3, 10.4_

  - [ ]* 9.5 Write property test for message broadcasting
    - **Property 22: Message approval broadcasts to all users**
    - **Validates: Requirements 8.2, 9.4**

  - [x] 9.6 Implement channel status WebSocket events
    - Emit channel_closed when channel is closed
    - Emit channel_opened when channel is reopened
    - _Requirements: 4.1, 4.4_

  - [ ]* 9.7 Write integration tests for WebSocket events
    - Test complete message flow (send → approve → broadcast)
    - Test rejection flow
    - Test room isolation (messages only to correct channel)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.2, 8.4_

- [x] 10. Landing page UI
  - [x] 10.1 Create landing page component
    - Implement root page (/)
    - Add "Login as User" button
    - Add "Join Channel as Guest" button
    - Implement channel code input form
    - Add client-side validation for code format
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 10.2 Write property tests for landing page
    - **Property 1: Landing page displays required buttons**
    - **Property 3: Guest button shows channel code input**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**

  - [ ]* 10.3 Write example test for landing page rendering
    - **Example 1: Landing page renders correctly**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 11. Channel owner dashboard UI
  - [x] 11.1 Create channel list/inbox component
    - Display all owner's channels
    - Sort by most recent activity
    - Implement channel selection
    - Show channel status (open/closed)
    - _Requirements: 13.1, 13.2, 13.4_

  - [ ]* 11.2 Write property tests for inbox
    - **Property 31: Inbox channel completeness**
    - **Property 32: Inbox sorting by activity**
    - **Property 33: Channel message filtering**
    - **Validates: Requirements 13.1, 13.2, 13.4**

  - [x] 11.3 Create channel creation form
    - Input for channel name
    - Submit to create channel
    - Display generated code
    - _Requirements: 3.1, 3.3_

  - [x] 11.4 Create channel management controls
    - Button to close/reopen channel
    - Display channel code
    - Copy code to clipboard functionality
    - _Requirements: 4.1, 4.4_

- [x] 12. Message display and approval UI (owner view)
  - [x] 12.1 Create message list component for owners
    - Display all messages (pending and approved)
    - Show pending messages with approval controls
    - Show approved messages with grayed-out style
    - Display anonymous user identity (name, icon, color)
    - _Requirements: 8.5, 8.6, 9.1_

  - [ ]* 12.2 Write property test for owner message visibility
    - **Property 25: Owner sees all messages**
    - **Validates: Requirements 8.5**

  - [x] 12.3 Implement message approval controls
    - Approve button for pending messages
    - Reject button for pending messages
    - Connect to WebSocket events
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 12.4 Implement message collapse/expand for long messages
    - Detect messages >400 characters
    - Render collapsed state by default
    - Add expand/collapse button
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 12.5 Write property tests for message display
    - **Property 29: Long message collapse state**
    - **Property 30: Message expand/collapse round-trip**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

- [x] 13. Anonymous user channel view UI
  - [x] 13.1 Create channel join flow
    - Accept channel code from landing page
    - Validate code format
    - Establish WebSocket connection
    - Receive and display anonymous identity
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [x] 13.2 Create message list component for anonymous users
    - Display approved messages from all users
    - Display own pending messages with indicator
    - Hide other users' pending messages
    - Show anonymous identities (name, icon, color)
    - Implement infinite scroll pagination
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 11.1, 11.2, 11.3, 11.5_

  - [ ]* 13.3 Write property test for anonymous user message visibility
    - **Property 24: Message visibility rules**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 13.4 Create message input component
    - Text input for message content
    - Submit button
    - Disable when channel is closed
    - Connect to WebSocket send_message event
    - _Requirements: 7.1, 7.5, 7.6, 4.2_

  - [x] 13.5 Implement real-time message updates
    - Listen for new_message events
    - Listen for message_rejected events
    - Update UI when messages arrive
    - Show notification when own message is rejected
    - _Requirements: 8.4, 9.4, 10.2, 10.3_

  - [x] 13.6 Implement message collapse/expand for long messages
    - Reuse collapse/expand component from owner view
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Permission boundaries and security
  - [x] 15.1 Implement authorization checks
    - Verify owners can only access their own channels
    - Verify owners cannot send messages
    - Verify anonymous users cannot approve/reject
    - Add middleware for protected routes
    - _Requirements: 14.4_

  - [ ]* 15.2 Write property test for permission boundaries
    - **Property 34: Permission boundaries**
    - **Validates: Requirements 14.4**

  - [ ]* 15.3 Write example tests for feature absence
    - **Example 4: No owner-to-user messaging**
    - **Example 5: No read receipts**
    - **Example 6: No typing indicators**
    - **Validates: Requirements 14.1, 14.2, 14.3**

- [ ] 16. Docker deployment configuration
  - [x] 16.1 Create Dockerfile
    - Multi-stage build for Next.js
    - Install dependencies
    - Build application
    - Configure production server
    - _Requirements: 15.4_

  - [ ]* 16.2 Write example test for Docker deployment
    - **Example 8: Docker deployment**
    - **Validates: Requirements 15.4**

  - [ ] 16.3 Create docker-compose.yml (optional for local development)
    - Configure Next.js service
    - Configure PostgreSQL service
    - Set up networking
    - _Requirements: 15.4_

  - [ ] 16.4 Create environment variable documentation
    - Document all required environment variables
    - Provide example .env file
    - _Requirements: 15.1, 15.3_

- [ ] 17. Performance testing and optimization
  - [ ]* 17.1 Write example test for concurrent connections
    - **Example 7: 100 concurrent connections**
    - **Validates: Requirements 15.1**

  - [ ] 17.2 Optimize database queries
    - Add appropriate indexes (already in schema)
    - Verify query performance
    - Test with large datasets
    - _Requirements: 15.2, 16.5, 16.6_

  - [ ] 17.3 Configure connection pooling
    - Set appropriate pool size
    - Configure timeouts
    - Test under load
    - _Requirements: 15.1, 15.2_

- [ ] 18. Final integration and testing
  - [ ] 18.1 End-to-end testing
    - Test complete owner flow (login → create channel → approve messages)
    - Test complete anonymous flow (join → send message → see approval)
    - Test channel close/reopen flow
    - Test error scenarios
    - _Requirements: All requirements_

  - [ ] 18.2 Cross-browser testing
    - Test WebSocket connections in different browsers
    - Test UI responsiveness
    - _Requirements: UI-related requirements_

  - [ ] 18.3 Documentation
    - Write README with setup instructions
    - Document API endpoints
    - Document WebSocket events
    - Document deployment process
    - _Requirements: All requirements_

- [ ] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- The implementation follows a bottom-up approach: database → services → API → WebSocket → UI
- WebSocket integration happens after REST API to ensure core functionality works first
- UI components are built last, allowing backend testing without UI dependencies
