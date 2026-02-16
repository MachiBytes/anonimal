'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Channel } from '@/types/database'

interface ChannelManagementProps {
  channel: Channel
  onChannelUpdated: (channel: Channel) => void
  userId?: string
}

export default function ChannelManagement({ channel, onChannelUpdated }: ChannelManagementProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  const handleStatusToggle = async () => {
    const newStatus = channel.status === 'open' ? 'closed' : 'open'
    
    setIsUpdating(true)
    setError('')

    try {
      const response = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const data = await response.json()
        onChannelUpdated(data.channel)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update channel status')
      }
    } catch (error) {
      setError('Failed to update channel status')
      console.error('Update error:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(channel.code)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  const handleViewMessages = () => {
    router.push(`/dashboard/channel/${channel.id}`)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.channelName}>{channel.name}</h2>
          <div style={styles.statusContainer}>
            <span style={styles.statusLabel}>Status:</span>
            <span
              style={{
                ...styles.statusBadge,
                ...(channel.status === 'open' ? styles.statusOpen : styles.statusClosed),
              }}
            >
              {channel.status}
            </span>
          </div>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Channel Code</h3>
        <div style={styles.codeContainer}>
          <div style={styles.codeDisplay}>
            <span style={styles.codeValue}>{channel.code}</span>
          </div>
          <button
            onClick={handleCopyCode}
            style={styles.copyButton}
            type="button"
          >
            {copySuccess ? '✓ Copied!' : 'Copy Code'}
          </button>
        </div>
        <p style={styles.codeHelp}>
          Share this code with your audience so they can join your channel
        </p>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Channel Controls</h3>
        <button
          onClick={handleStatusToggle}
          style={{
            ...styles.statusButton,
            ...(channel.status === 'open' ? styles.closeButton : styles.openButton),
          }}
          disabled={isUpdating}
          type="button"
        >
          {isUpdating
            ? 'Updating...'
            : channel.status === 'open'
            ? 'Close Channel'
            : 'Reopen Channel'}
        </button>
        <p style={styles.statusHelp}>
          {channel.status === 'open'
            ? 'Closing the channel will prevent new messages while preserving message history'
            : 'Reopening the channel will allow users to send new messages again'}
        </p>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Channel Information</h3>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Created:</span>
            <span style={styles.infoValue}>
              {new Date(channel.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Channel ID:</span>
            <span style={styles.infoValue}>{channel.id}</span>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Messages</h3>
        <button
          onClick={handleViewMessages}
          style={styles.viewMessagesButton}
          type="button"
        >
          View Messages
        </button>
        <p style={styles.statusHelp}>
          View and manage all messages for this channel
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '40px',
    maxWidth: '800px',
  },
  header: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '2px solid #e0e0e0',
  },
  channelName: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 12px 0',
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
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 16px 0',
  },
  codeContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '8px',
  },
  codeDisplay: {
    flex: 1,
    padding: '16px 20px',
    backgroundColor: '#f8f9fa',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
  },
  codeValue: {
    fontSize: '24px',
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#0070f3',
    letterSpacing: '3px',
  },
  copyButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#0070f3',
    backgroundColor: 'white',
    border: '2px solid #0070f3',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  },
  codeHelp: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
  statusButton: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '500',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: '8px',
  },
  closeButton: {
    backgroundColor: '#dc3545',
  },
  openButton: {
    backgroundColor: '#28a745',
  },
  statusHelp: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  infoLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    fontSize: '14px',
    color: '#333',
    fontFamily: 'monospace',
  },
  viewMessagesButton: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#0070f3',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: '8px',
  },
}
