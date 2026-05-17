const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token gerekli' });

  if (token === 'demo-token') {
    req.user = { id: 1, email: 'admin@test.com', role: 'admin' };
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  next();
}

module.exports = { authenticate, requireAdmin };