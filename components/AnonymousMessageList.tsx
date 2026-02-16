'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageWithIdentity } from '@/types/database'
import MessageCard from './MessageCard'

interface AnonymousMessageListProps {
  channelId: string
  initialMessages: MessageWithIdentity[]
}

export default function AnonymousMessageList({ 
  channelId, 
  initialMessages
}: AnonymousMessageListProps) {
  const [messages, setMessages] = useState<MessageWithIdentity[]>(initialMessages)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialMessages.length === 15)
  const [cursor, setCursor] = useState<string | null>(() => {
    if (initialMessages.length === 0) return null;
    const firstMessage = initialMessages[0];
    if (!firstMessage.approved_at) return null;
    
    // Handle both Date objects and ISO strings
    return typeof firstMessage.approved_at === 'string' 
      ? firstMessage.approved_at 
      : firstMessage.approved_at.toISOString();
  })
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const prevInitialMessagesRef = useRef<MessageWithIdentity[]>(initialMessages)
  const isInitialMount = useRef(true)

  // Auto-scroll to bottom on initial mount and when new messages arrive
  useEffect(() => {
    if (isInitialMount.current) {
      // Scroll to bottom on initial load
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
      isInitialMount.current = false
    } else {
      // Smooth scroll for new messages
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  // Update messages when initialMessages changes (from parent state)
  useEffect(() => {
    if (initialMessages !== prevInitialMessagesRef.current) {
      setMessages(initialMessages)
      prevInitialMessagesRef.current = initialMessages
    }
  }, [initialMessages])

  // Load more messages when scrolling to top
  const loadMoreMessages = useCallback(async () => {
    if (loading || !hasMore || !cursor) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/channels/${channelId}/messages?cursor=${encodeURIComponent(cursor)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        // Prepend older messages to the beginning
        setMessages(prev => [...data.messages, ...prev])
        setHasMore(data.hasMore)
        setCursor(data.cursor)
      }
    } catch (error) {
      console.error('Failed to load more messages:', error)
    } finally {
      setLoading(false)
    }
  }, [channelId, cursor, hasMore, loading])

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreMessages()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, loadMoreMessages])

  if (messages.length === 0) {
    return (
      <div id={`message-list-${channelId}`} style={styles.emptyState}>
        <p style={styles.emptyText}>No messages yet</p>
        <p style={styles.emptySubtext}>Be the first to send a message!</p>
      </div>
    )
  }

  return (
    <div id={`message-list-${channelId}`} style={styles.container}>
      {hasMore && (
        <div ref={loadMoreRef} style={styles.loadMoreTrigger}>
          {loading && (
            <div style={styles.loadingIndicator}>
              <div style={styles.spinner}></div>
              <span style={styles.loadingText}>Loading older messages...</span>
            </div>
          )}
        </div>
      )}
      
      {!hasMore && messages.length > 0 && (
        <div style={styles.endOfMessages}>
          <span style={styles.endText}>Beginning of conversation</span>
        </div>
      )}

      <div style={styles.messagesList}>
        {messages.map(message => (
          <MessageCard
            key={message.id}
            message={message}
            showApprovalControls={false}
          />
        ))}
      </div>
      
      {/* Invisible element at the bottom for auto-scroll */}
      <div ref={messagesEndRef} />
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '20px',
    overflowY: 'auto' as const,
    height: '100%',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#666',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#999',
    margin: 0,
  },
  loadMoreTrigger: {
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid #e0e0e0',
    borderTop: '3px solid #0070f3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#666',
  },
  endOfMessages: {
    textAlign: 'center' as const,
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
    marginBottom: '8px',
  },
  endText: {
    fontSize: '13px',
    color: '#999',
    fontStyle: 'italic' as const,
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
}
