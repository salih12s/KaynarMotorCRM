# Kaynar Motor — Servis Yönetim Sistemi (CRM)

Kaynar Motor için geliştirilmiş, motosiklet servisi, 2. el motosiklet alım-satımı, aksesuar/yedek parça satışı, e-ticaret ve yatırımcı ortaklıklarını tek çatı altında yöneten tam kapsamlı bir işletme yönetim sistemi (CRM). Sistem aynı zamanda `kaynarmotor.com.tr` üzerinden herkese açık bir **vitrin/ilan sitesi** de sunar.

## İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Mimari](#mimari)
- [Proje Yapısı](#proje-yapısı)
- [Kurulum](#kurulum)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Çalıştırma](#çalıştırma)
- [Veritabanı Şeması](#veritabanı-şeması)
- [API Uç Noktaları](#api-uç-noktaları)
- [Roller ve Yetkilendirme](#roller-ve-yetkilendirme)
- [Deploy (Railway)](#deploy-railway)
- [Güvenlik Notları](#güvenlik-notları)
- [Lisans](#lisans)

## Özellikler

- **Servis modülü** — İş emri oluşturma, otomatik fiş numarası, parça/işçilik ekleme, kâr hesaplama, teslim alan/eden takibi, plaka ve hasar kaydı.
- **2. el motosiklet alım-satımı** — Alış/satış/noter fiyatları, masraf ve komisyon takibi, yatırımcı ortaklı motorlar için kâr paylaşımı, motor stoğunun vitrine otomatik bağlanması.
- **Aksesuar satışı ve stok yönetimi** — Barkod/stok kodu ile arama, beden/renk/kategori bazlı envanter, satış tamamlanınca stoktan otomatik düşme.
- **Yedek parça satışı** — Fiyat listesi yönetimi ve veresiye (kalan ödeme) takibi.
- **E-ticaret** — Trendyol, Hepsiburada, N11, Shoppier gibi platformlara özel komisyon/KDV/kargo formülleriyle net kâr hesabı.
- **Yatırımcı sistemi** — Motor sermayesine ortak olan yatırımcılar için ayrı rol, kendi stok/satış/kâr raporları, isteğe bağlı "vitrin modu" (sadece liste fiyatını görme).
- **Veresiye/borç takibi** — Servis, aksesuar, motor ve yedek parça modüllerindeki tüm açık ödemelerin tek ekranda toplanması.
- **Taksit hesaplama** — Nakit fiyat üzerinden 3/6/9/12 ay taksit tablosu; müşteriyle salt-okunur bir link üzerinden paylaşılabilir.
- **Vitrin / Showroom sitesi** — Giriş yapmadan erişilebilen genel kullanıma açık ilan sitesi (motor, aksesuar, yedek parça, bakım-servis, nakliye, sigorta kategorileri; görsel ve video destekli ilanlar).
- **Raporlama** — Günlük rapor, tarih aralığı raporu, fiş bazlı kâr, personel bazlı raporlar, yatırımcı özeti.
- **Kullanıcı/personel yönetimi** — Admin onaylı kayıt, modül bazlı ve alan bazlı (kâr, alış fiyatı vb.) ince taneli yetkilendirme.
- **Aktivite log** — Kim, ne zaman, ne işlem yaptı kaydı (audit trail).
- **Müşteri sistemi** — Telefon numarasının son 10 hanesiyle otomatik müşteri eşleştirme; tüm modüllerden otomatik müşteri kaydı toplama.

## Teknoloji Yığını

| Katman | Teknolojiler |
|---|---|
| Backend | Node.js, Express 4, JSON Web Token (`jsonwebtoken`), `bcryptjs`, `pg` (node-postgres) |
| Veritabanı | PostgreSQL (ORM yok — şema `config/initDb.js` içinde SQL ile yönetilir) |
| Frontend | React 19, React Router 7, Material UI (MUI) 7, Axios, date-fns, jsbarcode, react-to-print (`react-scripts` / Create React App) |
| Dev orkestrasyonu | `concurrently` (root `package.json`) |
| Deploy | Railway (`railway.json`, `nixpacks.toml`), Heroku-tarzı `Procfile` |

## Mimari

Proje, tek repo içinde backend ve frontend'i barındıran bir monorepo yapısındadır:

- **Backend** (`backend/`): Express tabanlı REST API, JWT ile kimlik doğrulama, PostgreSQL'e `pg` ile doğrudan SQL sorguları.
- **Frontend** (`frontend/`): React SPA, rol/yetki bazlı route koruması, modül bazına göre değişen MUI temaları.
- **Production**'da backend, `frontend/build` klasörünü statik olarak serve eder ve SPA route'ları için `index.html`'e yönlendirme yapar.
- Backend, veritabanı henüz hazır olmasa da ayağa kalkar (`/api/health`) ve arka planda artan gecikmelerle DB bağlantısını yeniden dener (Railway soğuk başlatma senaryolarına dayanıklılık için).

## Proje Yapısı

```
KaynarMotor/
├── backend/
│   ├── server.js              # Express app, CORS, JWT middleware, route mount, DB init
│   ├── config/
│   │   ├── db.js               # PostgreSQL pool (DATABASE_URL veya DB_HOST bazlı)
│   │   ├── initDb.js           # Tüm tablo şeması (CREATE TABLE / ALTER TABLE migration'ları)
│   │   ├── activityLogger.js   # Aktivite log kaydı
│   │   └── musteriHelper.js    # Otomatik müşteri eşleştirme/kayıt (upsertMusteri)
│   ├── routes/                 # 11 route dosyası (bkz. API Uç Noktaları)
│   └── scripts/                # Tek seferlik migration/veri düzeltme script'leri
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/         # Layout.jsx (rol bazlı sidebar/menü)
│       ├── context/             # AuthContext, ThemeContext
│       ├── pages/                # 20 sayfa (servis, aksesuar, motor, e-ticaret, vitrin, raporlar...)
│       ├── services/             # api.js (axios katmanı)
│       └── App.jsx               # Route tanımları ve route-guard bileşenleri
├── backend/.env.example        # Backend ortam değişkeni şablonu
├── frontend/.env.example       # Frontend ortam değişkeni şablonu
├── package.json                # Root: install:all / dev / start / build script'leri
└── Procfile, railway.json, nixpacks.toml   # Deploy konfigürasyonu
```

## Kurulum

**Gereksinimler:**
- Node.js 18+
- PostgreSQL (yerel kurulum veya Railway/uzak bir instance)

```bash
git clone <repo-url>
cd KaynarMotor
npm run install:all   # root + backend + frontend bağımlılıklarını kurar
```

Ardından `backend/.env` ve `frontend/.env` dosyalarını aşağıdaki [Ortam Değişkenleri](#ortam-değişkenleri) bölümüne göre oluşturun.

## Ortam Değişkenleri

Şablon dosyaları repoda mevcuttur; kopyalayıp kendi değerlerinizle doldurun:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Gerçek `.env` dosyaları `.gitignore` kapsamındadır ve hiçbir zaman commit edilmez.

**`backend/.env`:**

| Değişken | Açıklama |
|---|---|
| `NODE_ENV` | `development` veya `production` |
| `PORT` | Sunucu portu (varsayılan `5000`) |
| `DATABASE_URL` | Tek parça PostgreSQL bağlantı adresi (opsiyonel — verilirse `DB_*` yerine kullanılır) |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | PostgreSQL bağlantı bilgileri (ayrı ayrı verilirse) |
| `JWT_SECRET` | JWT imzalama anahtarı — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` ile üretilebilir |
| `FRONTEND_URL` | CORS için izin verilen origin (production'da mutlaka set edilmeli) |
| `ADMIN_INITIAL_PASSWORD` | Yalnızca ilk kurulumda kullanılır; boş veritabanında `admin` hesabının şifresini belirler. Tanımlı değilse admin oluşturulmaz. |

**`frontend/.env`:**

| Değişken | Açıklama |
|---|---|
| `REACT_APP_API_URL` | Backend API adresi (örn. `http://localhost:5000/api`) |

## Çalıştırma

```bash
# Geliştirme (backend + frontend eş zamanlı, nodemon + react-scripts)
npm run dev

# Sadece backend
cd backend && npm run dev

# Sadece frontend
cd frontend && npm start

# Production build (frontend)
npm run build

# Production başlatma (backend, frontend/build'i statik serve eder)
npm start
```

Sağlık kontrolü: `GET /api/health`

## Veritabanı Şeması

Şema ORM kullanılmadan `backend/config/initDb.js` içinde SQL olarak tanımlanır ve sunucu her açılışta eksik tablo/kolonları otomatik oluşturur (`CREATE TABLE IF NOT EXISTS` + kademeli `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).

| Tablo | Açıklama |
|---|---|
| `kullanicilar` | Kullanıcılar/personel/yatırımcı/admin, onay durumu, yetki bayrakları |
| `musteriler` | Müşteri kayıtları |
| `is_emirleri` | Servis iş emirleri |
| `parcalar` | İş emrine bağlı parçalar |
| `aksesuar_stok` | Aksesuar envanteri |
| `aksesuarlar` | Aksesuar satışları |
| `aksesuar_parcalar` | Aksesuar satışına bağlı ürün kalemleri |
| `ikinci_el_motorlar` | 2. el motor alım-satım kayıtları |
| `eticaret_platformlar` | E-ticaret platformları (komisyon/KDV/kargo oranları) |
| `eticaret_satislar` | E-ticaret satışları |
| `yedek_parcalar` | Yedek parça fiyat listesi |
| `aktivite_log` | Kullanıcı aktivite/audit log |
| `vitrin_urunleri` | Genel kullanıma açık vitrin ilanları |
| `vitrin_gorseller` | İlan görselleri (base64) |
| `vitrin_kategori_iletisim` | Kategoriye özel iletişim/hizmet bilgisi |
| `vitrin_segmentler` | Motor segmentleri (Chopper, Scooter, Naked, Touring, vb.) |
| `vitrin_videolar` | İlan videoları (base64, HTTP Range ile servis edilir) |

## API Uç Noktaları

Tüm uçlar `/api` altında toplanır; `vitrin` dışındaki tüm route'lar JWT ile korunur.

| Mount noktası | Dosya | İşlev |
|---|---|---|
| `/api/auth` | `auth.js` | Kayıt, login, admin onayı, kullanıcı/yatırımcı oluşturma, yetki güncelleme, aktivite logları |
| `/api/musteriler` | `musteriler.js` | Müşteri CRUD, isim/telefon arama, geçmiş birleştirme |
| `/api/is-emirleri` | `isEmirleri.js` | Servis iş emirleri, parça listesi, kâr hesaplama |
| `/api/aksesuarlar` | `aksesuarlar.js` | Aksesuar satışları, stok düşme/geri ekleme |
| `/api/aksesuar-stok` | `aksesuarStok.js` | Aksesuar stok CRUD, barkod arama, toplu ekleme |
| `/api/ikinci-el-motor` | `ikinciElMotor.js` | 2. el motor alış/satış/kâr, yetkiye göre alan gizleme |
| `/api/eticaret` | `eticaret.js` | E-ticaret platform ve satış yönetimi |
| `/api/yedek-parcalar` | `yedekParcalar.js` | Yedek parça fiyat listesi |
| `/api/raporlar` | `raporlar.js` | Günlük/tarih aralığı raporları, yatırımcı raporu/özeti |
| `/api/veresiye` | `veresiye.js` | Tüm modüllerdeki açık ödemelerin konsolide listesi |
| `/api/vitrin` | `vitrin.js` | Public + admin vitrin/ilan yönetimi |
| `/api/health` | `server.js` | Sağlık kontrolü |

## Roller ve Yetkilendirme

Kimlik doğrulama JWT ile yapılır (24 saat geçerli token), şifreler `bcryptjs` ile hash'lenir. Yeni kayıtlar admin onayı bekler (`onay_durumu`).

**Roller:**
- `admin` — tam erişim
- `personel` — modül bazlı yetkilerle sınırlı
- `yatirimci` — yalnızca kendi motorlarını görür/yönetir; opsiyonel "vitrin modu" ile tüm satılık motorları liste fiyatıyla görebilir

**Modül bazlı yetkiler:** `aksesuar_yetkisi`, `motor_satis_yetkisi`, `eticaret_yetkisi`, `servis_yetkisi`, `aksesuar_stok_yetkisi`, `yedek_parca_yetkisi`, `motor_vitrin_yetkisi`, `aksesuar_vitrin_yetkisi`

**Alan bazlı görüntüleme yetkileri** (özellikle motor satışında ince taneli kontrol için): `liste_fiyati_gor`, `alis_fiyati_gor`, `satis_fiyati_gor`, `kar_gor`, `musteri_gor`, `satis_gecmisi_gor`. Bu yetkiler `ikinciElMotor.js` içindeki `sanitizeMotor()` fonksiyonu tarafından uygulanır ve hassas alanları (kâr, alış fiyatı, müşteri bilgisi) yetkisi olmayan kullanıcıların response'undan çıkarır.

## Deploy (Railway)

Proje Railway üzerinde `nixpacks.toml` ile build edilir:
1. `frontend`: `npm install` + `npm run build`
2. `backend`: `npm install`
3. Başlangıç komutu: `cd backend && node server.js`

Heroku-tarzı dağıtım için `Procfile` de mevcuttur (`web: cd backend && node server.js`). Production'da `NODE_ENV=production` set edilmelidir; backend bu durumda `frontend/build` klasörünü statik olarak serve eder.

## Güvenlik Notları

**Uygulanan pratikler:**

- Tüm sırlar (DB bağlantı bilgileri, `JWT_SECRET`) ortam değişkenlerinden okunur; repoda hiçbir gerçek kimlik bilgisi bulunmaz. Şablonlar için `.env.example` dosyalarına bakın.
- Şifreler `bcryptjs` ile hash'lenerek saklanır; kimlik doğrulama 24 saat geçerli JWT ile yapılır.
- Varsayılan admin hesabı yalnızca `ADMIN_INITIAL_PASSWORD` set edildiğinde oluşturulur — koda gömülü varsayılan şifre yoktur.
- Alan bazlı yetkilendirme sunucu tarafında uygulanır: `ikinciElMotor.js` içindeki `sanitizeMotor()`, kâr/alış fiyatı/müşteri gibi hassas alanları yetkisi olmayan kullanıcının response'undan çıkarır — gizleme yalnızca arayüzde değil, API seviyesindedir.
- Repoda gerçek müşteri verisi yer almaz; `backend/scripts/` altındaki tek seferlik veri aktarım script'lerindeki kayıtlar örnek (sahte) verilerdir.

**Bilinen kısıtlar / geliştirme alanları:**

- `kullanicilar` tablosunda, admin panelindeki "personel şifresini görüntüleme" özelliği için `plain_sifre` adlı düz metin şifre alanı tutulur. Güvenlik açısından tercih edilen bir yaklaşım değildir; yerine admin'in şifre sıfırlama yapabildiği bir akışa geçirilmesi planlanmaktadır.
- CORS ayarı, `NODE_ENV=development` iken veya production'da `FRONTEND_URL` tanımlı değilse tüm origin'lere izin verir. Production'da `FRONTEND_URL` mutlaka set edilmelidir.

## Lisans

Bu depo bir portföy/inceleme amacıyla herkese açık olarak yayınlanmıştır. Tüm hakları saklıdır.
