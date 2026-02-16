'use client'

import { useState } from 'react'
import { MessageWithIdentity } from '@/types/database'

interface MessageCardProps {
  message: MessageWithIdentity
  showApprovalControls?: boolean
  onApprove?: (messageId: string) => void
  onReject?: (messageId: string) => void
  isProcessing?: boolean
}

export default function MessageCard({
  message,
  showApprovalControls = false,
  onApprove,
  onReject,
  isProcessing = false,
}: MessageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(prev => !prev)
  }

  const isLongMessage = message.content.length > 400
  const shouldShowToggle = isLongMessage
  const displayContent = isExpanded || !isLongMessage 
    ? message.content 
    : message.content.substring(0, 400) + '...'
  const isPending = message.status === 'pending'

  return (
    <div
      style={{
        ...styles.messageCard,
        ...(isPending ? styles.pendingCard : styles.approvedCard),
      }}
    >
      <div style={styles.messageHeader}>
        <div style={styles.identityContainer}>
          <div
            style={{
              ...styles.iconCircle,
              backgroundColor: message.anon_user.icon_background_color,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={message.anon_user.icon_url} 
              alt={message.anon_user.name}
              style={styles.iconImage}
            />
          </div>
          <div style={styles.identityInfo}>
            <span style={styles.userName}>{message.anon_user.name}</span>
            <span style={styles.timestamp}>
              {new Date(isPending ? message.sent_at : message.approved_at || message.sent_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        {isPending && (
          <span style={styles.pendingIcon} title="Pending Approval">⏱</span>
        )}
      </div>

      <div style={styles.messageContent}>
        <p style={styles.contentText}>{displayContent}</p>
        {shouldShowToggle && (
          <button
            onClick={toggleExpand}
            style={styles.expandButton}
            type="button"
          >
            {isExpanded ? '▲ Show less' : '▼ Show more'}
          </button>
        )}
      </div>

      {showApprovalControls && isPending && onApprove && onReject && (
        <div style={styles.approvalControls}>
          <button
            onClick={() => onApprove(message.id)}
            style={styles.approveButton}
            disabled={isProcessing}
            type="button"
          >
            {isProcessing ? 'Processing...' : '✓ Approve'}
          </button>
          <button
            onClick={() => onReject(message.id)}
            style={styles.rejectButton}
            disabled={isProcessing}
            type="button"
          >
            {isProcessing ? 'Processing...' : '✕ Reject'}
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  messageCard: {
    border: '2px solid',
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: 'white',
    transition: 'all 0.2s',
  },
  pendingCard: {
    borderColor: '#0070f3',
    backgroundColor: '#f8fbff',
  },
  approvedCard: {
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    opacity: 0.7,
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  identityContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconImage: {
    width: '28px',
    height: '28px',
  },
  identityInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  userName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: '13px',
    color: '#666',
  },
  pendingIcon: {
    fontSize: '24px',
    opacity: 0.7,
  },
  messageContent: {
    marginBottom: '16px',
  },
  contentText: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#333',
    margin: '0 0 12px 0',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  expandButton: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#0070f3',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  approvalControls: {
    display: 'flex',
    gap: '12px',
    paddingTop: '16px',
    borderTop: '1px solid #e0e0e0',
  },
  approveButton: {
    flex: 1,
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#28a745',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  rejectButton: {
    flex: 1,
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#dc3545',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
}
