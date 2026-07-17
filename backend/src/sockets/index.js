const { verifyAccessToken } = require('../utils/jwt');

// Semua logic real-time WMS dikumpulkan di sini biar server.js tetap bersih
function initSockets(io) {
  // Middleware auth buat socket — token dikirim dari frontend saat connect
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Token tidak ditemukan'));
      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Token tidak valid'));
    }
  });

  io.on('connection', (socket) => {
    const { companyId, id: userId, role } = socket.user;

    // User join room berdasarkan company_id — biar broadcast stok cuma
    // sampai ke user dalam perusahaan yang sama, bukan semua tenant
    socket.join(`company_${companyId}`);

    // Broadcast user:activity — siapa yang online
    io.to(`company_${companyId}`).emit('user:activity', {
      userId,
      role,
      status: 'online',
    });

    socket.on('disconnect', () => {
      io.to(`company_${companyId}`).emit('user:activity', {
        userId,
        role,
        status: 'offline',
      });
    });
  });
}

module.exports = initSockets;
