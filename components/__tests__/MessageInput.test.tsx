import { render, screen, fireEvent } from '@testing-library/react'
import MessageInput from '../MessageInput'
import { Socket } from 'socket.io-client'

// Mock socket
const createMockSocket = (): Socket => {
  const mockSocket = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connected: true,
  } as unknown as Socket
  return mockSocket
}

describe('MessageInput', () => {
  const defaultProps = {
    socket: createMockSocket(),
    channelId: 'test-channel-id',
    sessionId: 'test-session-id',
    isChannelClosed: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Requirement 7.1: Text input for message content', () => {
    it('should render a textarea for message input', () => {
      render(<MessageInput {...defaultProps} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...')
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('should allow typing in the textarea', () => {
      render(<MessageInput {...defaultProps} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: 'Test message' } })
      
      expect(textarea.value).toBe('Test message')
    })
  })

  describe('Requirement 7.5: Submit button', () => {
    it('should render a submit button', () => {
      render(<MessageInput {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /send message/i })
      expect(button).toBeInTheDocument()
    })

    it('should disable submit button when message is empty', () => {
      render(<MessageInput {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /send message/i })
      expect(button).toBeDisabled()
    })

    it('should enable submit button when message has content', () => {
      render(<MessageInput {...defaultProps} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...')
      const button = screen.getByRole('button', { name: /send message/i })
      
      fireEvent.change(textarea, { target: { value: 'Test message' } })
      
      expect(button).not.toBeDisabled()
    })

    it('should disable submit button for whitespace-only messages', () => {
      render(<MessageInput {...defaultProps} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...')
      const button = screen.getByRole('button', { name: /send message/i })
      
      fireEvent.change(textarea, { target: { value: '   ' } })
      
      expect(button).toBeDisabled()
    })
  })

  describe('Requirement 4.2: Disable when channel is closed', () => {
    it('should disable textarea when channel is closed', () => {
      render(<MessageInput {...defaultProps} isChannelClosed={true} />)
      
      const textarea = screen.getByPlaceholderText('Channel is closed')
      expect(textarea).toBeDisabled()
    })

    it('should disable submit button when channel is closed', () => {
      render(<MessageInput {...defaultProps} isChannelClosed={true} />)
      
      const button = screen.getByRole('button', { name: /send message/i })
      expect(button).toBeDisabled()
    })

    it('should show appropriate placeholder when channel is closed', () => {
      render(<MessageInput {...defaultProps} isChannelClosed={true} />)
      
      const textarea = screen.getByPlaceholderText('Channel is closed')
      expect(textarea).toBeInTheDocument()
    })

    it('should not submit message when channel is closed', () => {
      const mockSocket = createMockSocket()
      render(<MessageInput {...defaultProps} socket={mockSocket} isChannelClosed={true} />)
      
      const textarea = screen.getByPlaceholderText('Channel is closed')
      const form = textarea.closest('form')!
      
      fireEvent.change(textarea, { target: { value: 'Test message' } })
      fireEvent.submit(form)
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
  })

  describe('Requirement 7.6: Connect to WebSocket send_message event', () => {
    it('should emit send_message event with correct data when submitting', () => {
      const mockSocket = createMockSocket()
      render(<MessageInput {...defaultProps} socket={mockSocket} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...')
      const form = textarea.closest('form')!
      
      fireEvent.change(textarea, { target: { value: 'Test message' } })
      fireEvent.submit(form)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        channelId: 'test-channel-id',
        content: 'Test message',
        sessionId: 'test-session-id',
      })
    })

    it('should trim whitespace from message content before sending', () => {
      const mockSocket = createMockSocket()
      render(<MessageInput {...defaultProps} socket={mockSocket} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...')
      const form = textarea.closest('form')!
      
      fireEvent.change(textarea, { target: { value: '  Test message  ' } })
      fireEvent.submit(form)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        channelId: 'test-channel-id',
        content: 'Test message',
        sessionId: 'test-session-id',
      })
    })

    it('should clear textarea after successful submission', () => {
      const mockSocket = createMockSocket()
      render(<MessageInput {...defaultProps} socket={mockSocket} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      const form = textarea.closest('form')!
      
      fireEvent.change(textarea, { target: { value: 'Test message' } })
      fireEvent.submit(form)
      
      expect(textarea.value).toBe('')
    })

    it('should not emit event when socket is null', () => {
      render(<MessageInput {...defaultProps} socket={null} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...')
      const form = textarea.closest('form')!
      
      fireEvent.change(textarea, { target: { value: 'Test message' } })
      fireEvent.submit(form)
      
      // No error should be thrown
      expect(true).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should handle very long messages', () => {
      const mockSocket = createMockSocket()
      const longMessage = 'a'.repeat(10000)
      
      render(<MessageInput {...defaultProps} socket={mockSocket} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...')
      const form = textarea.closest('form')!
      
      fireEvent.change(textarea, { target: { value: longMessage } })
      fireEvent.submit(form)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        channelId: 'test-channel-id',
        content: longMessage,
        sessionId: 'test-session-id',
      })
    })

    it('should handle special characters in message', () => {
      const mockSocket = createMockSocket()
      const specialMessage = 'Test <script>alert("xss")</script> & "quotes" \'apostrophes\''
      
      render(<MessageInput {...defaultProps} socket={mockSocket} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...')
      const form = textarea.closest('form')!
      
      fireEvent.change(textarea, { target: { value: specialMessage } })
      fireEvent.submit(form)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        channelId: 'test-channel-id',
        content: specialMessage,
        sessionId: 'test-session-id',
      })
    })

    it('should handle newlines in message', () => {
      const mockSocket = createMockSocket()
      const multilineMessage = 'Line 1\nLine 2\nLine 3'
      
      render(<MessageInput {...defaultProps} socket={mockSocket} />)
      
      const textarea = screen.getByPlaceholderText('Type your message...')
      const form = textarea.closest('form')!
      
      fireEvent.change(textarea, { target: { value: multilineMessage } })
      fireEvent.submit(form)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        channelId: 'test-channel-id',
        content: multilineMessage,
        sessionId: 'test-session-id',
      })
    })
  })
})
