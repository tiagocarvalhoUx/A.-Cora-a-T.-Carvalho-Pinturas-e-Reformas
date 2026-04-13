require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/database');

const app = express();
const server = http.createServer(app);

// ── CORS origins ──────────────────────────────────────────────────────────────
const LOCALHOST_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:3000',
  'http://localhost:19006',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
];
const productionOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
  : [];
const allowedOrigins = [...new Set([...LOCALHOST_ORIGINS, ...productionOrigins])];

const corsOriginFn = (origin, cb) => {
  if (!origin) return cb(null, true);
  if (allowedOrigins.includes(origin)) return cb(null, true);
  if (origin.endsWith('.vercel.app')) return cb(null, true);
  cb(new Error(`CORS bloqueado para origem: ${origin}`));
};

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: corsOriginFn, methods: ['GET', 'POST'], credentials: true },
});

// ── Middlewares ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: corsOriginFn,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Muitas tentativas. Tente novamente em 15 minutos.' }));

// Rotas
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/services', require('./src/routes/services'));
app.use('/api/budgets', require('./src/routes/budgets'));
app.use('/api/portfolio', require('./src/routes/portfolio'));
app.use('/api/chat', require('./src/routes/chat'));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Socket.io - Chat em tempo real
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`Socket conectado: ${socket.id}`);

  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.join(userId);
  });

  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
  });

  socket.on('send_message', ({ chatId, message, recipientId }) => {
    socket.to(chatId).emit('new_message', message);
    const recipientSocketId = connectedUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('notification', {
        type: 'message',
        title: 'Nova mensagem',
        body: message.content || '📷 Imagem',
        chatId,
      });
    }
  });

  socket.on('disconnect', () => {
    connectedUsers.forEach((socketId, userId) => {
      if (socketId === socket.id) connectedUsers.delete(userId);
    });
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Erro interno do servidor' });
});

// Start
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 Socket.io ativo`);
  });
});
