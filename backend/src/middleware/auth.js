const { verifyAccessToken } = require('../utils/jwt');

// Cek token JWT di header Authorization: Bearer <token>
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { id, companyId, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau kadaluarsa' });
  }
}

// RBAC — batasi endpoint berdasarkan role (ADMIN, MANAGER, STAFF)
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Tidak punya akses untuk aksi ini' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
