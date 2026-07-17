import { io } from 'socket.io-client';

let socket = null;

// Bikin koneksi socket sekali aja, dipanggil setelah user login (atau saat app dibuka
// dengan session yang masih tersimpan).
//
// PENTING: auth di sini pakai bentuk *function* (bukan object statis) — supaya setiap
// kali socket.io mencoba (re)connect (termasuk auto-reconnect setelah tab lama idle atau
// koneksi sempat putus), token yang dikirim selalu diambil ULANG dari localStorage saat
// itu juga. Kalau dipakai object statis seperti sebelumnya, token yang dikirim ulang saat
// reconnect adalah token LAMA yang sudah expired (access token cuma hidup 15 menit),
// sehingga backend menolak koneksi dan real-time berhenti tanpa ada error yang terlihat.
export function connectSocket(accessToken) {
  if (socket) {
    // Kalau sudah ada instance tapi lagi disconnected (misal karena token lama expired),
    // coba connect ulang — auth function di bawah akan otomatis ambil token terbaru.
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
    auth: (cb) => cb({ token: localStorage.getItem('accessToken') || accessToken }),
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connect error:', err.message);
  });

  return socket;
}

// Panggil ini setelah axios berhasil refresh access token (lihat services/api.js),
// supaya kalau socket sedang disconnected, percobaan reconnect berikutnya otomatis
// pakai token yang baru.
export function refreshSocketAuth() {
  if (socket && !socket.connected) {
    socket.connect();
  }
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}