import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AnonymousMessageList from '../AnonymousMessageList'
import { MessageWithIdentity } from '@/types/database'

// Mock fetch
global.fetch = jest.fn()

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return [] }
  unobserve() {}
}

describe('AnonymousMessageList', () => {
  const mockMessages: MessageWithIdentity[] = [
    {
      id: '1',
      channel_id: 'channel-1',
      anon_user_id: 'user-1',
      content: 'Approved message from user 1',
      status: 'approved',
      sent_at: new Date('2024-01-01T10:00:00Z'),
      approved_at: new Date('2024-01-01T10:01:00Z'),
      anon_user: {
        name: 'Anonymous Panda',
        icon_url: '/icons/panda.svg',
        icon_background_color: 'rgb(0,163,187)'
      }
    },
    {
      id: '2',
      channel_id: 'channel-1',
      anon_user_id: 'user-2',
      content: 'Approved message from user 2',
      status: 'approved',
      sent_at: new Date('2024-01-01T09:00:00Z'),
      approved_at: new Date('2024-01-01T09:01:00Z'),
      anon_user: {
        name: 'Anonymous Tiger',
        icon_url: '/icons/tiger.svg',
        icon_background_color: 'rgb(161,60,180)'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays approved messages from all users', () => {
    render(
      <AnonymousMessageList
        channelId="channel-1"
        anonUserId="user-1"
        initialMessages={mockMessages}
      />
    )

    expect(screen.getByText('Approved message from user 1')).toBeInTheDocument()
    expect(screen.getByText('Approved message from user 2')).toBeInTheDocument()
  })

  it('displays own pending messages with indicator', () => {
    const messagesWithPending: MessageWithIdentity[] = [
      ...mockMessages,
      {
        id: '3',
        channel_id: 'channel-1',
        anon_user_id: 'user-1',
        content: 'My pending message',
        status: 'pending',
        sent_at: new Date('2024-01-01T11:00:00Z'),
        approved_at: null,
        anon_user: {
          name: 'Anonymous Panda',
          icon_url: '/icons/panda.svg',
          icon_background_color: 'rgb(0,163,187)'
        }
      }
    ]

    render(
      <AnonymousMessageList
        channelId="channel-1"
        anonUserId="user-1"
        initialMessages={messagesWithPending}
      />
    )

    expect(screen.getByText('My pending message')).toBeInTheDocument()
    expect(screen.getByText('Pending Approval')).toBeInTheDocument()
  })

  it('shows empty state when no messages', () => {
    render(
      <AnonymousMessageList
        channelId="channel-1"
        anonUserId="user-1"
        initialMessages={[]}
      />
    )

    expect(screen.getByText('No messages yet')).toBeInTheDocument()
    expect(screen.getByText('Be the first to send a message!')).toBeInTheDocument()
  })

  it('shows "Beginning of conversation" when no more messages to load', () => {
    const fewMessages: MessageWithIdentity[] = [mockMessages[0]]

    render(
      <AnonymousMessageList
        channelId="channel-1"
        anonUserId="user-1"
        initialMessages={fewMessages}
      />
    )

    expect(screen.getByText('Beginning of conversation')).toBeInTheDocument()
  })

  it('displays anonymous identities with name, icon, and color', () => {
    render(
      <AnonymousMessageList
        channelId="channel-1"
        anonUserId="user-1"
        initialMessages={mockMessages}
      />
    )

    expect(screen.getByText('Anonymous Panda')).toBeInTheDocument()
    expect(screen.getByText('Anonymous Tiger')).toBeInTheDocument()
  })

  it('exposes addMessage method via DOM', () => {
    const { container } = render(
      <AnonymousMessageList
        channelId="channel-1"
        anonUserId="user-1"
        initialMessages={mockMessages}
      />
    )

    const element = container.querySelector('#message-list-channel-1')
    expect(element).toBeTruthy()
    
    // Wait for useEffect to attach methods
    waitFor(() => {
      expect((element as HTMLElement & { addMessage?: unknown }).addMessage).toBeDefined()
      expect((element as HTMLElement & { removeMessage?: unknown }).removeMessage).toBeDefined()
    })
  })

  it('exposes removeMessage method via DOM', () => {
    const { container } = render(
      <AnonymousMessageList
        channelId="channel-1"
        initialMessages={mockMessages}
      />
    )

    const element = container.querySelector('#message-list-channel-1')
    
    waitFor(() => {
      expect((element as HTMLElement & { removeMessage?: unknown }).removeMessage).toBeDefined()
    })
  })
})
