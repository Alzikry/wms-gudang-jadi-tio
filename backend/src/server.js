require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const initSockets = require('./sockets');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*' },
});

initSockets(io);

// Simpan instance io supaya bisa dipakai di controller (req.app.get('io'))
app.set('io', io);

server.listen(PORT, () => {
  console.log(`✅ WMS backend jalan di http://localhost:${PORT}`);
});
