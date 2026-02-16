'use client'

import { useState } from 'react'
import { Channel } from '@/types/database'

interface CreateChannelFormProps {
  onChannelCreated: (channel: Channel) => void
}

export default function CreateChannelForm({ onChannelCreated }: CreateChannelFormProps) {
  const [channelName, setChannelName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdChannel, setCreatedChannel] = useState<Channel | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!channelName.trim()) {
      setError('Channel name is required')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: channelName.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setCreatedChannel(data.channel)
        setShowSuccess(true)
        setChannelName('')
        onChannelCreated(data.channel)
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false)
          setCreatedChannel(null)
        }, 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create channel')
      }
    } catch {
      setError('Failed to create channel')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Create New Channel</h2>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={channelName}
          onChange={(e) => {
            setChannelName(e.target.value)
            setError('')
          }}
          placeholder="Enter channel name"
          style={{
            ...styles.input,
            ...(error ? styles.inputError : {}),
          }}
          disabled={isCreating}
          maxLength={100}
        />
        
        {error && <p style={styles.errorText}>{error}</p>}
        
        <button
          type="submit"
          style={{
            ...styles.submitButton,
            ...(isCreating ? styles.submitButtonDisabled : {}),
          }}
          disabled={isCreating || !channelName.trim()}
        >
          {isCreating ? 'Creating...' : 'Create Channel'}
        </button>
      </form>

      {showSuccess && createdChannel && (
        <div style={styles.successMessage}>
          <p style={styles.successTitle}>Channel created!</p>
          <div style={styles.codeDisplay}>
            <span style={styles.codeLabel}>Channel Code:</span>
            <span style={styles.codeValue}>{createdChannel.code}</span>
          </div>
          <p style={styles.successSubtext}>
            Share this code with your audience
          </p>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  heading: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 16px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  errorText: {
    fontSize: '13px',
    color: '#e53e3e',
    margin: '0',
  },
  submitButton: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#0070f3',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  successMessage: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#d4edda',
    borderRadius: '6px',
    border: '1px solid #c3e6cb',
  },
  successTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#155724',
    margin: '0 0 12px 0',
  },
  codeDisplay: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    marginBottom: '8px',
  },
  codeLabel: {
    fontSize: '12px',
    color: '#155724',
    fontWeight: '500',
  },
  codeValue: {
    fontSize: '20px',
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#155724',
    letterSpacing: '2px',
  },
  successSubtext: {
    fontSize: '12px',
    color: '#155724',
    margin: 0,
  },
}
