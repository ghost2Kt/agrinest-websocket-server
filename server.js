// Load .env when present (local dev)
require('dotenv').config();
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3001;
const INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY || 'dev-internal-key-change-me';

function loadJwtPublicKey() {
  const inline = process.env.JWT_PUBLIC_KEY;
  if (inline && inline.trim()) {
    return inline.replace(/\\n/g, '\n');
  }
  const path = process.env.JWT_PUBLIC_KEY_PATH;
  if (path && fs.existsSync(path)) {
    return fs.readFileSync(path, 'utf8');
  }
  return null;
}

const JWT_PUBLIC_KEY = loadJwtPublicKey();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    jwtConfigured: Boolean(JWT_PUBLIC_KEY),
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

function userIdFromPayload(payload) {
  if (payload.userId != null) {
    return String(payload.userId);
  }
  if (payload.user_id != null) {
    return String(payload.user_id);
  }
  return null;
}

function verifyToken(token) {
  if (!JWT_PUBLIC_KEY) {
    throw new Error('JWT_PUBLIC_KEY not configured');
  }
  return jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'] });
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token || typeof token !== 'string') {
    return next(new Error('Missing token'));
  }
  try {
    const payload = verifyToken(token);
    const userId = userIdFromPayload(payload);
    if (!userId) {
      return next(new Error('Token missing userId claim'));
    }
    socket.userId = userId;
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', socket => {
  const room = `user:${socket.userId}`;
  socket.join(room);
  console.log(`[socket] connected ${room}`);
  socket.on('disconnect', reason => {
    console.log(`[socket] disconnected ${room} (${reason})`);
  });
});

app.post('/broadcast', (req, res) => {
  const key = req.headers['x-internal-key'];
  if (key !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { room, event, data } = req.body ?? {};
  if (!room || !event) {
    return res.status(400).json({ error: 'room and event are required' });
  }

  io.to(String(room)).emit(String(event), data ?? {});
  return res.json({ ok: true, room, event });
});

server.listen(PORT, () => {
  console.log(`AGRINEST WebSocket server listening on port ${PORT}`);
  if (!JWT_PUBLIC_KEY) {
    console.warn(
      'Warning: JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH not set — clients cannot connect.',
    );
  }
});
