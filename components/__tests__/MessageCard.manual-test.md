# MessageCard Manual Test

## Test: Message Collapse/Expand Functionality

### Test Case 1: Short Message (≤400 characters)
**Input**: Message with 100 characters
**Expected**: 
- Full message content displayed
- No expand/collapse button shown

### Test Case 2: Long Message - Initial State (>400 characters)
**Input**: Message with 500 characters
**Expected**:
- First 400 characters displayed + "..."
- "▼ Show more" button visible
- Message is in collapsed state

### Test Case 3: Long Message - Expand
**Input**: Click "▼ Show more" button on collapsed message
**Expected**:
- Full message content displayed
- Button changes to "▲ Show less"
- Message is in expanded state

### Test Case 4: Long Message - Collapse
**Input**: Click "▲ Show less" button on expanded message
**Expected**:
- First 400 characters displayed + "..."
- Button changes to "▼ Show more"
- Message returns to collapsed state

### Test Case 5: Exactly 400 Characters
**Input**: Message with exactly 400 characters
**Expected**:
- Full message content displayed
- No expand/collapse button shown (not considered "long")

### Test Case 6: 401 Characters
**Input**: Message with 401 characters
**Expected**:
- First 400 characters displayed + "..."
- "▼ Show more" button visible
- Message is in collapsed state

## Implementation Verification

### Requirement 12.1: Messages >400 characters displayed in collapsed state by default
✅ Implemented in MessageCard.tsx:
- Line 26: `const isLongMessage = message.content.length > 400`
- Line 20: `const [isExpanded, setIsExpanded] = useState(false)`

### Requirement 12.2: Collapsed messages show expand icon button
✅ Implemented in MessageCard.tsx:
- Lines 71-78: Conditionally renders button when `shouldShowToggle` is true
- Shows "▼ Show more" when not expanded

### Requirement 12.3: Clicking expand shows full message content
✅ Implemented in MessageCard.tsx:
- Line 22-24: `toggleExpand` function toggles state
- Line 28-30: `displayContent` shows full content when expanded

### Requirement 12.4: Expanded messages show collapse icon button
✅ Implemented in MessageCard.tsx:
- Lines 71-78: Shows "▲ Show less" when expanded

### Requirement 12.5: Clicking collapse returns to collapsed state
✅ Implemented in MessageCard.tsx:
- Line 22-24: `toggleExpand` function toggles state back to collapsed

## Component Reusability

The MessageCard component is designed to be reusable:
- Used in OwnerMessageList for channel owner view
- Can be used in anonymous user message list (task 13.6)
- Supports optional approval controls via props
- Self-contained collapse/expand state management

## Code Quality

- ✅ TypeScript types properly defined
- ✅ No TypeScript diagnostics errors
- ✅ Clean separation of concerns
- ✅ Accessible button elements with proper type="button"
- ✅ Responsive styling with inline styles
- ✅ Proper state management with React hooks
