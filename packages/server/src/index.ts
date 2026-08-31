import 'dotenv/config';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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

function applySchema() {
  if (process.env.SKIP_SCHEMA_PUSH === 'true') return;
  const configPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle.config.ts');
  try {
    console.log('Applying database schema...');
    execSync(`npx drizzle-kit push --config "${configPath}" --force`, {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('Database schema applied.');
  } catch (err) {
    console.error('Database schema push failed:', err);
    process.exit(1);
  }
}

applySchema();

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
