import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import authRoutes from './auth/routes.js';
import lobbyRoutes from './lobby/routes.js';
import statsRoutes from './stats/routes.js';
import pokerRoutes from './poker/routes.js';
import { initializeSocketHandlers } from './game/socket.js';
import { initializePokerHandlers } from './poker/socket.js';
import { initializeHomeHandlers } from './poker/homeSocket.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/auth', authRoutes);
app.use('/api', lobbyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/poker', pokerRoutes);

initializeSocketHandlers(io);
initializePokerHandlers(io);
initializeHomeHandlers(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, server, io };
