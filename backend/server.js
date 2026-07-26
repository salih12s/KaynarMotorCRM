require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initializeDatabase } = require('./config/initDb');

const app = express();
const PORT = process.env.PORT || 5000;

// Railway tek bir ters vekil sunucunun arkasında çalışır. Bu ayar olmadan req.ip
// vekilin adresini gösterir; hız sınırlama ve aktivite logu yanlış IP kaydeder.
// Değerin 1 olması (true değil) express-rate-limit'in "aşırı geniş" uyarısını da önler.
app.set('trust proxy', 1);

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
    // Production'da frontend backend tarafından servis edildiği için ana uygulama
    // buradan geçer; CORS kontrolü yalnızca farklı origin'lerden gelen istekler içindir.
    if (!origin) return callback(null, true);
    // Bilinen origin'ler veya development modunda hepsine izin ver
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    // Bilinmeyen origin reddedilir. Yeni bir alan adından servis ediyorsanız
    // FRONTEND_URL ortam değişkenini o adrese ayarlayın; aşağıdaki log hangi
    // origin'in reddedildiğini gösterir.
    console.warn(`CORS reddedildi: ${origin} (izin vermek için FRONTEND_URL ayarlayın)`);
    callback(new Error('CORS policy violation'));
  },
  credentials: true
}));

// Güvenlik başlıkları.
// contentSecurityPolicy kapalı: CRA build'i inline script/stil üretir, varsayılan CSP
// bunları engelleyip arayüzü bozar. crossOriginResourcePolicy 'cross-origin':
// vitrin görsel/videoları API'den farklı bir origin'deki siteye servis ediliyor.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

// Gövde limiti: yüksek limit yalnızca vitrin yükleme uçlarında gerekli.
// Bu satır genel limitten ÖNCE gelmeli; gövde bir kez ayrıştırıldığında
// express.json sonraki çağrıda devreye girmez.
app.use('/api/vitrin', express.json({ limit: '120mb' }));
app.use(express.json({ limit: '10mb' }));

// Kimlik doğrulama ve yetkilendirme middleware'leri (bkz. middleware/)
const { authenticateToken, isAdmin } = require('./middleware/auth');
const {
  modulYetkisi, yazmaYetkisi, rolYetkisi, motorYazmaYetkisi
} = require('./middleware/yetki');

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

// Yetkilendirme kuralları frontend/src/App.jsx içindeki route guard'larıyla birebir
// eşleşecek şekilde seçilmiştir. Bazı uçlar sahibi olmadıkları ekranlar tarafından da
// OKUMA amaçlı kullanıldığından (ör. stok araması servis/e-ticaret/rapor ekranlarında),
// bu uçlarda yalnızca yazma işlemleri yetkiye bağlanır — bkz. middleware/yetki.js.
app.use('/api/auth', authRoutes);
// Müşteri: arama uçları tüm modüllerdeki formlar tarafından kullanılır,
// yönetim uçları admin'e kısıtlıdır — kural route dosyası içinde uygulanır.
app.use('/api/musteriler', authenticateToken, musteriRoutes);
app.use('/api/is-emirleri', authenticateToken, modulYetkisi('servis_yetkisi'), isEmriRoutes);
app.use('/api/aksesuarlar', authenticateToken, modulYetkisi('aksesuar_yetkisi'), aksesuarRoutes);
app.use('/api/aksesuar-stok', authenticateToken, yazmaYetkisi('aksesuar_stok_yetkisi'), aksesuarStokRoutes);
app.use('/api/ikinci-el-motor', authenticateToken, motorYazmaYetkisi, ikinciElMotorRoutes);
app.use('/api/eticaret', authenticateToken, modulYetkisi('eticaret_yetkisi'), eticaretRoutes);
app.use('/api/yedek-parcalar', authenticateToken, modulYetkisi('yedek_parca_yetkisi'), yedekParcaRoutes);
app.use('/api/yedek-parca-stok', authenticateToken, yazmaYetkisi('yedek_parca_yetkisi'), yedekParcaStokRoutes);
app.use('/api/raporlar', authenticateToken, rolYetkisi('admin', 'yatirimci'), raporRoutes);
app.use('/api/veresiye', authenticateToken, rolYetkisi('admin'), veresiyeRoutes);
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

// Global hata yakalayıcı.
// Route'larda yakalanmayan hatalar buraya düşer; istemciye hiçbir zaman yığın izi
// (stack trace) sızdırılmaz, ayrıntı yalnızca sunucu loguna yazılır.
// eslint-disable-next-line no-unused-vars -- Express hata middleware'i 4 argüman ister
app.use((err, req, res, next) => {
  console.error('Yakalanmayan hata:', err);
  if (res.headersSent) return next(err);
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Gönderilen veri boyutu çok büyük' });
  }
  res.status(500).json({ message: 'Sunucu hatası' });
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
