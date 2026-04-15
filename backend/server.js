require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const { initializeDatabase } = require('./config/initDb');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  // Production domain'leri buraya eklenecek
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// JWT Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Yetkilendirme token\'ı gerekli' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Geçersiz veya süresi dolmuş token' });
    req.user = user;
    next();
  });
};

// Admin Middleware
const isAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekli' });
  }
  next();
};

// Routes
const authRoutes = require('./routes/auth');
const musteriRoutes = require('./routes/musteriler');
const isEmriRoutes = require('./routes/isEmirleri');
const aksesuarRoutes = require('./routes/aksesuarlar');
const aksesuarStokRoutes = require('./routes/aksesuarStok');
const ikinciElMotorRoutes = require('./routes/ikinciElMotor');
const eticaretRoutes = require('./routes/eticaret');
const yedekParcaRoutes = require('./routes/yedekParcalar');
const raporRoutes = require('./routes/raporlar');

app.use('/api/auth', authRoutes);
app.use('/api/musteriler', authenticateToken, musteriRoutes);
app.use('/api/is-emirleri', authenticateToken, isEmriRoutes);
app.use('/api/aksesuarlar', authenticateToken, aksesuarRoutes);
app.use('/api/aksesuar-stok', authenticateToken, aksesuarStokRoutes);
app.use('/api/ikinci-el-motor', authenticateToken, ikinciElMotorRoutes);
app.use('/api/eticaret', authenticateToken, eticaretRoutes);
app.use('/api/yedek-parcalar', authenticateToken, yedekParcaRoutes);
app.use('/api/raporlar', authenticateToken, raporRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server (DB'den bağımsız)
app.listen(PORT, () => {
  console.log(`Sunucu port ${PORT} üzerinde çalışıyor`);
});

// DB init arka planda
const MAX_RETRIES = 10;
let retryCount = 0;

const tryInitDb = async () => {
  try {
    await initializeDatabase();
    console.log('Veritabanı başarıyla başlatıldı');
  } catch (error) {
    retryCount++;
    if (retryCount < MAX_RETRIES) {
      const delay = Math.min(retryCount * 5000, 30000);
      console.log(`DB init denemesi ${retryCount}/${MAX_RETRIES} başarısız. ${delay / 1000}s sonra tekrar...`);
      setTimeout(tryInitDb, delay);
    } else {
      console.error('Veritabanı başlatılamadı:', error.message);
    }
  }
};

tryInitDb();

module.exports = { authenticateToken, isAdmin };
