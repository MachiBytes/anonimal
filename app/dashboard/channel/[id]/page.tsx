'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Channel, MessageWithIdentity } from '@/types/database'
import OwnerMessageList from '@/components/OwnerMessageList'
import { io, Socket } from 'socket.io-client'

export default function ChannelMessagesPage() {
  const params = useParams()
  const router = useRouter()
  const channelId = params.id as string

  const [channel, setChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<MessageWithIdentity[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setUserId(data.user.id)
          loadChannel()
          loadMessages()
          setupWebSocket(data.user.id)
        } else {
          router.push('/')
        }
      } else {
        router.push('/')
      }
    } catch {
      console.error('Auth check failed')
      router.push('/')
    }
  }

  const loadChannel = async () => {
    try {
      const response = await fetch(`/api/channels/${channelId}`)
      if (response.ok) {
        const data = await response.json()
        setChannel(data.channel)
      } else {
        setError('Failed to load channel')
      }
    } catch {
      setError('Failed to load channel')
    }
  }

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/channels/${channelId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      } else {
        setError('Failed to load messages')
      }
    } catch (error) {
      setError('Failed to load messages')
      console.error('Load messages error:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupWebSocket = (uid: string) => {
    const newSocket = io({
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket')
      newSocket.emit('join_channel', {
        channelId,
        sessionId: 'owner-session',
        isOwner: true,
        userId: uid,
      })
    })

    newSocket.on('message_pending', (data: { message: MessageWithIdentity }) => {
      console.log('Message pending:', data.message)
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m.id === data.message.id)) {
          return prev
        }
        // Add new pending message at the end (bottom)
        return [...prev, data.message]
      })
    })

    newSocket.on('new_message', (data: { message: MessageWithIdentity }) => {
      console.log('Message approved:', data.message)
      setMessages(prev => 
        prev.map(m => m.id === data.message.id ? data.message : m)
      )
    })

    newSocket.on('channel_closed', () => {
      setChannel(prev => prev ? { ...prev, status: 'closed' } : null)
    })

    newSocket.on('channel_opened', () => {
      setChannel(prev => prev ? { ...prev, status: 'open' } : null)
    })

    newSocket.on('error', (data: { code: string; message: string }) => {
      console.error('WebSocket error:', data)
      setError(data.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }

  const handleApprove = async (messageId: string) => {
    if (!socket) return

    socket.emit('approve_message', {
      messageId,
      userId,
    })
  }

  const handleReject = async (messageId: string) => {
    if (!socket) return

    socket.emit('reject_message', {
      messageId,
      userId,
    })

    setMessages(prev => prev.filter(m => m.id !== messageId))
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading messages...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2 style={styles.errorTitle}>Error</h2>
          <p style={styles.errorText}>{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            style={styles.button}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          onClick={() => router.push('/dashboard')}
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>
        <div style={styles.headerContent}>
          <h1 style={styles.channelName}>{channel?.name || 'Channel'}</h1>
          <div style={styles.statusContainer}>
            <span style={styles.statusLabel}>Status:</span>
            <span
              style={{
                ...styles.statusBadge,
                ...(channel?.status === 'open' ? styles.statusOpen : styles.statusClosed),
              }}
            >
              {channel?.status}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.messagesContainer}>
          <OwnerMessageList
            messages={messages}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #0070f3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '16px',
    color: '#666',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#e53e3e',
    marginBottom: '12px',
  },
  errorText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#0070f3',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  header: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
    padding: '20px',
  },
  backButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#0070f3',
    backgroundColor: 'transparent',
    border: '1px solid #0070f3',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  channelName: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#666',
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '500',
    padding: '4px 12px',
    borderRadius: '12px',
    textTransform: 'uppercase' as const,
  },
  statusOpen: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusClosed: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    padding: '20px',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    overflowY: 'auto' as const,
    maxHeight: 'calc(100vh - 200px)',
  },
}
