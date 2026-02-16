# MessageInput Component - Manual Test Plan

## Task 13.4: Create message input component

### Requirements Coverage

- **Requirement 7.1**: Text input for message content
- **Requirement 7.5**: Submit button
- **Requirement 7.6**: Connect to WebSocket send_message event
- **Requirement 4.2**: Disable when channel is closed

---

## Test Cases

### Test 1: Text Input for Message Content (Requirement 7.1)

**Steps:**
1. Navigate to a channel as an anonymous user
2. Locate the message input area at the bottom of the page
3. Click on the textarea

**Expected Results:**
- ✓ A textarea should be visible with placeholder "Type your message..."
- ✓ The textarea should accept text input
- ✓ The textarea should support multi-line input
- ✓ The textarea should be resizable vertically

---

### Test 2: Submit Button (Requirement 7.5)

**Steps:**
1. Navigate to a channel as an anonymous user
2. Locate the "Send Message" button

**Expected Results:**
- ✓ A "Send Message" button should be visible
- ✓ The button should be disabled when the textarea is empty
- ✓ The button should be enabled when text is entered in the textarea
- ✓ The button should be disabled when only whitespace is entered

**Test Variations:**
- Empty textarea → Button disabled
- Type "Hello" → Button enabled
- Type "   " (spaces only) → Button disabled
- Type "Hello" then delete all → Button disabled

---

### Test 3: WebSocket send_message Event (Requirement 7.6)

**Steps:**
1. Navigate to a channel as an anonymous user
2. Type a message in the textarea (e.g., "Test message")
3. Click the "Send Message" button

**Expected Results:**
- ✓ The message should be sent via WebSocket with event name "send_message"
- ✓ The payload should include: channelId, content (trimmed), sessionId
- ✓ The textarea should be cleared after sending
- ✓ The message should appear in the message list with "pending approval" indicator
- ✓ Whitespace should be trimmed from the message content

**Test Variations:**
- Send "Test message" → Should send "Test message"
- Send "  Test message  " → Should send "Test message" (trimmed)
- Send multi-line message → Should preserve newlines
- Send very long message (>10,000 chars) → Should send complete message

---

### Test 4: Disable When Channel is Closed (Requirement 4.2)

**Steps:**
1. Navigate to a channel as an anonymous user
2. Have the channel owner close the channel
3. Observe the message input component

**Expected Results:**
- ✓ The textarea should be disabled
- ✓ The placeholder should change to "Channel is closed"
- ✓ The "Send Message" button should be disabled
- ✓ Attempting to submit should not send any message
- ✓ The component should visually indicate it's disabled (grayed out)

**Alternative Test:**
1. Navigate to a channel that is already closed
2. Verify the input is disabled from the start

---

### Test 5: Edge Cases

#### Test 5.1: No Socket Connection
**Steps:**
1. Disconnect the WebSocket
2. Try to send a message

**Expected Results:**
- ✓ Should not throw an error
- ✓ Should not send the message

#### Test 5.2: Special Characters
**Steps:**
1. Type a message with special characters: `<script>alert("xss")</script> & "quotes"`
2. Send the message

**Expected Results:**
- ✓ Should send the message with all special characters intact
- ✓ Should not execute any scripts

#### Test 5.3: Very Long Message
**Steps:**
1. Type or paste a message with 10,000+ characters
2. Send the message

**Expected Results:**
- ✓ Should accept the full message
- ✓ Should send the complete message without truncation

#### Test 5.4: Rapid Submissions
**Steps:**
1. Type a message
2. Click "Send Message" multiple times rapidly

**Expected Results:**
- ✓ Should only send the message once
- ✓ Should not cause errors or duplicate messages

---

## Integration Tests

### Integration Test 1: Complete Message Flow
**Steps:**
1. Anonymous user joins channel
2. Types message "Hello from anonymous user"
3. Clicks "Send Message"
4. Channel owner approves the message

**Expected Results:**
- ✓ Message appears as pending for sender
- ✓ Message appears as pending for owner
- ✓ After approval, message appears as approved for all users
- ✓ Textarea is cleared after sending

### Integration Test 2: Channel Close During Typing
**Steps:**
1. Anonymous user starts typing a message
2. Channel owner closes the channel
3. Anonymous user tries to send the message

**Expected Results:**
- ✓ Input becomes disabled when channel closes
- ✓ Message cannot be sent
- ✓ User sees "Channel is closed" placeholder

---

## Accessibility Tests

### Test A1: Keyboard Navigation
**Steps:**
1. Use Tab key to navigate to the textarea
2. Type a message
3. Use Tab key to navigate to the button
4. Press Enter or Space to submit

**Expected Results:**
- ✓ Can navigate to textarea with keyboard
- ✓ Can navigate to button with keyboard
- ✓ Can submit with keyboard

### Test A2: Screen Reader
**Steps:**
1. Use a screen reader to navigate the component

**Expected Results:**
- ✓ Textarea is properly labeled
- ✓ Button state (enabled/disabled) is announced
- ✓ Placeholder text is read correctly

---

## Performance Tests

### Test P1: Large Message Handling
**Steps:**
1. Paste a 50,000 character message
2. Observe performance

**Expected Results:**
- ✓ UI remains responsive
- ✓ No lag when typing
- ✓ Message sends successfully

---

## Browser Compatibility

Test the component in:
- ✓ Chrome/Edge (Chromium)
- ✓ Firefox
- ✓ Safari
- ✓ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Summary

This component implements all requirements for task 13.4:
- ✅ Text input for message content (Requirement 7.1)
- ✅ Submit button (Requirement 7.5)
- ✅ Disable when channel is closed (Requirement 4.2)
- ✅ Connect to WebSocket send_message event (Requirement 7.6)

The component is properly extracted from the page component, making it reusable and testable.
