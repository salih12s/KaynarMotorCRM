const rateLimit = require('express-rate-limit');

/*
 * Kimlik doğrulama uçları için hız sınırlama.
 *
 * Limitler bilinçli olarak geniş tutulmuştur: işletmedeki tüm personel tek bir genel
 * IP adresinin arkasından bağlanır, dolayısıyla dar bir limit gerçek kullanıcıları
 * kilitleyebilir. skipSuccessfulRequests sayesinde başarılı girişler kotayı tüketmez;
 * yalnızca başarısız denemeler sayılır.
 */

const girisLimiti = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 30,                  // IP başına 30 BAŞARISIZ deneme
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Çok fazla başarısız giriş denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.'
  },
});

const kayitLimiti = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 10,                  // IP başına saatte 10 kayıt denemesi
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Çok fazla kayıt denemesi yapıldı. Lütfen bir saat sonra tekrar deneyin.'
  },
});

module.exports = { girisLimiti, kayitLimiti };
