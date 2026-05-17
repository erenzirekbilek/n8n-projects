require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const ticketRoutes = require('./routes/tickets');
const statsRoutes  = require('./routes/stats');
const authRoutes   = require('./routes/auth');
const syncRoutes   = require('./routes/sync');
const { init: initSync } = require('./services/sheetsSync');

const app    = express();
const server = createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' }
});

initSync(io);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => { req.io = io; next(); });

app.use('/api/tickets', ticketRoutes);
app.use('/api/stats',   statsRoutes);
app.use('/api/auth',    authRoutes);
app.use('/api/sync',    syncRoutes);

app.post('/webhook/sheets', async (req, res) => {
  const { triggerSync } = require('./services/sheetsSync');
  await triggerSync(io);
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Backend running on :${PORT}`));