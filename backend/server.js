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
  'https://web-production-ac0ed.up.railway.app',
  'https://kaynarmotor.com.tr',
  'https://www.kaynarmotor.com.tr',
  'http://kaynarmotor.com.tr',
  'http://www.kaynarmotor.com.tr',
  // Eski domain (geriye dönük uyumluluk)
  'https://kaynarmotorservis.com',
  'https://www.kaynarmotorservis.com',
  'http://kaynarmotorservis.com',
  'http://www.kaynarmotorservis.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // origin olmayan istekler (same-origin, Postman vs.)
    if (!origin) return callback(null, true);
    // Bilinen origin'ler veya development modunda hepsine izin ver
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    // Production'da FRONTEND_URL tanımlı değilse tüm origin'lere izin ver (JWT koruması var)
    if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    callback(new Error('CORS policy violation'));
  },
  credentials: true
}));

app.use(express.json({ limit: '120mb' })); // vitrin video yüklemeleri için yüksek limit

// JWT Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  // code alanı, frontend'in "oturum bitti" ile "bu işleme yetkin yok" (403) ayrımını
  // mesaj metnine bakmadan yapabilmesi için eklenmiştir.
  if (!token) return res.status(401).json({ message: 'Yetkilendirme token\'ı gerekli', code: 'TOKEN_MISSING' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Geçersiz veya süresi dolmuş token', code: 'TOKEN_INVALID' });
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
const yedekParcaStokRoutes = require('./routes/yedekParcaStok');
const raporRoutes = require('./routes/raporlar');
const veresiyeRoutes = require('./routes/veresiye');
const vitrinRoutes = require('./routes/vitrin');
const servisGecmisiRoutes = require('./routes/servisGecmisi');

app.use('/api/auth', authRoutes);
app.use('/api/musteriler', authenticateToken, musteriRoutes);
app.use('/api/is-emirleri', authenticateToken, isEmriRoutes);
app.use('/api/aksesuarlar', authenticateToken, aksesuarRoutes);
app.use('/api/aksesuar-stok', authenticateToken, aksesuarStokRoutes);
app.use('/api/ikinci-el-motor', authenticateToken, ikinciElMotorRoutes);
app.use('/api/eticaret', authenticateToken, eticaretRoutes);
app.use('/api/yedek-parcalar', authenticateToken, yedekParcaRoutes);
app.use('/api/yedek-parca-stok', authenticateToken, yedekParcaStokRoutes);
app.use('/api/raporlar', authenticateToken, raporRoutes);
app.use('/api/veresiye', authenticateToken, veresiyeRoutes);
// Vitrin: public + admin uçları karışık; auth route içinde uygulanır
app.use('/api/vitrin', vitrinRoutes(authenticateToken, isAdmin));
// Müşteri servis geçmişi (QR ile erişilen halka açık sayfa) — token bazlı, auth gerektirmez
app.use('/api/servis-gecmisi', servisGecmisiRoutes);

// Health check
// NOT: Production'daki SPA catch-all ('*') bu satırdan SONRA tanımlanmalı,
// aksi hâlde /api/health isteği catch-all'a takılıp index.html döner.
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

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
