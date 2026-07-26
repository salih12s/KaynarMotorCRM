# Güvenlik ve Kod İnceleme Bulguları

**İnceleme tarihi:** 26 Temmuz 2026
**Kapsam:** Backend (13 route, ~4.000 satır) + Frontend (23 sayfa, ~10.700 satır)

Bu incelemede tespit edilen bulguların tamamı giderilmiştir; açık kalan iki madde
[Açık maddeler](#açık-maddeler) bölümünde, gerekçeleriyle birlikte listelenmiştir.

---

## Açık maddeler

### A1. `plain_sifre` — düz metin şifre alanı

**Durum:** Açık — ürün kararı bekliyor
**Konum:** `backend/config/initDb.js`, `backend/routes/auth.js`

Admin panelindeki "personel şifresini görüntüleme" özelliği için şifreler `bcrypt`
hash'inin yanı sıra düz metin olarak da saklanır ve `GET /auth/users` yanıtında döner.
Veritabanı sızıntısında tüm kullanıcı şifreleri doğrudan açığa çıkar.

Teknik olarak kaldırılması kolaydır (arayüz `plain_sifre || '***'` fallback'i kullandığı
için çökmez), ancak bu, yöneticinin fiilen kullandığı bir yeteneği ortadan kaldırır.
Doğru çözüm, şifreyi göstermek yerine **admin'in şifre sıfırlayabildiği** bir akışa
geçmektir; bu yeni bir arayüz gerektirdiğinden ayrı bir çalışma olarak ele alınmalıdır.

### A2. Frontend bağımlılıklarındaki bilinen açıklar (CRA)

**Durum:** Açık — ayrı bir çalışma olarak planlanmalı

`react-scripts` 5.0.1 bağımlılık ağacında 46 bilinen açık bulunur (2 kritik, 23 yüksek).
Bunların büyük bölümü yalnızca geliştirme sunucusunu (webpack-dev-server vb.) etkiler ve
üretim paketine girmez. Create React App 2023'ten beri bakım almamaktadır.

Kalıcı çözüm Vite'a geçiştir; bu, açıkların neredeyse tamamını giderir ve build süresini
belirgin şekilde kısaltır. Ancak 23 sayfalık çalışan bir uygulamada ortam değişkeni
adları, build çıktı yolu ve giriş noktası değişeceğinden, dikkatli ve ayrı test edilmesi
gereken bir geçiştir.

---

## Giderilen bulgular

Aşağıdaki düzeltmeler gerçek bir PostgreSQL 15 örneğine karşı uçtan uca test edilerek
doğrulanmıştır (45 yetkilendirme testi + 12 veri bütünlüğü testi).

### Yetkilendirme

#### ✅ G1. Modül yetkilendirmesi yalnızca frontend'de uygulanıyordu

`App.jsx` içindeki 10 route guard yalnızca gezinmeyi kısıtlıyor, API tarafında karşılığı
bulunmuyordu. Yetkisiz personel curl/Postman ile herhangi bir modüle okuma **ve yazma**
erişimi sağlayabiliyordu.

**Çözüm:** `backend/middleware/yetki.js` eklendi ve `server.js`'teki mount noktalarına
bağlandı. Kurallar `App.jsx`'teki guard'larla birebir eşleşir.

Tasarımın kritik noktası **okuma/yazma ayrımıdır**: bazı uçlar sahibi olmadıkları
ekranlar tarafından da okunur (ör. aksesuar stoğu; servis, e-ticaret, rapor ve vitrin
ekranlarında ürün aramak için kullanılır). Frontend'deki tüm çapraz kullanımların
salt-okunur olduğu tek tek doğrulanmış, bu nedenle salt-okunur uçlar açık bırakılıp
yalnızca yazma işlemleri yetkiye bağlanmıştır. Aksi hâlde çalışan formlar kırılırdı.

| Uç | Kural |
|---|---|
| `/api/is-emirleri` | `servis_yetkisi` (okuma + yazma) |
| `/api/aksesuarlar` | `aksesuar_yetkisi` (okuma + yazma) |
| `/api/eticaret` | `eticaret_yetkisi` (okuma + yazma) |
| `/api/yedek-parcalar` | `yedek_parca_yetkisi` (okuma + yazma) |
| `/api/aksesuar-stok` | okuma serbest, yazma `aksesuar_stok_yetkisi` |
| `/api/yedek-parca-stok` | okuma serbest, yazma `yedek_parca_yetkisi` |
| `/api/ikinci-el-motor` | okuma serbest (`sanitizeMotor` filtreler), yazma admin/yatırımcı/`motor_satis_yetkisi` |
| `/api/raporlar` | admin veya yatırımcı |
| `/api/veresiye` | admin |
| `/api/musteriler` | arama uçları serbest, listeleme ve yönetim admin |

#### ✅ G2. `/api/raporlar/*` tüm personele açıktı

`engelleYatirimci` yalnızca yatırımcıyı engelliyordu; sıradan personel işletmenin tüm
ciro ve kâr rakamlarını çekebiliyordu. Artık yalnızca admin ve yatırımcı erişebilir.

#### ✅ G3. `/api/ikinci-el-motor/stats/ozet` yetki filtresini baypas ediyordu

Toplam kâr, alış ve satış tutarları hiçbir filtreden geçmeden dönüyordu. `sanitizeOzet()`
eklendi; toplamlar artık tekil kayıtlarla aynı yetki kurallarını izler.

#### ✅ G4. `/api/musteriler` tüm kullanıcılara açıktı

Müşteri adı, telefonu ve adresi her kullanıcı tarafından okunabiliyor, ayrıca
oluşturma/güncelleme/**silme** uçları da korumasızdı. Listeleme, detay ve yönetim
uçları admin'e kısıtlandı; arama uçları (formların ihtiyaç duyduğu) açık bırakıldı.

#### ✅ G5. `/api/veresiye` tüm kullanıcılara açıktı

Tüm modüllerdeki açık borçlar (müşteri adı + tutar) yetki kontrolü olmadan dönüyordu.
Admin'e kısıtlandı.

#### ✅ G6. `POST /api/ikinci-el-motor` yetki kontrolsüzdü

Artık admin, yatırımcı veya `motor_satis_yetkisi` gerektirir (frontend'deki
`MotorStokRoute` ile aynı kural).

#### ✅ G7. Hız sınırlama yoktu

`/api/auth/login` sınırsız şifre denemesine açıktı. `express-rate-limit` eklendi.
Limitler bilinçli olarak geniştir (15 dakikada 30 **başarısız** deneme); işletmedeki tüm
personel tek bir genel IP arkasından bağlandığı için dar bir limit gerçek kullanıcıları
kilitleyebilirdi. Başarılı girişler kotayı tüketmez. Kayıt ucu saatte 10 ile sınırlıdır.

#### ✅ G8. `masraflar` yetki kontrolünden geçmiyordu

Diğer tüm hassas alanlar korunurken bu alan açıktaydı; yetkisiz kullanıcı boş göndererek
kâr hesabını değiştirebiliyordu. Alış fiyatıyla aynı yetkiye bağlandı.

#### ✅ G9. QR token ucu korumasızdı

`POST /is-emirleri/qr-token` herhangi bir kullanıcının, herhangi bir plaka için herkese
açık servis geçmişi bağlantısı üretmesine izin veriyordu. Artık `servis_yetkisi` gerekir.

### Veri bütünlüğü

#### ✅ G10. Fiş numarası yarış koşulu

Kilitsiz `MAX(fis_no)+1` nedeniyle eş zamanlı iki iş emri aynı numarayı üretiyor,
`fis_no UNIQUE` kısıtı yüzünden biri "Sunucu hatası" alıyordu.

*Test (önce):* 5 eş zamanlı istekten **3'ü** başarısız.
*Çözüm:* `pg_advisory_xact_lock` ile serileştirildi; `MAX+1` mantığı korundu.
*Test (sonra):* 5 isteğin tamamı başarılı, numaralar boşluksuz.

#### ✅ G11. Aksesuar stoğunda çift düşüm

`stok_adi` UNIQUE olmadığından, aynı adlı iki üründe `UPDATE` iki satırı birden
güncelliyordu (test ile doğrulandı: `rowCount = 2`). Tekrarlanan 4 SQL bloğu
`aksesuarStokAyarla()` yardımcısında toplandı; alt sorgu ile tek ve deterministik satır
güncellenir. Eşleşme bulunamazsa uyarı loglanır.

#### ✅ G12. Stok negatife düşebiliyordu

Tüm stok hareketleri (`aksesuarlar`, `eticaret`, `isEmirleri`, `yedekParcalar`)
`GREATEST(..., 0)` ile taban korumasına alındı. Satış akışı engellenmedi.

### Oturum ve altyapı

#### ✅ G13. Oturum süresi dolunca ekran sessizce çalışmayı bırakıyordu

Backend süresi dolmuş token'a **403**, `api.js` ise yalnızca **401** yakalıyordu.
Token hatalarına `code: TOKEN_INVALID | TOKEN_MISSING` eklendi. Yetki reddi kaynaklı
403'ler kullanıcıyı çıkışa zorlamaz — ayrım bu nedenle status yerine kod üzerinden
yapılır. Ayrıca hatalı şifre girişinde login sayfasının yeniden yüklenip hata mesajını
silmesi engellendi.

#### ✅ G14. `/api/health` production'da bozuktu

SPA catch-all (`app.get('*')`) health check'ten önce tanımlıydı; JSON yerine
`index.html` dönüyordu. Sıralama düzeltildi.

#### ✅ G15. Güvenlik başlıkları yoktu

`helmet` eklendi. `contentSecurityPolicy` kapalıdır (CRA build'i inline script/stil
üretir, varsayılan CSP arayüzü bozar); `crossOriginResourcePolicy` `cross-origin`
olarak ayarlanmıştır (vitrin görsel/videoları farklı bir origin'e servis edilir).

#### ✅ G16. Gövde boyutu limiti tüm uçlara uygulanıyordu

120 MB'lik limit yalnızca vitrin yükleme uçlarına indirildi; diğer uçlar için 10 MB.

#### ✅ G17. Global hata yakalayıcı yoktu

Eklendi. İstemciye hiçbir zaman yığın izi sızdırılmaz; aşırı büyük gövdeler için 413
döner.

#### ✅ G18. CORS production'da tüm origin'lere açılabiliyordu

`FRONTEND_URL` tanımlı değilse tüm origin'lere izin veren yedek kural kaldırıldı.
Reddedilen origin'ler loglanır; yeni bir alan adı kullanılacaksa `FRONTEND_URL`
ayarlanmalıdır.

#### ✅ G19. `authenticateToken` iki dosyada kopyalanmıştı

`server.js` ve `routes/auth.js` ayrı ayrı tanımlıyordu. `middleware/auth.js` altında
birleştirildi.

#### ✅ G20. Koda gömülü veritabanı şifresi

`config/db.js` içindeki yerel geliştirme varsayılanından şifre kaldırıldı; artık
`DB_PASSWORD` ortam değişkeninden okunur.

#### ✅ G21. Index eksikliği

19 tablo için yalnızca 3 index vardı. Sık sorgulanan yabancı anahtar ve arama kolonları
için 9 index eklendi (`CREATE INDEX IF NOT EXISTS` — tekrar çalıştırmak güvenlidir).

#### ✅ G22. Node 18 EOL

Nisan 2025'te desteği biten Node 18, Node 22 LTS ile değiştirildi.

#### ✅ G23. Ölü kod

Hiçbir yerde kullanılmayan `queryWithRetry` (`config/db.js`) ve `NormalRoute`
(`App.jsx`) kaldırıldı; kullanılmayan 9 değişken/import temizlendi. ESLint artık
uyarısız çalışır.

#### ✅ G24. Backend bağımlılık açıkları

`express`, `qs`, `body-parser` kaynaklı 3 orta seviye açık giderildi. Sonuç: 0 açık.

---

## Klasör yapısı hakkında not

Mevcut yapı (`config/`, `routes/`, `pages/`, `context/`, `services/`) bu ölçekteki bir
proje için yeterince açık ve okunabilirdir; kapsamlı bir yeniden düzenleme, çalışan
sistemi bozma riski karşısında yeterli fayda sağlamaz.

Eksik olan tek yapısal parça `backend/middleware/` klasörüydü; G1 kapsamında eklendi ve
kimlik doğrulama, yetkilendirme ve hız sınırlama artık burada toplanır.

Orta vadede değerlendirilebilecek tek konu, route dosyalarının HTTP işleme + iş mantığı +
SQL'i bir arada tutmasıdır (400 satırlık dosyalar). Bir `services/` katmanına ayrılabilir
ancak acil değildir.
