/**
 * Test: Message Collapse/Expand in Anonymous View
 * 
 * This test verifies that the MessageCard component's collapse/expand
 * functionality works correctly when used in the AnonymousMessageList.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { render, screen } from '@testing-library/react'
import AnonymousMessageList from '../AnonymousMessageList'
import { MessageWithIdentity } from '@/types/database'

describe('AnonymousMessageList - Message Collapse/Expand', () => {
  const mockChannelId = 'test-channel-id'
  const mockAnonUserId = 'test-anon-user-id'

  const createMessage = (content: string, id: string = 'msg-1'): MessageWithIdentity => ({
    id,
    channel_id: mockChannelId,
    anon_user_id: mockAnonUserId,
    content,
    status: 'approved',
    sent_at: new Date('2024-01-01T10:00:00Z'),
    approved_at: new Date('2024-01-01T10:01:00Z'),
    anon_user: {
      id: mockAnonUserId,
      channel_id: mockChannelId,
      session_id: 'session-1',
      name: 'Anonymous Panda',
      icon_url: '/icons/panda.svg',
      icon_background_color: 'rgb(0,163,187)',
      created_at: new Date('2024-01-01T09:00:00Z'),
    },
  })

  test('short messages display fully without collapse button', () => {
    const shortMessage = createMessage('This is a short message.')
    
    render(
      <AnonymousMessageList
        channelId={mockChannelId}
        anonUserId={mockAnonUserId}
        initialMessages={[shortMessage]}
      />
    )

    // Message content should be visible
    expect(screen.getByText('This is a short message.')).toBeInTheDocument()
    
    // No expand/collapse button should be present
    expect(screen.queryByText(/Show more/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Show less/i)).not.toBeInTheDocument()
  })

  test('long messages (>400 chars) display in collapsed state by default', () => {
    // Create a message with 500 characters
    const longContent = 'A'.repeat(500)
    const longMessage = createMessage(longContent, 'msg-long')
    
    render(
      <AnonymousMessageList
        channelId={mockChannelId}
        anonUserId={mockAnonUserId}
        initialMessages={[longMessage]}
      />
    )

    // Should show truncated content (first 400 chars + "...")
    const displayedText = screen.getByText(/A{400}\.\.\./)
    expect(displayedText).toBeInTheDocument()
    
    // Should show expand button
    expect(screen.getByText(/Show more/i)).toBeInTheDocument()
  })

  test('messages with exactly 400 characters do not show collapse button', () => {
    const exactContent = 'B'.repeat(400)
    const exactMessage = createMessage(exactContent, 'msg-exact')
    
    render(
      <AnonymousMessageList
        channelId={mockChannelId}
        anonUserId={mockAnonUserId}
        initialMessages={[exactMessage]}
      />
    )

    // Full content should be visible
    expect(screen.getByText(exactContent)).toBeInTheDocument()
    
    // No expand/collapse button
    expect(screen.queryByText(/Show more/i)).not.toBeInTheDocument()
  })

  test('messages with 401 characters show collapse button', () => {
    const content401 = 'C'.repeat(401)
    const message401 = createMessage(content401, 'msg-401')
    
    render(
      <AnonymousMessageList
        channelId={mockChannelId}
        anonUserId={mockAnonUserId}
        initialMessages={[message401]}
      />
    )

    // Should show truncated content
    const displayedText = screen.getByText(/C{400}\.\.\./)
    expect(displayedText).toBeInTheDocument()
    
    // Should show expand button
    expect(screen.getByText(/Show more/i)).toBeInTheDocument()
  })

  test('multiple messages with mixed lengths display correctly', () => {
    const messages = [
      createMessage('Short message 1', 'msg-1'),
      createMessage('D'.repeat(500), 'msg-2'),
      createMessage('Short message 2', 'msg-3'),
      createMessage('E'.repeat(450), 'msg-4'),
    ]
    
    render(
      <AnonymousMessageList
        channelId={mockChannelId}
        anonUserId={mockAnonUserId}
        initialMessages={messages}
      />
    )

    // Short messages should be fully visible
    expect(screen.getByText('Short message 1')).toBeInTheDocument()
    expect(screen.getByText('Short message 2')).toBeInTheDocument()
    
    // Long messages should be truncated
    expect(screen.getByText(/D{400}\.\.\./)).toBeInTheDocument()
    expect(screen.getByText(/E{400}\.\.\./)).toBeInTheDocument()
    
    // Should have 2 expand buttons (one for each long message)
    const expandButtons = screen.getAllByText(/Show more/i)
    expect(expandButtons).toHaveLength(2)
  })

  test('empty message list shows empty state', () => {
    render(
      <AnonymousMessageList
        channelId={mockChannelId}
        anonUserId={mockAnonUserId}
        initialMessages={[]}
      />
    )

    expect(screen.getByText('No messages yet')).toBeInTheDocument()
    expect(screen.getByText('Be the first to send a message!')).toBeInTheDocument()
  })
})
