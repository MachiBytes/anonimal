# Manual Test Plan: AnonymousMessageList Component

## Test Requirements
This component must satisfy the following requirements from task 13.2:
- Display approved messages from all users
- Display own pending messages with indicator
- Hide other users' pending messages
- Show anonymous identities (name, icon, color)
- Implement infinite scroll pagination

## Test Cases

### Test 1: Display Approved Messages from All Users
**Requirement**: 9.1, 9.4

**Steps**:
1. Join a channel as an anonymous user
2. Verify that all approved messages from all users are visible
3. Check that messages show the correct anonymous identity (name, icon, color)

**Expected Result**:
- All approved messages are displayed
- Each message shows the sender's anonymous identity
- Messages are ordered by approval timestamp (most recent first)

### Test 2: Display Own Pending Messages with Indicator
**Requirement**: 9.2

**Steps**:
1. Join a channel as an anonymous user
2. Send a new message
3. Verify the message appears immediately with "Pending Approval" indicator

**Expected Result**:
- Own pending message is visible
- Message has a "Pending Approval" badge
- Message uses distinct styling (blue border, light blue background)

### Test 3: Hide Other Users' Pending Messages
**Requirement**: 9.3

**Steps**:
1. Have another user send a message to the same channel
2. Verify that the pending message from the other user is NOT visible
3. After the owner approves the message, verify it becomes visible

**Expected Result**:
- Other users' pending messages are not displayed
- Once approved, the message appears in the list

### Test 4: Show Anonymous Identities
**Requirement**: 9.1, 9.4

**Steps**:
1. View messages in the channel
2. Verify each message displays:
   - Anonymous name (e.g., "Anonymous Panda")
   - Icon with background color
   - Timestamp

**Expected Result**:
- Each message shows complete identity information
- Icon background color matches the assigned color
- Name and icon are consistent for the same user

### Test 5: Infinite Scroll Pagination
**Requirement**: 9.5, 11.1, 11.2, 11.3, 11.5

**Steps**:
1. Join a channel with more than 15 messages
2. Verify only 15 most recent messages are loaded initially
3. Scroll to the top of the message list
4. Verify that 10 more older messages are loaded
5. Continue scrolling until all messages are loaded
6. Verify "Beginning of conversation" indicator appears

**Expected Result**:
- Initial load shows 15 messages
- Scrolling to top loads 10 more messages
- Loading indicator appears while fetching
- "Beginning of conversation" appears when no more messages exist

### Test 6: Long Message Collapse/Expand
**Requirement**: 12.1, 12.2, 12.3, 12.4, 12.5

**Steps**:
1. View a message with more than 400 characters
2. Verify the message is collapsed by default
3. Click the "Show more" button
4. Verify the full message is displayed
5. Click the "Show less" button
6. Verify the message returns to collapsed state

**Expected Result**:
- Messages >400 characters are collapsed by default
- Expand/collapse buttons work correctly
- Full content is preserved

### Test 7: Real-time Message Updates
**Requirement**: 9.4, 10.2

**Steps**:
1. Join a channel
2. Have the owner approve a pending message
3. Verify the message appears in real-time without refresh

**Expected Result**:
- New approved messages appear immediately
- No page refresh required
- Message is inserted at the correct position

### Test 8: Message Rejection Handling
**Requirement**: 8.4, 10.4

**Steps**:
1. Send a message as an anonymous user
2. Have the owner reject the message
3. Verify the message is removed from the list
4. Verify an alert notification appears

**Expected Result**:
- Rejected message is removed from the list
- User receives notification about rejection

## Integration Test

### Full User Flow
1. Join channel with channel code
2. Receive anonymous identity
3. View initial 15 messages
4. Scroll to load older messages
5. Send a new message
6. See own pending message
7. Wait for approval
8. See message become approved
9. Verify message visibility rules throughout

## Performance Considerations
- Initial load should be fast (<1 second)
- Pagination should load smoothly
- Real-time updates should appear within 1 second
- No memory leaks from WebSocket connections

## Browser Compatibility
Test in:
- Chrome
- Firefox
- Safari
- Edge

## Notes
- The component uses DOM-based method exposure for WebSocket integration
- Infinite scroll uses IntersectionObserver API
- Component is fully client-side rendered ('use client')
