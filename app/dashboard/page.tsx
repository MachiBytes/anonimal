'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Channel } from '@/types/database'
import ChannelList from '@/components/ChannelList'
import CreateChannelForm from '@/components/CreateChannelForm'
import ChannelManagement from '@/components/ChannelManagement'

export default function Dashboard() {
  const [user, setUser] = useState<{ id: string; full_name: string; email: string } | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

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
          setUser(data.user)
          loadChannels()
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

  const loadChannels = async () => {
    try {
      const response = await fetch('/api/channels')
      if (response.ok) {
        const data = await response.json()
        setChannels(data.channels)
      } else {
        setError('Failed to load channels')
      }
    } catch {
      setError('Failed to load channels')
    } finally {
      setLoading(false)
    }
  }

  const handleChannelCreated = (newChannel: Channel) => {
    setChannels([newChannel, ...channels])
    setSelectedChannel(newChannel)
  }

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel)
  }

  const handleChannelUpdated = (updatedChannel: Channel) => {
    setChannels(channels.map(c => 
      c.id === updatedChannel.id ? updatedChannel : c
    ))
    setSelectedChannel(updatedChannel)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch {
      console.error('Logout failed')
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Channel Dashboard</h1>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{user?.full_name}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.mainContent}>
        <aside style={styles.sidebar}>
          <CreateChannelForm onChannelCreated={handleChannelCreated} />
          <ChannelList
            channels={channels}
            selectedChannel={selectedChannel}
            onChannelSelect={handleChannelSelect}
          />
        </aside>

        <main style={styles.channelView}>
          {selectedChannel ? (
            <ChannelManagement
              channel={selectedChannel}
              onChannelUpdated={handleChannelUpdated}
              userId={user?.id}
            />
          ) : (
            <div style={styles.emptyState}>
              <p>Select a channel or create a new one to get started</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 40px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userName: {
    fontSize: '14px',
    color: '#666',
  },
  logoutButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#666',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px 40px',
    borderBottom: '1px solid #fcc',
  },
  mainContent: {
    display: 'flex',
    height: 'calc(100vh - 81px)',
  },
  sidebar: {
    width: '350px',
    backgroundColor: 'white',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  channelView: {
    flex: 1,
    overflow: 'auto',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999',
    fontSize: '16px',
  },
}
