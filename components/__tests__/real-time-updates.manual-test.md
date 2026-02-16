# Manual Test: Real-Time Message Updates

## Test Objective
Verify that real-time message updates work correctly for anonymous users in a channel.

## Prerequisites
- Running application with WebSocket server
- At least one channel created
- Channel owner logged in
- Anonymous user joined the channel

## Test Cases

### Test Case 1: Receive Approved Message
**Steps:**
1. Open channel as anonymous user in Browser A
2. Open same channel as owner in Browser B
3. Send a message as anonymous user in Browser A
4. Approve the message as owner in Browser B
5. Observe Browser A

**Expected Result:**
- Message appears in Browser A immediately (within 1 second)
- Message shows approved status (no "pending" indicator)
- Message displays with correct anonymous identity (name, icon, color)

**Validates:** Requirements 8.4, 9.4, 10.2

---

### Test Case 2: Receive Rejected Message Notification
**Steps:**
1. Open channel as anonymous user in Browser A
2. Open same channel as owner in Browser B
3. Send a message as anonymous user in Browser A
4. Reject the message as owner in Browser B
5. Observe Browser A

**Expected Result:**
- Message disappears from Browser A immediately (within 1 second)
- Notification appears: "Your message was rejected by the channel owner"
- Notification is dismissible (has close button)
- Notification auto-dismisses after 5 seconds

**Validates:** Requirements 8.4, 10.3

---

### Test Case 3: Multiple Users Receive Same Message
**Steps:**
1. Open channel as anonymous user in Browser A
2. Open same channel as anonymous user in Browser B
3. Open same channel as owner in Browser C
4. Send a message as user in Browser A
5. Approve the message as owner in Browser C
6. Observe all browsers

**Expected Result:**
- Message appears in Browser A (sender)
- Message appears in Browser B (other anonymous user)
- Message appears in Browser C (owner)
- All see the same message content and identity
- All updates happen within 1 second

**Validates:** Requirements 8.2, 9.4, 10.2

---

### Test Case 4: Message Deduplication
**Steps:**
1. Open channel as anonymous user
2. Send a message
3. Observe if message appears twice (once from message_sent, once from new_message after approval)

**Expected Result:**
- Message appears only once in the list
- No duplicate messages even if multiple events are received
- Message ID is used to prevent duplicates

**Validates:** Code correctness

---

### Test Case 5: Notification Dismissal
**Steps:**
1. Open channel as anonymous user in Browser A
2. Open same channel as owner in Browser B
3. Send a message as anonymous user in Browser A
4. Reject the message as owner in Browser B
5. Click the × button on the notification in Browser A

**Expected Result:**
- Notification disappears immediately when × is clicked
- No errors in console

**Validates:** UI functionality

---

### Test Case 6: Auto-Dismiss Notification
**Steps:**
1. Open channel as anonymous user in Browser A
2. Open same channel as owner in Browser B
3. Send a message as anonymous user in Browser A
4. Reject the message as owner in Browser B
5. Wait 5 seconds without clicking anything

**Expected Result:**
- Notification appears immediately
- Notification automatically disappears after 5 seconds
- No errors in console

**Validates:** UI functionality

---

## Notes
- All WebSocket events should be logged to console for debugging
- Check browser console for any errors during testing
- Verify network tab shows WebSocket connection is established
- Test with different network conditions (slow 3G) to verify sub-second delivery
