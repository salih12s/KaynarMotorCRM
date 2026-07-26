const jwt = require('jsonwebtoken');

// JWT doğrulama.
// code alanı, frontend'in "oturum bitti" ile "bu işleme yetkin yok" (403) ayrımını
// mesaj metnine bakmadan yapabilmesi içindir; bkz. frontend/src/services/api.js.
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Yetkilendirme token\'ı gerekli', code: 'TOKEN_MISSING' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Geçersiz veya süresi dolmuş token', code: 'TOKEN_INVALID' });
    }
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekli' });
  }
  next();
};

module.exports = { authenticateToken, isAdmin };
