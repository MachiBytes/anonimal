'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageWithIdentity } from '@/types/database'
import MessageCard from './MessageCard'

interface OwnerMessageListProps {
  messages: MessageWithIdentity[]
  onApprove: (messageId: string) => void
  onReject: (messageId: string) => void
}

export default function OwnerMessageList({ messages, onApprove, onReject }: OwnerMessageListProps) {
  const [processingMessages, setProcessingMessages] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
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

  const handleApprove = async (messageId: string) => {
    setProcessingMessages(prev => new Set(prev).add(messageId))
    try {
      await onApprove(messageId)
    } finally {
      setProcessingMessages(prev => {
        const newSet = new Set(prev)
        newSet.delete(messageId)
        return newSet
      })
    }
  }

  const handleReject = async (messageId: string) => {
    setProcessingMessages(prev => new Set(prev).add(messageId))
    try {
      await onReject(messageId)
    } finally {
      setProcessingMessages(prev => {
        const newSet = new Set(prev)
        newSet.delete(messageId)
        return newSet
      })
    }
  }

  if (messages.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>No messages yet</p>
        <p style={styles.emptySubtext}>Messages will appear here when users send them</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {messages.map(message => (
        <MessageCard
          key={message.id}
          message={message}
          showApprovalControls={true}
          onApprove={handleApprove}
          onReject={handleReject}
          isProcessing={processingMessages.has(message.id)}
        />
      ))}
      
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
}
