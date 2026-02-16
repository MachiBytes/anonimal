// CRITICAL: Load environment variables FIRST before any other imports
import { config } from 'dotenv';
import { resolve } from 'path';

// Explicitly specify the .env file path
const envPath = resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
const result = config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('.env file loaded successfully');
}

// Debug: Check if env vars are loaded
console.log('Environment variables loaded:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'UNDEFINED');
console.log('DB_NAME:', process.env.DB_NAME);

// NOW import other modules that depend on env vars
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { SocketHandlers } from './lib/socket-handlers';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io server
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Make io instance available globally
  global.io = io;

  // Socket.io connection handler - handlers will be loaded dynamically when needed
  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    try {
      // Import TypeScript handlers
      const handlers = new SocketHandlers();

      // Register event handlers
      socket.on('join_channel', (data) => handlers.handleJoinChannel(socket, data));
      socket.on('send_message', (data) => handlers.handleSendMessage(socket, data));
      socket.on('approve_message', (data) => handlers.handleApproveMessage(socket, data));
      socket.on('reject_message', (data) => handlers.handleRejectMessage(socket, data));

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    } catch (err) {
      console.error('Failed to load socket handlers:', err);
      socket.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to initialize connection handlers'
      });
    }
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.io server initialized`);
    });
});
