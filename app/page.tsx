'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [channelCode, setChannelCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLoginClick = () => {
    router.push('/api/auth/login')
  }

  const handleGuestClick = () => {
    setShowCodeInput(true)
    setError('')
  }

  const validateCodeFormat = (code: string): boolean => {
    // Format: xxx-xxx (3 alphanumeric, dash, 3 alphanumeric)
    const codeRegex = /^[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}$/
    return codeRegex.test(code)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setChannelCode(value)
    
    // Clear error when user starts typing
    if (error) {
      setError('')
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate format
    if (!validateCodeFormat(channelCode)) {
      setError('Invalid code format. Please use format: xxx-xxx')
      return
    }

    // Verify channel exists
    try {
      const response = await fetch(`/api/channels/lookup?code=${encodeURIComponent(channelCode)}`)
      
      if (response.ok) {
        const data = await response.json()
        // Redirect to channel view
        router.push(`/channel/${data.channel.id}?code=${channelCode}`)
      } else if (response.status === 404) {
        setError('Channel not found. Please check the code and try again.')
      } else {
        setError('An error occurred. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <h1 style={styles.title}>Anonymous Messaging Platform</h1>
        <p style={styles.subtitle}>
          Receive real-time feedback from your audience
        </p>

        <div style={styles.buttonContainer}>
          <button
            onClick={handleLoginClick}
            style={styles.primaryButton}
            type="button"
          >
            Login as User
          </button>

          <button
            onClick={handleGuestClick}
            style={styles.secondaryButton}
            type="button"
          >
            Join Channel as Guest
          </button>
        </div>

        {showCodeInput && (
          <div style={styles.codeInputContainer}>
            <form onSubmit={handleCodeSubmit} style={styles.form}>
              <label htmlFor="channelCode" style={styles.label}>
                Enter Channel Code
              </label>
              <input
                id="channelCode"
                type="text"
                value={channelCode}
                onChange={handleCodeChange}
                placeholder="xxx-xxx"
                style={{
                  ...styles.input,
                  ...(error ? styles.inputError : {})
                }}
                maxLength={7}
                autoFocus
              />
              {error && <p style={styles.errorText}>{error}</p>}
              <button
                type="submit"
                style={styles.submitButton}
                disabled={!channelCode}
              >
                Join Channel
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}

const styles = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  container: {
    maxWidth: '500px',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#333',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '32px',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginBottom: '24px',
  },
  primaryButton: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#0070f3',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#0070f3',
    backgroundColor: 'white',
    border: '2px solid #0070f3',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  codeInputContainer: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e0e0e0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    textAlign: 'left' as const,
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  errorText: {
    fontSize: '14px',
    color: '#e53e3e',
    textAlign: 'left' as const,
    margin: '0',
  },
  submitButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#0070f3',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    opacity: 1,
  },
}
