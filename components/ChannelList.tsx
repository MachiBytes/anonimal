'use client'

import { Channel } from '@/types/database'

interface ChannelListProps {
  channels: Channel[]
  selectedChannel: Channel | null
  onChannelSelect: (channel: Channel) => void
}

export default function ChannelList({ channels, selectedChannel, onChannelSelect }: ChannelListProps) {
  if (channels.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>No channels yet</p>
        <p style={styles.emptySubtext}>Create your first channel to get started</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Your Channels</h2>
      <div style={styles.list}>
        {channels.map((channel) => (
          <div
            key={channel.id}
            onClick={() => onChannelSelect(channel)}
            style={{
              ...styles.channelItem,
              ...(selectedChannel?.id === channel.id ? styles.channelItemSelected : {}),
            }}
          >
            <div style={styles.channelHeader}>
              <h3 style={styles.channelName}>{channel.name}</h3>
              <span
                style={{
                  ...styles.statusBadge,
                  ...(channel.status === 'open' ? styles.statusOpen : styles.statusClosed),
                }}
              >
                {channel.status}
              </span>
            </div>
            <div style={styles.channelMeta}>
              <span style={styles.channelCode}>{channel.code}</span>
              <span style={styles.channelDate}>
                {new Date(channel.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  heading: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    padding: '20px 20px 12px',
    margin: 0,
    borderBottom: '1px solid #e0e0e0',
  },
  list: {
    flex: 1,
    overflow: 'auto',
  },
  channelItem: {
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    backgroundColor: 'white',
  },
  channelItemSelected: {
    backgroundColor: '#f0f7ff',
    borderLeft: '3px solid #0070f3',
  },
  channelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  channelName: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#333',
    margin: 0,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '500',
    padding: '3px 8px',
    borderRadius: '12px',
    textTransform: 'uppercase' as const,
    marginLeft: '8px',
  },
  statusOpen: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusClosed: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  channelMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelCode: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#666',
    fontWeight: '500',
  },
  channelDate: {
    fontSize: '12px',
    color: '#999',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#999',
    margin: 0,
  },
}
