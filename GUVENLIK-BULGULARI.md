# Güvenlik ve Kod İnceleme Bulguları

**İnceleme tarihi:** 26 Temmuz 2026
**Kapsam:** Backend (13 route, ~4.000 satır) + Frontend (23 sayfa, ~10.700 satır)

Bu belge, giderilmesi bekleyen bulguları içerir. Aynı incelemede giderilen hatalar
belgenin sonundaki [Giderilen bulgular](#giderilen-bulgular) bölümündedir.

---

## 🔴 Kritik — açık, öncelikli

### K1. Modül yetkilendirmesi yalnızca frontend'de uygulanıyor

**Durum:** Açık
**Etki:** Yetkisiz personel, tarayıcı arayüzünü baypas ederek (curl/Postman) yetkisi
olmayan modüllere okuma **ve yazma** erişimi sağlayabilir.

`frontend/src/App.jsx` içinde `AksesuarRoute`, `YedekParcaRoute`, `ServisRoute`,
`AksesuarStokRoute`, `EticaretRoute` gibi 10 route guard bulunur. Bunlar yalnızca
gezinmeyi kısıtlar; API tarafında karşılıkları yoktur.

Yetki kontrolü bulunmayan route dosyaları:

| Dosya | Mount | Kontrol |
|---|---|---|
| `routes/aksesuarlar.js` | `/api/aksesuarlar` | yalnızca `authenticateToken` |
| `routes/aksesuarStok.js` | `/api/aksesuar-stok` | yalnızca `authenticateToken` |
| `routes/yedekParcalar.js` | `/api/yedek-parcalar` | yalnızca `authenticateToken` |
| `routes/yedekParcaStok.js` | `/api/yedek-parca-stok` | yalnızca `authenticateToken` |
| `routes/musteriler.js` | `/api/musteriler` | yalnızca `authenticateToken` |
| `routes/veresiye.js` | `/api/veresiye` | yalnızca `authenticateToken` |

**Örnek:** Yalnızca `aksesuar_yetkisi` verilmiş bir personel
`DELETE /api/musteriler/5` çağırarak müşteri kaydı silebilir.

**Önerilen çözüm:** `backend/middleware/yetki.js` oluşturup `server.js`'teki mount
noktalarına eklemek. Kural, `App.jsx`'teki guard'larla birebir aynı olmalıdır:

```js
// backend/middleware/yetki.js
const modulYetkisi = (alan) => (req, res, next) => {
  if (req.user.rol === 'admin') return next();
  if (req.user[alan]) return next();
  return res.status(403).json({ message: 'Bu modül için yetkiniz yok' });
};
module.exports = { modulYetkisi };

// server.js
app.use('/api/aksesuarlar', authenticateToken, modulYetkisi('aksesuar_yetkisi'), aksesuarRoutes);
```

> Not: Yetkiler JWT payload'ında taşındığı için, yetki değişiklikleri mevcut
> token'lara 24 saat boyunca yansımaz. Yetki kontrolü eklenirken bu alanların
> token yerine veritabanından okunması da değerlendirilmelidir.

---

### K2. `/api/raporlar/*` — tüm personele açık

**Durum:** Açık
**Konum:** `backend/routes/raporlar.js:7`

`engelleYatirimci` middleware'i yalnızca `yatirimci` rolünü engeller. Sıradan personel
`/api/raporlar/gunluk`, `/aralik`, `/genel`, `/fis-kar`, `/personeller` uçlarından
işletmenin tüm ciro ve kâr rakamlarını çekebilir. Frontend `/raporlar` sayfasını
admin + yatırımcı ile sınırlar, API sınırlamaz.

**Önerilen çözüm:** `engelleYatirimci` yerine "admin veya yatırımcı" kuralı uygulayan
bir middleware kullanmak.

---

### K3. `/api/ikinci-el-motor/stats/ozet` — `sanitizeMotor()` baypas ediliyor

**Durum:** Açık
**Konum:** `backend/routes/ikinciElMotor.js:55`

Bu uç `toplam_kar`, `toplam_alis`, `toplam_satis` alanlarını hiçbir yetki filtresinden
geçirmeden döner. `kar_gor` / `alis_fiyati_gor` yetkilerinin tüm amacı tek uçla
etkisiz kalır.

**Önerilen çözüm:** Yanıtı `req.user` yetkilerine göre filtrelemek; `kar_gor` yoksa
`toplam_kar` alanını çıkarmak.

---

### K4. `/api/musteriler` — müşteri PII'si tüm kullanıcılara açık

**Durum:** Açık
**Konum:** `backend/routes/musteriler.js`

Ad, telefon, adres bilgileri her giriş yapmış kullanıcıya okunabilir; ayrıca
`POST`/`PUT`/`DELETE` uçları da korumasızdır. KVKK açısından risklidir.

---

### K5. `/api/veresiye` — tüm açık borçlar herkese açık

**Durum:** Açık
**Konum:** `backend/routes/veresiye.js:6`

Tüm modüllerdeki açık ödemeler (müşteri adı + tutar) yetki kontrolü olmadan döner.
Frontend'de `/veresiye` yalnızca admin'e açıktır.

---

### K6. `POST /api/ikinci-el-motor` — yetki kontrolü yok

**Durum:** Açık
**Konum:** `backend/routes/ikinciElMotor.js:125`

Yatırımcı dahil her kullanıcı motor kaydı oluşturabilir ve `yatirimci_id` alanını
istek gövdesinden serbestçe belirleyebilir.

---

### K7. Rate limiting bulunmuyor

**Durum:** Açık

`/api/auth/login` sınırsız şifre denemesine, `/api/auth/register` sınırsız kayda
açıktır. `express-rate-limit` ile en azından bu iki uç sınırlandırılmalıdır.

---

### K8. `plain_sifre` — düz metin şifre alanı

**Durum:** Açık (bilinen kısıt, README'de belgeli)
**Konum:** `backend/config/initDb.js:13`, `backend/routes/auth.js:156`

Admin panelindeki "personel şifresini görüntüleme" özelliği için şifreler ayrıca düz
metin saklanır ve `GET /auth/users` yanıtında döner. Veritabanı sızıntısında tüm
şifreler açığa çıkar.

**Önerilen çözüm:** Alanı kaldırıp admin'in şifre *sıfırlayabildiği* bir akışa geçmek.

---

## 🟡 Orta

| # | Bulgu | Konum |
|---|---|---|
| O1 | Frontend'de 46 bilinen açık (2 kritik, 23 yüksek) — tamamı `react-scripts` 5.0.1 (CRA) bağımlılık ağacından. CRA 2023'ten beri bakımsız; Vite'a geçiş neredeyse tamamını giderir. | `frontend/package.json` |
| O2 | Node 18 sürümü pinlenmiş; Nisan 2025'te EOL oldu. Node 22 LTS önerilir. | `nixpacks.toml` |
| O3 | 19 tablo için yalnızca 3 index var (üçü de vitrin tablolarında). `is_emri_id`, `aksesuar_id`, `stok_kodu`, `telefon`, `token`, `yatirimci_id`, `durum` indexsiz. | `backend/config/initDb.js` |
| O4 | `express.json({ limit: '120mb' })` tüm uçlara uygulanıyor; yalnızca vitrin yükleme uçlarında olmalı. Mevcut hâli DoS vektörüdür. | `backend/server.js:47` |
| O5 | 641 kullanılmayan import (ESLint: 0 hata, 641 uyarı) — tamamı ölü MUI import'u. | `frontend/src/pages/*` |
| O6 | `authenticateToken` ve `isAdmin` iki ayrı dosyada kopyalanmış. | `server.js:50`, `routes/auth.js:9` |
| O7 | Güvenlik başlıkları yok (`helmet` kullanılmıyor). | `backend/server.js` |
| O8 | Global error handler yok; beklenmeyen hatalar Express varsayılanına düşüyor. | `backend/server.js` |
| O9 | Yerel geliştirme için koda gömülü varsayılan şifre (`'12345'`). | `backend/config/db.js:27` |
| O10 | Production'da `FRONTEND_URL` tanımlı değilse CORS tüm origin'lere açık. | `backend/server.js:39` |
| O11 | `masraflar` alanı, diğer hassas alanların aksine yetki kontrolünden geçmiyor; yetkisiz kullanıcı 0 göndererek kârı değiştirebilir. | `backend/routes/ikinciElMotor.js:227` |
| O12 | `POST /is-emirleri/qr-token` yetki kontrolü olmadan herhangi bir plaka için herkese açık servis geçmişi bağlantısı üretebiliyor. | `backend/routes/isEmirleri.js:290` |

---

## Klasör yapısı hakkında not

Mevcut yapı (`config/`, `routes/`, `pages/`, `context/`, `services/`) bu ölçekteki bir
proje için yeterince açık ve okunabilirdir; kapsamlı bir yeniden düzenleme, çalışan
sistemi bozma riski karşısında yeterli fayda sağlamaz.

Tek gerçek yapısal eksik `backend/middleware/` klasörüdür — K1'in çözümü zaten bu
klasörü gerektirir. İkinci sırada, route dosyalarının HTTP + iş mantığı + SQL'i bir
arada tutması gelir (400 satırlık dosyalar); bu, ileride bir `services/` katmanıyla
ayrılabilir ancak acil değildir.

---

## Giderilen bulgular

Aşağıdaki hatalar 26 Temmuz 2026 tarihli incelemede giderilmiş ve gerçek bir
PostgreSQL 15 örneği üzerinde test edilerek doğrulanmıştır.

### ✅ G1. Fiş numarası yarış koşulu

`isEmirleri.js` içinde fiş numarası kilitsiz `MAX(fis_no) + 1` ile üretiliyordu.
Eşzamanlı iki iş emrinde ikisi de aynı numarayı okuyor, `fis_no UNIQUE` kısıtı
nedeniyle biri "Sunucu hatası" alıyordu.

*Test sonucu (önce):* 5 eşzamanlı istekten **3'ü** UNIQUE ihlaliyle başarısız.
*Çözüm:* Numara üretimi `pg_advisory_xact_lock` ile serileştirildi. Kilit COMMIT/ROLLBACK
ile kendiliğinden bırakılır. `MAX+1` numaralama mantığı bilinçli olarak korundu.
*Test sonucu (sonra):* 5 eşzamanlı isteğin tamamı başarılı, numaralar boşluksuz (1-5).

### ✅ G2. Aksesuar stoğunda çift düşüm

Stok, UNIQUE olmayan `stok_adi` kolonuyla eşleniyordu. Aynı adlı iki ürün varsa
`UPDATE ... WHERE stok_adi = $1` **iki satırı birden** güncelliyordu.

*Test sonucu (önce):* Aynı adlı 2 kayıtta `rowCount = 2`.
*Çözüm:* Alt sorgu ile tek ve deterministik satır güncelleniyor. Aksesuar satış akışı
baştan sona ad üzerinden çalıştığı ve `aksesuar_parcalar` tablosunda stok id'si
tutulmadığı için ad bağı korundu; ID'ye taşımak frontend değişikliği gerektirir.
*Test sonucu (sonra):* Yalnızca 1 satır güncelleniyor.

### ✅ G3. Stok negatife düşebiliyordu

`mevcut = mevcut - $1` kontrolsüzdü. Tüm stok hareketleri (`aksesuarlar.js`,
`eticaret.js`, `isEmirleri.js`, `yedekParcalar.js`) `GREATEST(..., 0)` ile taban
korumasına alındı. Satış akışı engellenmedi — yalnızca stok 0'ın altına inmiyor.

### ✅ G4. Oturum süresi dolunca ekran sessizce çalışmayı bırakıyordu

Backend süresi dolmuş token'a **403** dönüyor, `api.js` ise yalnızca **401**
yakalıyordu. 24 saat sonra her istek sessizce başarısız oluyor, kullanıcı login'e
yönlendirilmiyordu.

*Çözüm:* Token hatalarına `code: 'TOKEN_INVALID' | 'TOKEN_MISSING'` alanı eklendi;
`api.js` bu kodu kontrol ediyor. Yetki reddi kaynaklı 403'ler (ör. "Admin yetkisi
gerekli") kullanıcıyı **çıkışa zorlamaz** — ayrım bu yüzden status yerine kod
üzerinden yapılır. HTTP status kodları ve mesajlar değiştirilmedi.

### ✅ G5. `/api/health` production'da bozuktu

SPA catch-all (`app.get('*')`) health check'ten önce tanımlıydı; `/api/health`
production'da JSON yerine `index.html` dönüyordu. Sıralama düzeltildi.

### ✅ G6. `queryWithRetry` ölü kodu

`config/db.js` içinde tanımlanmış ve export edilmiş, ancak hiçbir yerde
kullanılmıyordu. Kaldırıldı. Sorgu düzeyinde yeniden deneme isteniyorsa ayrı ve
bilinçli bir çalışma olarak ele alınmalıdır.

### ✅ G7. Backend bağımlılık açıkları

`express`, `qs`, `body-parser` kaynaklı 3 orta seviye açık `npm audit fix` ile
giderildi. Sonuç: 0 açık.
