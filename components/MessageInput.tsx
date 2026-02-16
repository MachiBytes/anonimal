'use client'

import { useState, FormEvent } from 'react'
import { Socket } from 'socket.io-client'

interface MessageInputProps {
  socket: Socket | null
  channelId: string
  sessionId: string
  isChannelClosed: boolean
}

export default function MessageInput({ 
  socket, 
  channelId, 
  sessionId,
  isChannelClosed 
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || !socket || sending || isChannelClosed) return

    setSending(true)
    
    socket.emit('send_message', {
      channelId,
      content: message.trim(),
      sessionId
    })

    setMessage('')
    setSending(false)
  }

  return (
    <form onSubmit={handleSubmit} style={styles.inputForm}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={isChannelClosed ? 'Channel is closed' : 'Type your message...'}
        style={styles.textarea}
        disabled={isChannelClosed || sending}
        rows={3}
      />
      <button
        type="submit"
        style={{
          ...styles.sendButton,
          ...((!message.trim() || isChannelClosed || sending) ? styles.sendButtonDisabled : {})
        }}
        disabled={!message.trim() || isChannelClosed || sending}
      >
        {sending ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}

const styles = {
  inputForm: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    outline: 'none',
  },
  sendButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#0070f3',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
}
