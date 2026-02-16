'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { AnonymousUser, Channel, MessageWithIdentity } from '@/types/database'
import AnonymousMessageList from '@/components/AnonymousMessageList'
import MessageInput from '@/components/MessageInput'

export default function ChannelPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const channelId = params.id as string
  const channelCode = searchParams.get('code')

  const [socket, setSocket] = useState<Socket | null>(null)
  const [identity, setIdentity] = useState<AnonymousUser | null>(null)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<MessageWithIdentity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectionNotification, setRejectionNotification] = useState<string | null>(null)

  const sessionIdRef = useRef<string>('')

  // Generate new session ID on each page load (for new avatar on refresh)
  useEffect(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    sessionIdRef.current = sessionId
  }, [channelId])

  // Establish WebSocket connection
  useEffect(() => {
    if (!channelId || !sessionIdRef.current) return

    const newSocket = io({
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('Socket connected')
      
      // Join channel
      newSocket.emit('join_channel', {
        channelId,
        sessionId: sessionIdRef.current,
        isOwner: false
      })
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    newSocket.on('identity_assigned', async (data: { anonUser: AnonymousUser }) => {
      console.log('Identity assigned:', data.anonUser)
      setIdentity(data.anonUser)
      
      // Reload messages with anonymous user ID to include own pending messages
      try {
        const response = await fetch(`/api/channels/${channelId}/messages?anonUserId=${data.anonUser.id}`)
        if (response.ok) {
          const messageData = await response.json()
          setMessages(messageData.messages || [])
        }
      } catch (err) {
        console.error('Failed to reload messages with identity:', err)
      }
    })

    newSocket.on('joined_channel', async (data: { channelId: string; isOwner: boolean; channel: Channel }) => {
      console.log('Joined channel:', data)
      setChannel(data.channel)
      setLoading(false)
    })

    newSocket.on('message_sent', (data: { message: MessageWithIdentity }) => {
      console.log('Message sent (pending):', data.message)
      // Add own pending message to the list
      setMessages(prev => [...prev, data.message])
    })

    newSocket.on('new_message', (data: { message: MessageWithIdentity }) => {
      console.log('New message received:', data.message)
      setMessages(prev => {
        // Check if message already exists (was pending)
        const existingIndex = prev.findIndex(m => m.id === data.message.id);
        if (existingIndex !== -1) {
          // Update the existing message (pending -> approved)
          const updated = [...prev];
          updated[existingIndex] = data.message;
          return updated;
        }
        // Add new message at the end (bottom)
        return [...prev, data.message]
      })
    })

    newSocket.on('message_rejected', (data: { messageId: string }) => {
      console.log('Message rejected:', data.messageId)
      setMessages(prev => prev.filter(m => m.id !== data.messageId))
      setRejectionNotification('Your message was rejected by the channel owner')
      setTimeout(() => setRejectionNotification(null), 5000)
    })

    newSocket.on('channel_closed', () => {
      setChannel(prev => prev ? { ...prev, status: 'closed' } : null)
    })

    newSocket.on('channel_opened', () => {
      setChannel(prev => prev ? { ...prev, status: 'open' } : null)
    })

    newSocket.on('error', (data: { code: string; message: string }) => {
      console.error('Socket error:', data)
      setError(data.message)
      setLoading(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [channelId])

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Joining channel...</p>
        </div>
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
            onClick={() => router.push('/')}
            style={styles.button}
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.channelName}>{channel?.name || 'Channel'}</h1>
          <p style={styles.channelCode}>Code: {channelCode}</p>
          {channel?.status === 'closed' && (
            <p style={styles.closedBadge}>Channel Closed</p>
          )}
        </div>
        {identity && (
          <div style={styles.identityCard}>
            <div 
              style={{
                ...styles.identityIcon,
                backgroundColor: identity.icon_background_color
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={identity.icon_url} 
                alt={identity.name}
                style={styles.iconImage}
              />
            </div>
            <span style={styles.identityName}>{identity.name}</span>
          </div>
        )}
      </div>

      <div style={styles.content}>
        <div style={styles.messagesContainer}>
          {rejectionNotification && (
            <div style={styles.notification}>
              <span style={styles.notificationText}>{rejectionNotification}</span>
              <button 
                onClick={() => setRejectionNotification(null)}
                style={styles.notificationClose}
              >
                ×
              </button>
            </div>
          )}
          <AnonymousMessageList
            channelId={channelId}
            initialMessages={messages}
          />
        </div>

        <MessageInput 
          socket={socket}
          channelId={channelId}
          sessionId={sessionIdRef.current}
          isChannelClosed={channel?.status === 'closed'}
        />
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  headerContent: {
    flex: 1,
  },
  channelName: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px 0',
  },
  channelCode: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  },
  closedBadge: {
    display: 'inline-block',
    marginTop: '8px',
    padding: '4px 12px',
    backgroundColor: '#fee',
    color: '#c00',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
  },
  identityCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
  },
  identityIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: '24px',
    height: '24px',
  },
  identityName: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    padding: '20px',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    marginBottom: '20px',
    overflowY: 'auto' as const,
    maxHeight: 'calc(100vh - 300px)',
    position: 'relative' as const,
  },
  notification: {
    position: 'absolute' as const,
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#fee',
    color: '#c00',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #fcc',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 1000,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  notificationText: {
    fontSize: '14px',
    fontWeight: '500',
  },
  notificationClose: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#c00',
    cursor: 'pointer',
    padding: '0',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
