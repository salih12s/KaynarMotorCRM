/*
 * Modül bazlı yetkilendirme.
 *
 * Bu kurallar frontend/src/App.jsx içindeki route guard'larının sunucu tarafındaki
 * karşılığıdır. Guard'lar yalnızca gezinmeyi kısıtlar; asıl koruma buradadır.
 *
 * ÖNEMLİ — okuma/yazma ayrımı:
 * Bazı uçlar, sahibi olmadıkları sayfalar tarafından da OKUMA amaçlı kullanılır.
 * Örneğin aksesuar stoğu; servis, e-ticaret, rapor ve vitrin ekranlarında ürün
 * aramak için okunur. Bu yüzden salt-okunur uçlar açık bırakılıp yalnızca yazma
 * işlemleri (POST/PUT/PATCH/DELETE) yetkiye bağlanır. Frontend'de tüm çapraz
 * kullanımların salt-okunur olduğu doğrulanmıştır.
 */

const YAZMA_METODLARI = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Verilen yetki alanlarından en az birine sahip olmayı zorunlu kılar.
// Admin her zaman geçer.
const modulYetkisi = (...alanlar) => (req, res, next) => {
  if (req.user.rol === 'admin') return next();
  if (alanlar.some((alan) => req.user[alan])) return next();
  return res.status(403).json({ message: 'Bu modül için yetkiniz yok' });
};

// Yalnızca yazma işlemlerinde yetki arar; GET istekleri serbest bırakılır.
const yazmaYetkisi = (...alanlar) => (req, res, next) => {
  if (!YAZMA_METODLARI.includes(req.method)) return next();
  if (req.user.rol === 'admin') return next();
  if (alanlar.some((alan) => req.user[alan])) return next();
  return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
};

// Belirli rollere kısıtlar.
const rolYetkisi = (...roller) => (req, res, next) => {
  if (roller.includes(req.user.rol)) return next();
  return res.status(403).json({ message: 'Bu bölüme erişim yetkiniz yok' });
};

// Yalnızca yazma işlemlerinde rol arar; GET istekleri serbest bırakılır.
const yazmaRolu = (...roller) => (req, res, next) => {
  if (!YAZMA_METODLARI.includes(req.method)) return next();
  if (roller.includes(req.user.rol)) return next();
  return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
};

// Motor kayıtlarında yazma yetkisi.
// Frontend'deki MotorStokRoute ile aynı kural: admin, yatırımcı veya motor satış
// yetkisi olan personel. Okuma serbesttir; hassas alanlar zaten ikinciElMotor.js
// içindeki sanitizeMotor() tarafından kullanıcının yetkisine göre gizlenir.
const motorYazmaYetkisi = (req, res, next) => {
  if (!YAZMA_METODLARI.includes(req.method)) return next();
  if (req.user.rol === 'admin' || req.user.rol === 'yatirimci') return next();
  if (req.user.motor_satis_yetkisi) return next();
  return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
};

module.exports = { modulYetkisi, yazmaYetkisi, rolYetkisi, yazmaRolu, motorYazmaYetkisi };
