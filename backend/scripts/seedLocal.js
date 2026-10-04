/**
 * YEREL geliştirme veritabanına gerçekçi ÖRNEK veri yükler.
 *
 *   npm run seed          (proje kökünde ya da backend klasöründe)
 *
 * NE YAPAR
 *  - Şema yoksa oluşturur (config/initDb.js ile aynı kurulum).
 *  - İş verisi tablolarını BOŞALTIR ve örnek veriyle yeniden doldurur
 *    (müşteri, iş emri, stok, satış, motor, vitrin, e-ticaret, aktivite logu).
 *  - Mevcut kullanıcı hesaplarına DOKUNMAZ; yalnızca aşağıdaki demo hesaplarını ekler/günceller.
 *  - Her şey tek transaction içindedir: bir adım patlarsa eski veri olduğu gibi kalır.
 *
 * GÜVENLİK KİLİDİ
 *  - Yalnızca localhost'taki veritabanına yazar. DB_HOST yerel değilse, DATABASE_URL
 *    tanımlıysa ya da NODE_ENV=production ise veritabanına HİÇ bağlanmadan durur.
 *    (set-production-env.bat çalıştırılmışken yanlışlıkla canlıyı silmemek için.)
 *
 * KVKK
 *  - Buradaki tüm kişiler, telefonlar, adresler, plakalar ve TC numaraları UYDURMADIR.
 *    TC numaraları bilerek geçersiz sağlama basamağıyla üretilir. Gerçek veri eklemeyin.
 */
const path = require('path');
const fs = require('fs');

// server.js ile aynı sırayla yüklenir: script, sunucunun bağlanacağı veritabanını hedefler.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ---------------------------------------------------------------------------
// Güvenlik kilidi
// ---------------------------------------------------------------------------
const YEREL_HOSTLAR = ['localhost', '127.0.0.1', '::1'];

// Hedef veritabanı yerel değilse sebeplerini döndürür (boş dizi = güvenli).
const hedefSorunlari = (env) => {
  const sorunlar = [];
  if (env.DATABASE_URL) sorunlar.push('DATABASE_URL tanımlı (uzak bir veritabanını gösteriyor olabilir)');
  if (env.NODE_ENV === 'production') sorunlar.push('NODE_ENV=production');
  const host = String(env.DB_HOST || '').trim().toLowerCase();
  if (!YEREL_HOSTLAR.includes(host)) sorunlar.push(`DB_HOST yerel değil: "${env.DB_HOST || '(boş)'}"`);
  return sorunlar;
};

const sorunlar = hedefSorunlari(process.env);
if (sorunlar.length > 0) {
  console.error('\nDURDURULDU — örnek veri yalnızca YEREL veritabanına yüklenir.');
  sorunlar.forEach((s) => console.error(`  • ${s}`));
  console.error('\nÖnce set-local-env.bat çalıştırın, sonra tekrar deneyin. Veritabanına bağlanılmadı.\n');
  process.exit(1);
}

// Kilit geçildikten SONRA yüklenir: db.js bağlantı ayarını require anında ortamdan okur.
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { initializeDatabase } = require('../config/initDb');
const { hesaplaKomisyon, detectPlatform } = require('../routes/eticaret');

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
const DEMO_SIFRE = 'demo1234';
const FRONTEND = `http://localhost:${process.env.FRONTEND_PORT || 3100}`;

// Sabit tohumlu sözde-rastgele üreteç (mulberry32): her çalıştırmada AYNI veri üretilir.
let tohum = 20261004;
const rnd = () => {
  tohum = (tohum + 0x6D2B79F5) | 0;
  let t = Math.imul(tohum ^ (tohum >>> 15), 1 | tohum);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const aralik = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const sec = (dizi) => dizi[Math.floor(rnd() * dizi.length)];
const yuvarla = (n, adim) => Math.round(n / adim) * adim;
const tl = (n) => Number(n).toLocaleString('tr-TR');
const iki = (n) => String(n).padStart(2, '0');

// Tarihler bugüne GÖRE üretilir; script ne zaman çalışırsa çalışsın raporlar dolu görünür.
const SIMDI = new Date();
const gunOnce = (gun, saat = 10, dakika = 0) => {
  const d = new Date(SIMDI);
  d.setDate(d.getDate() - gun);
  d.setHours(saat, dakika, 0, 0);
  // Bugüne denk gelen kayıt gelecekte görünmesin (negatif gün bilerek ileri tarihtir)
  return gun >= 0 && d > SIMDI ? new Date(SIMDI.getTime() - 5 * 60 * 1000) : d;
};
const tarihStr = (d) => `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;

// Geçerli bir TC'nin 11. hanesi ilk 10 hanenin toplamının mod 10'udur; burada bilerek
// bir fazlası yazılır → üretilen numara hiçbir zaman gerçek bir TC olamaz.
const sahteTc = (i) => {
  const on = String(1000000000 + ((i * 48271 * 9973 + 104729) % 8999999999));
  const gercekSon = [...on].reduce((t, c) => t + Number(c), 0) % 10;
  return on + String((gercekSon + 1) % 10);
};

// 0500 Türkiye'de bir GSM operatörüne tahsisli değildir → numaralar kimseye ait değildir.
const sahteTelefon = (i) => {
  const s = String(5000000 + ((i * 73939 + 12007) % 4999999));
  return `0500 ${s.slice(0, 3)} ${s.slice(3, 5)} ${s.slice(5)}`;
};

const asciiYap = (s) => String(s)
  .replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S')
  .replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U')
  .replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C')
  .replace(/[^\x20-\x7E]/g, '');

// Tek sayfalık, geçerli ve çok küçük bir PDF üretir (satış belgesi örneği için).
const ornekPdf = (satirlar) => {
  const metin = satirlar.map((s, i) => `${i ? '0 -26 Td ' : ''}(${asciiYap(s).replace(/[()\\]/g, '\\$&')}) Tj`).join(' ');
  const icerik = `BT /F1 14 Tf 60 780 Td ${metin} ET`;
  const nesneler = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(icerik)} >>\nstream\n${icerik}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const ofsetler = [];
  nesneler.forEach((n, i) => { ofsetler.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${n}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${nesneler.length + 1}\n0000000000 65535 f \n`
    + ofsetler.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
    + `trailer\n<< /Size ${nesneler.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
};

// --- Görseller ---
// Fotoğraflar scripts/seed-gorseller/ altından okunur (npm run seed:gorseller ile iner).
// Dosya yoksa aynı ilana sade bir yer tutucu (SVG) konur; seed görselsiz de çalışır.
const GORSEL_KLASOR = path.join(__dirname, 'seed-gorseller');
const yerTutucu = (ust, alt) => {
  const kac = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2e2e2e"/><stop offset="1" stop-color="#101010"/></linearGradient></defs>
<rect width="1200" height="800" fill="url(#g)"/>
<rect x="80" y="372" width="96" height="8" fill="#C62828"/>
<text x="80" y="340" font-family="Segoe UI, Arial, sans-serif" font-size="64" font-weight="700" fill="#ffffff">${kac(ust)}</text>
<text x="80" y="440" font-family="Segoe UI, Arial, sans-serif" font-size="34" fill="#bdbdbd">${kac(alt)}</text>
<text x="80" y="720" font-family="Segoe UI, Arial, sans-serif" font-size="24" letter-spacing="6" fill="#757575">KAYNAR MOTOR</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
};
let eksikGorsel = 0;
const gorselOku = (dosya) => {
  const tam = path.join(GORSEL_KLASOR, `${dosya}.jpg`);
  if (!fs.existsSync(tam)) return null;
  return `data:image/jpeg;base64,${fs.readFileSync(tam).toString('base64')}`;
};
// İlanın fotoğrafları; hiçbiri yoksa tek bir yer tutucu döner.
const ilanGorselleri = (dosyalar, ust, alt) => {
  const bulunan = (dosyalar || []).map(gorselOku).filter(Boolean);
  if (bulunan.length > 0) return bulunan;
  if ((dosyalar || []).length > 0) eksikGorsel++;
  return [yerTutucu(ust, alt)];
};

// ---------------------------------------------------------------------------
// Sabit veri: kişiler, katalog, stok
// ---------------------------------------------------------------------------
const ADLAR = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'Hasan', 'İbrahim', 'Murat', 'Serkan', 'Oğuz',
  'Kerem', 'Barış', 'Tolga', 'Cem', 'Volkan', 'Gökhan', 'Yusuf', 'Ayşe', 'Fatma', 'Zeynep',
  'Merve', 'Deniz', 'Ebru', 'Gizem', 'Seda', 'Uğur', 'Sinan', 'Erdem', 'Caner', 'Büşra'];
const SOYADLAR = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Öztürk', 'Özdemir', 'Doğan', 'Kılıç', 'Aslan',
  'Çetin', 'Koç', 'Kurt', 'Şimşek', 'Polat', 'Korkmaz', 'Güneş', 'Aksoy', 'Tekin', 'Bulut',
  'Yavuz', 'Acar', 'Taş', 'Güler', 'Bozkurt', 'Uysal', 'Sarı', 'Akın', 'Ateş', 'Keskin'];
const MAHALLELER = [['Güvenevler', 'Yenişehir'], ['Limonluk', 'Yenişehir'], ['Pozcu', 'Yenişehir'],
  ['Viranşehir', 'Mezitli'], ['Davultepe', 'Mezitli'], ['Menderes', 'Mezitli'], ['Halkkent', 'Toroslar'],
  ['Akbelen', 'Toroslar'], ['Çilek', 'Akdeniz'], ['Kiremithane', 'Akdeniz'], ['Şehitishak', 'Tarsus'], ['Merkez', 'Erdemli']];

const MUSTERI_SAYISI = 48;
const musteriUret = () => {
  const liste = [];
  const gorulen = new Set();
  // Tur (i / ADLAR.length) soyad kaydırmasına katılır; aksi hâlde eşleşmeler 30 kayıtta bir
  // tekrar eder ve döngü yeni isim üretemez. Üst sınır, veri değişirse sonsuz döngüyü engeller.
  for (let i = 0; liste.length < MUSTERI_SAYISI; i++) {
    if (i > 5000) throw new Error('Yeterli sayıda benzersiz müşteri adı üretilemedi');
    const tur = Math.floor(i / ADLAR.length);
    const ad = `${ADLAR[(i * 7) % ADLAR.length]} ${SOYADLAR[(i * 11 + tur * 13 + 3) % SOYADLAR.length]}`;
    if (gorulen.has(ad)) continue;
    gorulen.add(ad);
    const [mahalle, ilce] = MAHALLELER[i % MAHALLELER.length];
    liste.push({
      ad_soyad: ad,
      telefon: sahteTelefon(liste.length + 1),
      adres: `${mahalle} Mah. ${1200 + ((i * 37) % 4800)}. Sk. No:${1 + ((i * 5) % 48)} D:${1 + (i % 14)}, ${ilce}/Mersin`,
      tc: sahteTc(liste.length + 1),
    });
  }
  return liste;
};

const HARF3 = ['ABK', 'ACD', 'AFR', 'BGT', 'BHN', 'CKL', 'DMR', 'EYS', 'FTH', 'GZP', 'KRM', 'MTR', 'NVS', 'PRT', 'TKN', 'UZL'];
const HARF2 = ['KA', 'MB', 'SD', 'TE', 'HN', 'ZR', 'LP', 'VC'];
const ILLER = ['33', '33', '33', '33', '01', '33', '07', '33', '31', '33'];
const kullanilanPlakalar = new Set();
const plakaUret = (i) => {
  for (let k = 0; ; k++) {
    const n = i + k * 101;
    const il = ILLER[n % ILLER.length];
    const p = n % 3 === 0
      ? `${il} ${HARF2[n % HARF2.length]} ${1000 + ((n * 397) % 9000)}`
      : `${il} ${HARF3[n % HARF3.length]} ${100 + ((n * 53) % 900)}`;
    if (!kullanilanPlakalar.has(p)) { kullanilanPlakalar.add(p); return p; }
  }
};

// [marka, model, cc, vitrin segmenti, 2026 model yaklaşık piyasa fiyatı (₺)]
const MODELLER = [
  ['Honda', 'PCX 125', 125, 'Scooter', 185000],
  ['Honda', 'Activa 125', 125, 'Scooter', 105000],
  ['Honda', 'Forza 250', 250, 'Maxi Scooter', 380000],
  ['Honda', 'CBR250R', 250, 'Racing', 260000],
  ['Honda', 'CB650R', 649, 'Naked', 760000],
  ['Honda', 'CMX500 Rebel', 471, 'Chopper', 540000],
  ['Honda', 'CRF250L', 249, 'Cross/Enduro', 340000],
  ['Yamaha', 'NMAX 155', 155, 'Scooter', 205000],
  ['Yamaha', 'XMAX 250', 250, 'Maxi Scooter', 355000],
  ['Yamaha', 'YZF-R25', 249, 'Racing', 330000],
  ['Yamaha', 'MT-25', 249, 'Naked', 310000],
  ['Yamaha', 'MT-07', 689, 'Naked', 690000],
  ['Yamaha', 'Tracer 7', 689, 'Touring', 760000],
  ['Kawasaki', 'Z900', 948, 'Naked', 930000],
  ['Kawasaki', 'Ninja 400', 399, 'Racing', 450000],
  ['Kawasaki', 'Versys 650', 649, 'Touring', 640000],
  ['KTM', '390 Duke', 373, 'Naked', 380000],
  ['KTM', '250 Duke', 249, 'Naked', 300000],
  ['CFMOTO', '250SR', 249, 'Racing', 225000],
  ['CFMOTO', '250NK', 249, 'Naked', 205000],
  ['CFMOTO', '450SR', 449, 'Racing', 345000],
  ['Bajaj', 'Dominar 400', 373, 'Touring', 275000],
  ['Bajaj', 'Pulsar NS200', 199, 'Naked', 160000],
  ['TVS', 'Apache RTR 200', 197, 'Naked', 150000],
  ['Vespa', 'Primavera 150', 150, 'Scooter', 310000],
  ['SYM', 'Jet 14 125', 125, 'Scooter', 120000],
  ['Kuba', 'Çita 180R', 180, 'Naked', 78000],
  ['Mondial', 'Drift L 125', 125, 'Scooter', 72000],
  ['RKS', 'Bitter 50', 50, 'Scooter', 48000],
  ['Arora', 'Cappucino 125', 125, 'Scooter', 66000],
  ['Suzuki', 'V-Strom 650', 645, 'Touring', 650000],
  ['Royal Enfield', 'Meteor 350', 349, 'Chopper', 350000],
];
// Yaşa göre değer kaybı: yılda ~%7, en fazla yarı fiyat
const ikinciElFiyat = (sifirFiyat, yil) => yuvarla(sifirFiyat * Math.max(0.5, 1 - 0.07 * (2026 - yil)), 2500);

const SIFIR_NOTLAR = '• 2 yıl üretici garantisi\n• Plaka ve ruhsat işlemleri tarafımızdan yapılır\n• Kredi kartına taksit ve takas imkânı';
const IKINCI_EL_NOTLAR = '• Ekspertiz raporu mevcuttur\n• Takas ve kredi kartına taksit imkânı\n• Noter satışı aynı gün yapılır';

// Sitede (vitrinde) yayınlanan motorlar. Her biri aynı zamanda stoktaki bir motordur.
const VITRIN_MOTORLAR = [
  { gorsel: ['cfmoto-250sr', 'cfmoto-250sr-2'], marka: 'CFMOTO', model: '250SR', yil: 2026, km: 0, cc: 249, segment: 'Racing', sifir: true, fiyat: 229000, one: true,
    baslik: 'Sıfır CFMOTO 250SR ABS – 2026 Model, Hemen Teslim',
    ozet: 'Çift kanal ABS, TFT ekran ve LED aydınlatmalı 2026 model CFMOTO 250SR. A2 ehliyetle kullanılabilir, şehir içi ve pist günleri için ideal.' },
  { gorsel: ['honda-pcx'], marka: 'Honda', model: 'PCX 125', yil: 2026, km: 0, cc: 125, segment: 'Scooter', sifir: true, fiyat: 189500, one: true,
    baslik: 'Sıfır Honda PCX 125 – Start-Stop, Akıllı Anahtar',
    ozet: 'B ehliyetle kullanılabilen, 100 km\'de yaklaşık 2,1 litre yakan Honda PCX 125. Akıllı anahtar, start-stop ve geniş sele altı hacmi.' },
  { gorsel: ['yamaha-nmax'], marka: 'Yamaha', model: 'NMAX 155', yil: 2026, km: 0, cc: 155, segment: 'Scooter', sifir: true, fiyat: 209000,
    baslik: 'Sıfır Yamaha NMAX 155 – ABS, Bluetooth Bağlantı',
    ozet: 'Çift kanal ABS, çekiş kontrolü ve telefon bağlantılı gösterge paneliyle yeni NMAX 155. Stoktan hemen teslim.' },
  { gorsel: ['honda-super-cub', 'honda-super-cub-2'], marka: 'Honda', model: 'Super Cub C125', yil: 2026, km: 0, cc: 125, segment: 'Cub', sifir: true, fiyat: 204000,
    baslik: 'Sıfır Honda Super Cub C125 – Efsane Geri Döndü',
    ozet: 'Yarı otomatik şanzıman, ABS ve LED farlı Super Cub C125. Dünyanın en çok üretilen motosikletinin modern yorumu.' },
  { gorsel: ['yamaha-mt07'], marka: 'Yamaha', model: 'MT-07', yil: 2021, km: 18400, cc: 689, segment: 'Naked', fiyat: 615000, one: true, yatirimci: 'yatirimci1',
    baslik: 'Yamaha MT-07 2021 – 18.400 km, Hatasız, Yetkili Servis Bakımlı',
    ozet: 'İlk sahibinden, tüm bakımları yetkili serviste yapılmış MT-07. Lastikler ve zincir dişli seti yeni, orijinal egzoz mevcut.', hasar: 'Hasar kaydı yok' },
  { gorsel: ['yamaha-r25'], marka: 'Yamaha', model: 'YZF-R25', yil: 2019, km: 27300, cc: 249, segment: 'Racing', fiyat: 268000,
    baslik: 'Yamaha YZF-R25 2019 – Bakımları Yeni, Muayene 2027',
    ozet: 'Periyodik bakımı yeni yapıldı; yağ, filtre ve bujiler değişti. Ön-arka balatalar yeni, muayenesi 2027\'ye kadar geçerli.', hasar: '12.500 ₺ hasar kaydı (sol grenaj)' },
  { gorsel: ['honda-cb650r'], marka: 'Honda', model: 'CB650R', yil: 2021, km: 14200, cc: 649, segment: 'Naked', fiyat: 665000,
    baslik: 'Honda CB650R 2021 – Neo Sports Café, Garaj Motoru',
    ozet: 'Dört silindirli motoruyla CB650R. Kışın kullanılmamış, kapalı garajda muhafaza edilmiştir. İkinci anahtarı ve kitapçığı mevcut.', hasar: 'Hasar kaydı yok' },
  { gorsel: ['kawasaki-z900', 'kawasaki-z900-2'], marka: 'Kawasaki', model: 'Z900', yil: 2022, km: 11800, cc: 948, segment: 'Naked', fiyat: 845000, one: true, yatirimci: 'yatirimci1',
    baslik: 'Kawasaki Z900 2022 – 11.800 km, Performance Paket',
    ozet: 'Akrapovič egzoz, kısa plakalık ve grenaj koruma takılı Z900. Sürüş modları ve çekiş kontrolü sorunsuz çalışıyor.', hasar: 'Hasar kaydı yok' },
  { gorsel: ['ktm-390-duke'], marka: 'KTM', model: '390 Duke', yil: 2020, km: 21500, cc: 373, segment: 'Naked', fiyat: 298000,
    baslik: 'KTM 390 Duke 2020 – TFT Ekran, Quickshifter',
    ozet: 'A2 ehliyete uygun, hafif ve çevik 390 Duke. Zincir dişli seti 2.000 km önce değişti, lastikler %80.' },
  { gorsel: ['honda-africa-twin'], marka: 'Honda', model: 'CRF1100L Africa Twin', yil: 2022, km: 23600, cc: 1084, segment: 'Touring', fiyat: 1195000, yatirimci: 'yatirimci2',
    baslik: 'Honda Africa Twin 2022 – DCT, Çantalı, Seyahate Hazır',
    ozet: 'DCT şanzımanlı Africa Twin. Alüminyum yan çantalar, motor koruma demiri ve yüksek cam takılı. Uzun yola hazır.', hasar: 'Hasar kaydı yok' },
  { gorsel: ['yamaha-xmax'], marka: 'Yamaha', model: 'XMAX 250', yil: 2021, km: 16900, cc: 250, segment: 'Maxi Scooter', fiyat: 305000,
    baslik: 'Yamaha XMAX 250 2021 – Arka Çantalı, Tek Kullanıcı',
    ozet: 'Arka çanta ve sırt dayama takılı XMAX 250. Varyatör kayışı ve bilyalar yeni değişti.' },
  { gorsel: ['honda-rebel', 'honda-rebel-2'], marka: 'Honda', model: 'CMX500 Rebel', yil: 2022, km: 9700, cc: 471, segment: 'Chopper', fiyat: 478000,
    baslik: 'Honda CMX500 Rebel 2022 – 9.700 km, Sıfır Ayarında',
    ozet: 'Alçak sele yüksekliğiyle rahat kullanım sunan Rebel 500. Hiç düşmemiş, tüm parçaları orijinal.', hasar: 'Hasar kaydı yok' },
  { gorsel: ['vespa-primavera'], marka: 'Vespa', model: 'Primavera 150', yil: 2023, km: 6200, cc: 150, segment: 'Scooter', fiyat: 289000,
    baslik: 'Vespa Primavera 150 2023 – Beyaz, 6.200 km',
    ozet: 'Bayan kullanıcıdan, sadece hafta sonları kullanılmış Primavera 150. Boyasız, çiziksiz.' },
  { gorsel: ['honda-crf250l'], marka: 'Honda', model: 'CRF250L', yil: 2020, km: 19800, cc: 249, segment: 'Cross/Enduro', fiyat: 285000,
    baslik: 'Honda CRF250L 2020 – Yol ve Arazi, Koruma Demirli',
    ozet: 'Hem asfaltta hem arazide kullanılabilen CRF250L. Karter koruma ve el koruma takılı, lastikler yeni.' },
  { gorsel: ['bajaj-dominar', 'bajaj-dominar-2'], marka: 'Bajaj', model: 'Dominar 400', yil: 2022, km: 24100, cc: 373, segment: 'Touring', fiyat: 228000,
    baslik: 'Bajaj Dominar 400 2022 – Touring Paket, Bakımlı',
    ozet: 'Yüksek cam, el koruma ve arka çanta demiriyle gelen Dominar 400. Uzun yol konforu arayanlar için uygun fiyatlı seçenek.', hasar: '8.200 ₺ hasar kaydı (sağ ayna, sinyal)' },
];

const VITRIN_DIGER = [
  { kategori: 'aksesuar', gorsel: ['kask'], yer: ['Full Face Kask', 'Shoei XR-1100'], fiyat: 14500, marka: 'Shoei',
    baslik: 'Shoei XR-1100 Full Face Kask – M Beden',
    aciklama: 'Fiberglas kabuk, çıkarılıp yıkanabilir iç süngerler ve Pinlock uyumlu vizör. ECE 22.05 sertifikalı.' },
  { kategori: 'aksesuar', gorsel: ['eldiven'], yer: ['Deri Eldiven', 'Karbon korumalı'], fiyat: 3200, marka: 'Hyod',
    baslik: 'Deri Yarış Eldiveni – Karbon Korumalı',
    aciklama: 'Tam deri, karbon eklem koruması ve çift bilek kapaması. L ve XL beden stokta.' },
  { kategori: 'aksesuar', gorsel: ['eldiven-scoyco'], yer: ['Yazlık Eldiven', 'Scoyco MC29'], fiyat: 1150, marka: 'Scoyco',
    baslik: 'Scoyco MC29 Yazlık Eldiven – Dokunmatik Uçlu',
    aciklama: 'Hava alan file kumaş, sert eklem koruması ve dokunmatik ekran uyumlu parmak uçları. M, L, XL.' },
  { kategori: 'aksesuar', gorsel: ['top-case'], yer: ['Arka Çanta', 'SHAD SH33'], fiyat: 3950, marka: 'SHAD',
    baslik: 'SHAD SH33 Arka Çanta – 33 Litre, Montaj Dahil',
    aciklama: 'Bir adet full face kask alır. Bağlantı plakası ile birlikte gelir, montajı mağazamızda ücretsiz yapılır.' },
  { kategori: 'aksesuar', gorsel: [], yer: ['Koruma Demiri', 'Honda PCX 125'], fiyat: 2400, marka: 'MTR',
    baslik: 'Koruma Demiri – Honda PCX 125 (2021 ve sonrası)',
    aciklama: 'Elektrostatik boyalı çelik koruma demiri. Delme-kesme gerektirmez, orijinal bağlantı noktalarına takılır.' },
  { kategori: 'aksesuar', gorsel: [], yer: ['Telefon Tutucu', 'Şarjlı'], fiyat: 950, marka: 'Kaynar',
    baslik: 'Şarjlı Telefon Tutucu – Titreşim Önleyici',
    aciklama: 'USB-C hızlı şarj çıkışlı, kamera sensörünü koruyan titreşim sönümleyicili telefon tutucu.' },
  { kategori: 'yedek_parca', gorsel: [], yer: ['Zincir Dişli Seti', 'DID 520'], fiyat: 4600, marka: 'DID',
    baslik: 'DID 520 Zincir Dişli Seti – MT-07 / YZF-R25 Uyumlu',
    aciklama: 'O-ring zincir, ön ve arka dişli. Montaj ve zincir ayarı servisimizde yapılır.' },
  { kategori: 'yedek_parca', gorsel: [], yer: ['Ön Fren Balatası', 'EBC FA197'], fiyat: 850, marka: 'EBC',
    baslik: 'EBC FA197 Ön Fren Balatası',
    aciklama: 'Organik karışım, sessiz ve disk dostu. Honda ve Yamaha 125–250 cc modellerle uyumludur.' },
  { kategori: 'yedek_parca', gorsel: [], yer: ['Motor Yağı', 'Motul 7100 10W-40'], fiyat: 890, marka: 'Motul',
    baslik: 'Motul 7100 10W-40 Tam Sentetik – 1 Litre',
    aciklama: 'Ester katkılı tam sentetik 4T motor yağı. Yağ değişimi servisimizde 15 dakikada yapılır.' },
  { kategori: 'yedek_parca', gorsel: [], yer: ['Akü', 'Yuasa YTX9-BS'], fiyat: 2600, marka: 'Yuasa',
    baslik: 'Yuasa YTX9-BS Akü – 12V 8Ah',
    aciklama: 'Bakımsız, kuru tip akü. Eski akünüzü getirin, montajı ücretsiz yapalım.' },
];

// [anahtar, ad, marka, alış, satış, hedef mevcut stok]
const YEDEK_STOK = [
  ['yag5100', 'Motul 5100 10W-40 Yarı Sentetik 1L', 'Motul', 420, 620, 34],
  ['yag7100', 'Motul 7100 10W-40 Tam Sentetik 1L', 'Motul', 610, 890, 22],
  ['filtre204', 'Yağ Filtresi HF204', 'Hiflo', 180, 320, 18],
  ['filtre303', 'Yağ Filtresi HF303', 'Hiflo', 170, 300, 15],
  ['havafiltre', 'Hava Filtresi (PCX / NMAX)', 'Hiflo', 260, 450, 12],
  ['bujiCR8E', 'Buji NGK CR8E', 'NGK', 140, 260, 26],
  ['bujiCPR8', 'Buji NGK CPR8EA-9', 'NGK', 160, 290, 24],
  ['balataOn', 'Ön Fren Balatası EBC FA197', 'EBC', 480, 850, 9],
  ['balataArka', 'Arka Fren Balatası EBC FA174', 'EBC', 420, 760, 11],
  ['zincir520', 'Zincir Dişli Seti DID 520', 'DID', 2900, 4600, 1],
  ['zincir428', 'Zincir Dişli Seti RK 428 (125 cc)', 'RK', 1250, 2100, 5],
  ['kayisPcx', 'Varyatör Kayışı (PCX 125)', 'Bando', 780, 1350, 6],
  ['kayisNmax', 'Varyatör Kayışı (NMAX 155)', 'Bando', 820, 1400, 4],
  ['bilya', 'Varyatör Bilyası Seti', 'Malossi', 240, 480, 8],
  ['aku9', 'Akü YTX9-BS', 'Yuasa', 1650, 2600, 0],
  ['aku7', 'Akü YTX7A-BS', 'Yuasa', 1350, 2150, 3],
  ['lastikOn', 'Ön Lastik Michelin Pilot Street 110/70-17', 'Michelin', 2600, 3900, 4],
  ['lastikArka', 'Arka Lastik Michelin Pilot Street 140/70-17', 'Michelin', 3300, 4900, 3],
  ['lastikScooter', 'Scooter Lastik Michelin City Grip 2 110/70-13', 'Michelin', 2100, 3200, 5],
  ['hidrolik', 'Fren Hidroliği DOT4 500 ml', 'Motul', 240, 420, 10],
  ['antifriz', 'Antifriz Motocool Expert 1L', 'Motul', 310, 520, 9],
  ['debriyajTel', 'Debriyaj Teli', 'Venhill', 190, 380, 7],
  ['debriyajBalata', 'Debriyaj Balatası Seti', 'EBC', 1100, 1900, 2],
  ['sinyal', 'LED Sinyal Lambası (çift)', 'Oxford', 260, 520, 12],
  ['ampul', 'Far Ampulü H4', 'Philips', 230, 450, 14],
  ['zincirYagi', 'Zincir Yağı Motul C2 400 ml', 'Motul', 330, 560, 17],
  ['amortisorYagi', 'Amortisör Yağı 10W 1L', 'Motul', 380, 640, 6],
];

// [ad, marka, kategori, beden, renk, alış, satış, hedef mevcut stok]
const AKSESUAR_STOK = [
  ['LS2 FF800 Storm II Kask - M', 'LS2', 'Ekipman', 'M', 'Mat Siyah', 4200, 6400, 3],
  ['LS2 FF800 Storm II Kask - L', 'LS2', 'Ekipman', 'L', 'Mat Siyah', 4200, 6400, 4],
  ['LS2 FF800 Storm II Kask - XL', 'LS2', 'Ekipman', 'XL', 'Mat Siyah', 4200, 6400, 0],
  ['MT Thunder 4 SV Kask - M', 'MT', 'Ekipman', 'M', 'Beyaz', 2900, 4500, 2],
  ['MT Thunder 4 SV Kask - L', 'MT', 'Ekipman', 'L', 'Beyaz', 2900, 4500, 5],
  ['Scoyco MC29 Eldiven - M', 'Scoyco', 'Ekipman', 'M', 'Siyah-Sarı', 650, 1150, 6],
  ['Scoyco MC29 Eldiven - L', 'Scoyco', 'Ekipman', 'L', 'Siyah-Sarı', 650, 1150, 8],
  ['Scoyco MC29 Eldiven - XL', 'Scoyco', 'Ekipman', 'XL', 'Siyah-Sarı', 650, 1150, 4],
  ['Scoyco JK37 Korumalı Mont - L', 'Scoyco', 'Ekipman', 'L', 'Siyah', 3100, 4900, 2],
  ['Scoyco JK37 Korumalı Mont - XL', 'Scoyco', 'Ekipman', 'XL', 'Siyah', 3100, 4900, 3],
  ['Forte GT Yağmurluk Takım - L', 'Forte', 'Ekipman', 'L', 'Neon Sarı', 700, 1250, 7],
  ['Forte GT Yağmurluk Takım - XL', 'Forte', 'Ekipman', 'XL', 'Neon Sarı', 700, 1250, 5],
  ['Dizlik Dirseklik Koruma Seti', 'Scoyco', 'Ekipman', null, 'Siyah', 600, 1100, 9],
  ['Kask İçi Bone', 'Forte', 'Ekipman', null, 'Siyah', 120, 250, 22],
  ['SHAD SH33 Arka Çanta', 'SHAD', 'Aksesuar', null, 'Siyah', 2600, 3950, 4],
  ['Givi B32 Bold Arka Çanta', 'Givi', 'Aksesuar', null, 'Siyah', 3400, 5200, 2],
  ['Şarjlı Telefon Tutucu', 'Kaynar', 'Aksesuar', null, null, 520, 950, 14],
  ['Alarmlı Disk Kilidi', 'Oxford', 'Aksesuar', null, 'Sarı', 480, 890, 10],
  ['Motosiklet Brandası - L', 'Oxford', 'Aksesuar', 'L', 'Gri', 420, 780, 8],
  ['USB Şarj Soketi (çift çıkış)', 'Kaynar', 'Aksesuar', null, null, 180, 380, 18],
  ['Domino Elcik Seti', 'Domino', 'Aksesuar', null, 'Siyah-Kırmızı', 340, 620, 11],
  ['Bar End Ayna Seti', 'Rizoma', 'Aksesuar', null, 'Siyah', 380, 720, 6],
  ['Koruma Demiri - Honda PCX 125', 'MTR', 'Demir', null, 'Siyah', 1500, 2400, 5],
  ['Koruma Demiri - Yamaha NMAX 155', 'MTR', 'Demir', null, 'Siyah', 1550, 2450, 4],
  ['Koruma Demiri - Yamaha MT-25', 'MTR', 'Demir', null, 'Siyah', 1900, 2950, 2],
  ['Arka Çanta Demiri - Honda PCX 125', 'MTR', 'Demir', null, 'Siyah', 900, 1500, 6],
  ['Karbon Desen Tank Ped', 'Kaynar', 'Tank Ped', null, 'Karbon', 110, 250, 25],
  ['Yan Tank Ped Seti', 'Kaynar', 'Tank Ped', null, 'Siyah', 220, 420, 13],
  ['Jant Şeridi Seti - Kırmızı', 'Kaynar', 'Sticker', null, 'Kırmızı', 90, 200, 30],
  ['Jant Şeridi Seti - Mavi', 'Kaynar', 'Sticker', null, 'Mavi', 90, 200, 0],
  ['Reflektif Sticker Seti', 'Kaynar', 'Sticker', null, 'Beyaz', 70, 160, 19],
  ['Katlanır Fren Debriyaj Maneti Seti', 'Rizoma', 'Yedek Parça', null, 'Siyah', 520, 950, 7],
  ['Akan LED Sinyal Seti', 'Oxford', 'Yedek Parça', null, null, 380, 700, 9],
];

// Servis işi şablonları. parcalar: [stok anahtarı, adet]; iscilik: [ad, ücret]
// tip: bu iş hangi araca uygun ('scooter' | 'zincirli' | 'hepsi')
const SERVIS_SABLONLARI = [
  { tip: 'scooter', sikayet: 'Periyodik bakım zamanı geldi.', not: 'Periyodik bakım yapıldı; yağ, filtre ve buji değişti.',
    parcalar: [['yag5100', 1], ['havafiltre', 1], ['bujiCPR8', 1]], iscilik: ['İşçilik – Periyodik bakım', 900] },
  { tip: 'zincirli', sikayet: 'Periyodik bakım, yağ değişimi istiyor.', not: 'Yağ, yağ filtresi ve bujiler değişti. Zincir ayarı yapıldı.',
    parcalar: [['yag7100', 3], ['filtre204', 1], ['bujiCR8E', 2]], iscilik: ['İşçilik – Periyodik bakım', 1500] },
  { tip: 'hepsi', sikayet: 'Ön frende ses var, fren boşluğu arttı.', not: 'Ön balatalar ve fren hidroliği değişti, sistem havası alındı.',
    parcalar: [['balataOn', 1], ['hidrolik', 1]], iscilik: ['İşçilik – Fren bakımı', 600] },
  { tip: 'zincirli', sikayet: 'Zincirden ses geliyor, dişliler aşınmış.', not: 'Zincir dişli seti değişti, zincir yağlandı.',
    parcalar: [['zincir428', 1], ['zincirYagi', 1]], iscilik: ['İşçilik – Zincir dişli değişimi', 900] },
  { tip: 'scooter', sikayet: 'Kalkışta titreme ve çekiş kaybı var.', not: 'Varyatör kayışı ve bilyalar değişti, varyatör temizlendi.',
    parcalar: [['kayisPcx', 1], ['bilya', 1]], iscilik: ['İşçilik – Varyatör bakımı', 800] },
  { tip: 'hepsi', sikayet: 'Sabahları marş basmıyor.', not: 'Akü ölçüldü, ömrünü tamamlamış. Yeni akü takıldı, şarj sistemi kontrol edildi.',
    parcalar: [['aku7', 1]], iscilik: ['İşçilik – Akü değişimi ve şarj kontrolü', 250] },
  { tip: 'zincirli', sikayet: 'Lastikler bitmiş, ikisi de değişecek.', not: 'Ön ve arka lastik değişti, balans yapıldı.',
    parcalar: [['lastikOn', 1], ['lastikArka', 1]], iscilik: ['İşçilik – Lastik değişimi ve balans', 500] },
  { tip: 'scooter', sikayet: 'Arka lastik patlak, ön lastik de eskimiş.', not: 'İki lastik değişti, sibop ve balans yenilendi.',
    parcalar: [['lastikScooter', 2]], iscilik: ['İşçilik – Lastik değişimi ve balans', 400] },
  { tip: 'hepsi', sikayet: 'Sol sinyal yanmıyor, far zayıf.', not: 'Sinyaller LED ile değişti, far ampulü yenilendi, tesisat kontrol edildi.',
    parcalar: [['sinyal', 1], ['ampul', 1]], iscilik: ['İşçilik – Elektrik arıza tespiti', 450] },
  { tip: 'zincirli', sikayet: 'Debriyaj kaçırıyor, vites geçişleri sert.', not: 'Debriyaj balataları ve teli değişti, yağ yenilendi.',
    parcalar: [['debriyajBalata', 1], ['debriyajTel', 1], ['yag7100', 3]], iscilik: ['İşçilik – Debriyaj revizyonu', 1400] },
  { tip: 'hepsi', sikayet: 'Satın almadan önce genel kontrol istiyor.', not: 'Ekspertiz yapıldı: şasi düzgün, motor kuru, kompresyon normal.',
    parcalar: [], iscilik: ['Ekspertiz ve genel kontrol', 750] },
  { tip: 'zincirli', sikayet: 'Ön amortisörden yağ sızıyor.', not: 'Ön amortisör keçeleri ve yağı değişti.',
    parcalar: [['amortisorYagi', 1]], iscilik: ['İşçilik – Ön amortisör revizyonu (keçe dahil)', 1800] },
  { tip: 'hepsi', sikayet: 'Hararet yapıyor, fan geç devreye giriyor.', not: 'Soğutma sıvısı değişti, termostat ve fan müşürü kontrol edildi.',
    parcalar: [['antifriz', 2]], iscilik: ['İşçilik – Soğutma sistemi bakımı', 550] },
  { tip: 'hepsi', sikayet: 'Arka fren tutmuyor.', not: 'Arka balatalar değişti, disk yüzeyi temizlendi.',
    parcalar: [['balataArka', 1]], iscilik: ['İşçilik – Arka fren bakımı', 400] },
];

// Servise gelen araçlar: [müşteri sırası, marka, model, tip, ilk km]
const SERVIS_ARACLARI = [
  [0, 'Honda', 'PCX 125', 'scooter', 14200], [1, 'Yamaha', 'MT-07', 'zincirli', 21800], [2, 'Yamaha', 'NMAX 155', 'scooter', 9400],
  [3, 'CFMOTO', '250SR', 'zincirli', 6300], [4, 'Honda', 'Activa 125', 'scooter', 31500], [5, 'Kawasaki', 'Z900', 'zincirli', 12700],
  [6, 'Yamaha', 'YZF-R25', 'zincirli', 28900], [7, 'Mondial', 'Drift L 125', 'scooter', 17600], [8, 'Bajaj', 'Dominar 400', 'zincirli', 24400],
  [9, 'Honda', 'Forza 250', 'scooter', 19300], [10, 'KTM', '390 Duke', 'zincirli', 15800], [11, 'Kuba', 'Çita 180R', 'zincirli', 11200],
  [12, 'Vespa', 'Primavera 150', 'scooter', 5600], [13, 'Honda', 'CB650R', 'zincirli', 16400], [14, 'SYM', 'Jet 14 125', 'scooter', 22700],
  [15, 'TVS', 'Apache RTR 200', 'zincirli', 34100], [16, 'Yamaha', 'XMAX 250', 'scooter', 18200], [17, 'Suzuki', 'V-Strom 650', 'zincirli', 41300],
  [18, 'RKS', 'Bitter 50', 'scooter', 8800], [19, 'Honda', 'CRF250L', 'zincirli', 20500],
];

const DEMO_KULLANICILAR = [
  { kullanici_adi: 'servis', ad_soyad: 'Emre Yıldız', rol: 'personel', yetkiler: ['servis_yetkisi', 'yedek_parca_yetkisi'] },
  { kullanici_adi: 'usta', ad_soyad: 'Kadir Özkan', rol: 'personel', yetkiler: ['servis_yetkisi'] },
  { kullanici_adi: 'satis', ad_soyad: 'Burak Aydın', rol: 'personel',
    yetkiler: ['motor_satis_yetkisi', 'motor_vitrin_yetkisi', 'liste_fiyati_gor', 'musteri_gor', 'satis_gecmisi_gor'] },
  { kullanici_adi: 'satis2', ad_soyad: 'Kaan Tekin', rol: 'personel',
    yetkiler: ['motor_satis_yetkisi', 'liste_fiyati_gor', 'musteri_gor', 'satis_gecmisi_gor'] },
  { kullanici_adi: 'aksesuar', ad_soyad: 'Elif Kara', rol: 'personel',
    yetkiler: ['aksesuar_yetkisi', 'aksesuar_stok_yetkisi', 'eticaret_yetkisi', 'aksesuar_vitrin_yetkisi'] },
  { kullanici_adi: 'yatirimci1', ad_soyad: 'Hakan Demirtaş', rol: 'yatirimci', yetkiler: [] },
  { kullanici_adi: 'yatirimci2', ad_soyad: 'Selin Arslan', rol: 'yatirimci', yetkiler: [] },
  { kullanici_adi: 'yeni.personel', ad_soyad: 'Onur Çelik', rol: 'personel', yetkiler: [], onay: 'beklemede' },
];
const YETKI_ALANLARI = ['aksesuar_yetkisi', 'motor_satis_yetkisi', 'eticaret_yetkisi', 'servis_yetkisi',
  'aksesuar_stok_yetkisi', 'yedek_parca_yetkisi', 'motor_vitrin_yetkisi', 'aksesuar_vitrin_yetkisi',
  'liste_fiyati_gor', 'alis_fiyati_gor', 'satis_fiyati_gor', 'kar_gor', 'musteri_gor', 'satis_gecmisi_gor'];

// Boşaltılacak tablolar. kullanicilar ve vitrin_segmentler bilerek listede YOK.
const BOSALTILACAK = ['parcalar', 'is_emirleri', 'aksesuar_parcalar', 'aksesuarlar', 'eticaret_satislar',
  'eticaret_platformlar', 'aksesuar_stok', 'yedek_parcalar', 'yedek_parca_stok', 'satis_belgeleri',
  'vitrin_gorseller', 'vitrin_videolar', 'vitrin_urunleri', 'vitrin_kategori_iletisim',
  'ikinci_el_motorlar', 'servis_qr_tokenler', 'musteriler', 'aktivite_log'];

// ---------------------------------------------------------------------------
// Yükleme
// ---------------------------------------------------------------------------
const seed = async (client) => {
  const ekle = async (tablo, kayit) => {
    const alanlar = Object.keys(kayit);
    const r = await client.query(
      `INSERT INTO ${tablo} (${alanlar.join(', ')}) VALUES (${alanlar.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
      alanlar.map((a) => kayit[a])
    );
    return r.rows[0].id;
  };
  const loglar = [];
  const logla = (kullanici, tip, detay, tablo, hedefId, tarih) => loglar.push({ kullanici, tip, detay, tablo, hedefId, tarih });

  // --- Temizlik ---
  await client.query(`TRUNCATE TABLE ${BOSALTILACAK.join(', ')} RESTART IDENTITY CASCADE`);
  await client.query('ALTER SEQUENCE vitrin_ilan_no_seq RESTART WITH 1');

  // --- Kullanıcılar ---
  const sifreHash = await bcrypt.hash(DEMO_SIFRE, 10);
  let adminOlusturuldu = false;
  const adminVar = await client.query("SELECT id FROM kullanicilar WHERE kullanici_adi = 'admin'");
  if (adminVar.rows.length === 0) {
    const adminSifre = process.env.ADMIN_INITIAL_PASSWORD || DEMO_SIFRE;
    await client.query(
      `INSERT INTO kullanicilar (kullanici_adi, sifre, plain_sifre, ad_soyad, rol, onay_durumu)
       VALUES ('admin', $1, $2, 'Admin', 'admin', 'onaylandi')`,
      [await bcrypt.hash(adminSifre, 10), adminSifre]
    );
    adminOlusturuldu = true;
  }
  const kullanicilar = {}; // kullanici_adi → { id, ad_soyad, kullanici_adi }
  for (const k of DEMO_KULLANICILAR) {
    const yetkiDegerleri = YETKI_ALANLARI.map((y) => k.yetkiler.includes(y));
    const r = await client.query(
      `INSERT INTO kullanicilar (kullanici_adi, sifre, plain_sifre, ad_soyad, rol, onay_durumu, ${YETKI_ALANLARI.join(', ')})
       VALUES ($1, $2, $3, $4, $5, $6, ${YETKI_ALANLARI.map((_, i) => `$${i + 7}`).join(', ')})
       ON CONFLICT (kullanici_adi) DO UPDATE SET
         sifre = EXCLUDED.sifre, plain_sifre = EXCLUDED.plain_sifre, ad_soyad = EXCLUDED.ad_soyad,
         rol = EXCLUDED.rol, onay_durumu = EXCLUDED.onay_durumu,
         ${YETKI_ALANLARI.map((y) => `${y} = EXCLUDED.${y}`).join(', ')}
       RETURNING id`,
      [k.kullanici_adi, sifreHash, DEMO_SIFRE, k.ad_soyad, k.rol, k.onay || 'onaylandi', ...yetkiDegerleri]
    );
    kullanicilar[k.kullanici_adi] = { id: r.rows[0].id, ad_soyad: k.ad_soyad, kullanici_adi: k.kullanici_adi };
  }
  const admin = (await client.query("SELECT id, kullanici_adi, ad_soyad FROM kullanicilar WHERE kullanici_adi = 'admin'")).rows[0];
  kullanicilar.admin = admin;

  // --- Müşteriler ---
  const musteriler = musteriUret();
  for (let i = 0; i < musteriler.length; i++) {
    const m = musteriler[i];
    const kayitTarihi = gunOnce(300 - i * 6, 9 + (i % 8), (i * 7) % 60);
    m.id = await ekle('musteriler', { ad_soyad: m.ad_soyad, adres: m.adres, telefon: m.telefon, created_at: kayitTarihi, updated_at: kayitTarihi });
  }
  const musteri = (i) => musteriler[((i % musteriler.length) + musteriler.length) % musteriler.length];

  // --- Stoklar (çıkan miktarlar satışlar yüklendikten sonra hesaplanır) ---
  const yedekStok = {}; // anahtar → { id, kod, ad, alis, satis, cikan }
  for (let i = 0; i < YEDEK_STOK.length; i++) {
    const [anahtar, ad, marka, alis, satis, mevcut] = YEDEK_STOK[i];
    const kod = `9${String(i + 1).padStart(12, '0')}`;
    const id = await ekle('yedek_parca_stok', {
      stok_kodu: kod, stok_adi: ad, marka, giren_miktar: mevcut, cikan_miktar: 0, mevcut,
      alis_fiyati: alis, satis_fiyati: satis, envanter_degeri: mevcut * satis, created_at: gunOnce(200), updated_at: gunOnce(200),
    });
    yedekStok[anahtar] = { id, kod, ad, alis, satis, cikan: 0 };
  }
  const aksesuarStok = []; // { id, ad, alis, satis, cikan }
  for (let i = 0; i < AKSESUAR_STOK.length; i++) {
    const [ad, marka, kategori, beden, renk, alis, satis, mevcut] = AKSESUAR_STOK[i];
    const id = await ekle('aksesuar_stok', {
      stok_kodu: String(i + 1).padStart(13, '0'), stok_adi: ad, marka, kategori, beden, renk,
      giren_miktar: mevcut, cikan_miktar: 0, mevcut, alis_fiyati: alis, satis_fiyati: satis,
      envanter_degeri: mevcut * satis, created_at: gunOnce(200), updated_at: gunOnce(200),
    });
    aksesuarStok.push({ id, ad, alis, satis, cikan: 0 });
  }

  // --- İş emirleri (servis) ---
  const araclar = SERVIS_ARACLARI.map(([mIdx, marka, model, tip, km], i) => ({ musteri: musteri(mIdx), marka, model, tip, km, plaka: plakaUret(i) }));
  const IS_EMRI_SAYISI = 46;
  const VERESIYE_FISLER = [12, 23, 31, 36];
  const teknisyenler = [kullanicilar.servis, kullanicilar.usta];
  let servisVeresiye = 0;
  for (let j = 0; j < IS_EMRI_SAYISI; j++) {
    // İlk üç araç tekrar tekrar gelir → QR ile açılan servis geçmişi sayfası dolu görünür
    const arac = j % 4 === 0 ? araclar[(j / 4) % 3] : araclar[3 + ((j * 7) % (araclar.length - 3))];
    const uygun = SERVIS_SABLONLARI.filter((s) => s.tip === 'hepsi' || s.tip === arac.tip);
    const sablon = uygun[j % uygun.length];
    arac.km += aralik(700, 2600);

    const acilisGun = Math.round((((IS_EMRI_SAYISI - 1 - j) / (IS_EMRI_SAYISI - 1)) ** 1.35) * 118);
    const acilis = gunOnce(acilisGun, 9 + (j % 8), (j * 13) % 60);
    const durum = j >= IS_EMRI_SAYISI - 2 ? 'beklemede' : j >= IS_EMRI_SAYISI - 6 ? 'devam_ediyor' : 'tamamlandi';
    // Son tamamlananların bir kısmı bugün/dün kapanır → günlük rapor boş kalmaz
    const kapanisGun = j >= IS_EMRI_SAYISI - 9 ? (j % 2) : Math.max(acilisGun - aralik(0, 2), 0);
    const kapanis = durum === 'tamamlandi' ? gunOnce(kapanisGun, 17, (j * 11) % 60) : null;

    const kalemler = sablon.parcalar.map(([anahtar, adet]) => {
      const s = yedekStok[anahtar];
      s.cikan += adet; // uygulama, iş emri hangi durumda olursa olsun parçayı stoktan düşer
      return { parca_kodu: s.kod, takilan_parca: s.ad, adet, birim_fiyat: s.satis, maliyet: s.alis };
    });
    kalemler.push({ parca_kodu: '', takilan_parca: sablon.iscilik[0], adet: 1, birim_fiyat: sablon.iscilik[1], maliyet: 0 });
    const toplam = kalemler.reduce((t, k) => t + k.adet * k.birim_fiyat, 0);
    const maliyet = kalemler.reduce((t, k) => t + k.adet * k.maliyet, 0);

    const borclu = durum === 'tamamlandi' && VERESIYE_FISLER.includes(j);
    const kalan = borclu ? yuvarla(toplam * 0.5, 50) : 0;
    if (borclu) servisVeresiye++;
    const odeme = durum !== 'tamamlandi' ? null
      : borclu ? `${tl(toplam - kalan)} ₺ nakit alındı, kalan ${tl(kalan)} ₺ ay sonunda ödenecek.`
        : ['Nakit', 'Kredi kartı (tek çekim)', 'Havale/EFT', 'Nakit', 'Kredi kartı (3 taksit)'][j % 5];
    const teknisyen = teknisyenler[j % 3 === 0 ? 1 : 0];

    const id = await ekle('is_emirleri', {
      fis_no: j + 1, musteri_id: arac.musteri.id, musteri_ad_soyad: arac.musteri.ad_soyad,
      adres: arac.musteri.adres, telefon: arac.musteri.telefon, km: arac.km, model_tip: arac.model, marka: arac.marka,
      plaka: arac.plaka, ariza_sikayetler: sablon.sikayet, aciklama: durum === 'tamamlandi' ? sablon.not : durum === 'devam_ediyor' ? 'İşlem sürüyor, parçalar hazırlandı.' : null,
      tahmini_teslim_tarihi: tarihStr(durum === 'tamamlandi' ? kapanis : gunOnce(-2 + (j % 2))),
      tahmini_toplam_ucret: yuvarla(toplam, 50), gercek_toplam_ucret: toplam, toplam_maliyet: maliyet, kar: toplam - maliyet,
      durum, musteri_imza: durum === 'tamamlandi', kalan_odeme: kalan, odeme_detaylari: odeme,
      teslim_alan_ad_soyad: durum === 'tamamlandi' ? arac.musteri.ad_soyad : null,
      teslim_eden_teknisyen: teknisyen.ad_soyad, teslim_tarihi: kapanis ? tarihStr(kapanis) : null,
      olusturan_kullanici_id: teknisyen.id, olusturan_kisi: teknisyen.ad_soyad,
      tamamlama_tarihi: kapanis, created_at: acilis, updated_at: kapanis || acilis,
    });
    for (const k of kalemler) {
      await ekle('parcalar', { is_emri_id: id, ...k, toplam_fiyat: k.adet * k.birim_fiyat, created_at: acilis });
    }
    logla(teknisyen, 'IS_EMRI_OLUSTUR', `Fiş No: ${j + 1} - ${arac.musteri.ad_soyad}`, 'is_emirleri', id, acilis);
    if (kapanis) logla(teknisyen, 'IS_EMRI_GUNCELLE', `İş emri #${id} güncellendi`, 'is_emirleri', id, kapanis);
  }
  // Müşteriye açık servis geçmişi (QR) bağlantıları — uygulamadaki gibi normalize plaka ile
  const qrLinkleri = [];
  for (const arac of araclar.slice(0, 3)) {
    const token = Array.from({ length: 16 }, () => Math.floor(rnd() * 16).toString(16)).join('');
    await ekle('servis_qr_tokenler', { plaka: arac.plaka.toUpperCase().replace(/[^A-Z0-9]/g, ''), token });
    qrLinkleri.push(`${FRONTEND}/s/${token}  (${arac.plaka} – ${arac.marka} ${arac.model})`);
  }

  // --- Yedek parça satışları (tezgâh satışı) ---
  const yedekAnahtarlar = Object.keys(yedekStok);
  const YEDEK_SATIS_SAYISI = 22;
  for (let i = 0; i < YEDEK_SATIS_SAYISI; i++) {
    const s = yedekStok[yedekAnahtarlar[(i * 5 + 1) % yedekAnahtarlar.length]];
    const adet = s.satis < 700 ? aralik(1, 3) : 1;
    s.cikan += adet;
    const toplam = s.satis * adet;
    const m = i % 3 === 2 ? null : musteri(20 + i);
    const tarih = gunOnce(Math.round(i * 3.4), 10 + (i % 7), (i * 17) % 60);
    const id = await ekle('yedek_parcalar', {
      urun_adi: s.ad, alis_fiyati: s.alis * adet, satis_fiyati: toplam, adet, stok_id: s.id,
      musteri_adi: m ? m.ad_soyad : null, musteri_telefon: m ? m.telefon : null,
      kalan_odeme: (i === 4 || i === 13) && m ? yuvarla(toplam * 0.5, 50) : 0, created_at: tarih, updated_at: tarih,
    });
    logla(kullanicilar.servis, 'YEDEK_PARCA_OLUSTUR', `Yedek parça satışı: ${s.ad}`, 'yedek_parcalar', id, tarih);
  }

  // --- Aksesuar satışları ---
  const AKSESUAR_SATIS_SAYISI = 32;
  for (let i = 0; i < AKSESUAR_SATIS_SAYISI; i++) {
    const kalemSayisi = 1 + (i % 3);
    const kalemler = [];
    for (let k = 0; k < kalemSayisi; k++) {
      const s = aksesuarStok[(i * 7 + k * 11 + 2) % aksesuarStok.length];
      if (kalemler.some((x) => x.stok === s)) continue;
      kalemler.push({ stok: s, adet: s.satis < 300 ? aralik(1, 2) : 1 });
    }
    const brut = kalemler.reduce((t, k) => t + k.adet * k.stok.satis, 0);
    const maliyet = kalemler.reduce((t, k) => t + k.adet * k.stok.alis, 0);
    const indirim = i % 6 === 2 ? Math.min(sec([50, 100, 150, 200]), brut) : 0;
    const toplam = brut - indirim;
    const durum = [1, 2, 4].includes(i) ? 'beklemede' : 'tamamlandi'; // i = 0 bugünün tamamlanmış satışıdır
    const gun = Math.round(i * 2.9);
    const tarih = gunOnce(gun, 11 + (i % 7), (i * 19) % 60);
    const m = i % 4 === 3 ? null : musteri(8 + i * 3);
    const borclu = durum === 'tamamlandi' && [6, 14, 22].includes(i) && m;
    const kalan = borclu ? yuvarla(toplam * 0.4, 50) : 0;
    const id = await ekle('aksesuarlar', {
      ad_soyad: m ? m.ad_soyad : 'Perakende Müşteri', telefon: m ? m.telefon : null,
      odeme_sekli: ['Nakit', 'Kredi Kartı', 'Havale/EFT', 'Kredi Kartı'][i % 4],
      aciklama: durum === 'beklemede' ? 'Ürün ayrıldı, müşteri hafta içi teslim alacak.' : null,
      durum, kalan_odeme: kalan, indirim,
      odeme_detaylari: borclu ? `${tl(toplam - kalan)} ₺ ödendi, kalan ${tl(kalan)} ₺ maaş günü ödenecek.` : null,
      satis_tarihi: tarihStr(tarih), toplam_maliyet: maliyet, toplam_satis: toplam, kar: toplam - maliyet,
      tamamlama_tarihi: durum === 'tamamlandi' ? tarih : null, olusturan_kisi: kullanicilar.aksesuar.ad_soyad,
      created_at: tarih, updated_at: tarih,
    });
    for (const k of kalemler) {
      await ekle('aksesuar_parcalar', { aksesuar_id: id, urun_adi: k.stok.ad, adet: k.adet, maliyet: k.stok.alis, satis_fiyati: k.stok.satis, created_at: tarih });
      if (durum === 'tamamlandi') k.stok.cikan += k.adet; // uygulama stoğu yalnızca tamamlanan satışta düşer
    }
    logla(kullanicilar.aksesuar, 'AKSESUAR_OLUSTUR', `Aksesuar satışı: ${kalemler.map((k) => k.stok.ad).join(', ')}`, 'aksesuarlar', id, tarih);
  }

  // --- E-ticaret ---
  const platformlar = [];
  for (const [ad, komisyon, kargo] of [['Trendyol', 21, 85], ['Hepsiburada', 18, 90], ['N11', 14, 80], ['Shopier', 5, 75]]) {
    const id = await ekle('eticaret_platformlar', { platform_adi: ad, komisyon_orani: komisyon, kdv_orani: 20, kargo_ucreti: kargo });
    platformlar.push({ id, ad, komisyon, kargo });
  }
  const ETICARET_SATIS_SAYISI = 30;
  for (let i = 0; i < ETICARET_SATIS_SAYISI; i++) {
    const s = aksesuarStok[(i * 5 + 3) % aksesuarStok.length];
    const p = platformlar[[0, 0, 1, 0, 2, 1, 3][i % 7]]; // satışların çoğu Trendyol'dan
    const adet = s.satis < 500 ? aralik(1, 2) : 1;
    const satis = yuvarla(s.satis * 1.12, 10); // pazaryeri fiyatı mağaza fiyatından biraz yüksek
    const hesap = hesaplaKomisyon(satis, s.alis, p.komisyon, 20, p.kargo, adet, detectPlatform(p.ad));
    const tarih = gunOnce(i * 2, 12 + (i % 6), (i * 23) % 60);
    s.cikan += adet;
    const id = await ekle('eticaret_satislar', {
      stok_id: s.id, platform_id: p.id, urun_adi: s.ad, alis_fiyati: s.alis, satis_fiyati: satis,
      komisyon_orani: p.komisyon, komisyon_tutari: hesap.komisyonTutari, kdv_orani: 20, kargo_ucreti: p.kargo,
      kar: hesap.netKar, adet, tarih: tarihStr(tarih), durum: 'tamamlandi', created_at: tarih, updated_at: tarih,
    });
    logla(kullanicilar.aksesuar, 'ETICARET_SATIS_OLUSTUR', `E-ticaret satışı: ${s.ad} (${p.ad})`, 'eticaret_satislar', id, tarih);
  }

  // Stok hareketlerini satışlarla tutarlı hâle getir: giren = mevcut + çıkan
  for (const s of Object.values(yedekStok)) {
    await client.query('UPDATE yedek_parca_stok SET cikan_miktar = $1, giren_miktar = mevcut + $1 WHERE id = $2', [s.cikan, s.id]);
  }
  for (const s of aksesuarStok) {
    await client.query('UPDATE aksesuar_stok SET cikan_miktar = $1, giren_miktar = mevcut + $1 WHERE id = $2', [s.cikan, s.id]);
  }

  // --- Motorlar ---
  const motorEkle = async (m) => {
    const id = await ekle('ikinci_el_motorlar', {
      stok_tipi: 'sahip', odeme_sekli: 'nakit', masraflar: 0, satis_fiyati: 0, noter_satis: 0, kalan_odeme: 0,
      komisyoncu_tutari: 0, yatirimci_kar: 0, yatirimci_kar_orani: 0, fatura_kesildi: false, eski_kayit: false,
      ...m,
      kar: (m.satis_fiyati || 0) - (m.alis_fiyati || 0) - (m.masraflar || 0) - (m.komisyoncu_tutari || 0),
    });
    logla(kullanicilar.satis, 'MOTOR_SATIS_OLUSTUR', `2. El Motor: ${m.plaka} - ${m.marka} ${m.model}`, 'ikinci_el_motorlar', id, m.created_at);
    return id;
  };
  const sayac = { stokta: 0, konsinye: 0, kapora: 0, depo_serviste: 0, devir_bekliyor: 0, perte: 0, tamamlandi: 0 };
  let motorVeresiye = 0;
  let plakaSira = 100;

  // 1) Vitrindeki stok motorları
  const vitrinMotorIdleri = [];
  for (let i = 0; i < VITRIN_MOTORLAR.length; i++) {
    const v = VITRIN_MOTORLAR[i];
    const alisGun = 6 + i * 4;
    const alis = yuvarla(v.fiyat * (v.sifir ? 0.91 : 0.86), 1000);
    const satici = v.sifir ? null : musteri(30 + i);
    const notlar = v.sifir ? SIFIR_NOTLAR : IKINCI_EL_NOTLAR;
    v.aciklamaTam = `${v.ozet}\n\n${notlar}\n\nKaynar Motor güvencesiyle.`;
    const id = await motorEkle({
      tarih: tarihStr(gunOnce(alisGun)), plaka: v.sifir ? 'PLAKASIZ' : plakaUret(plakaSira++), marka: v.marka, model: v.model,
      yil: v.yil, km: v.km, alis_fiyati: alis, noter_alis: v.sifir ? 0 : yuvarla(alis * 0.7, 5000),
      masraflar: v.sifir ? 0 : sec([0, 1500, 2500, 4000]), liste_fiyati: v.fiyat, durum: 'stokta',
      satici_adi: v.sifir ? `${v.marka} Türkiye Distribütörü` : satici.ad_soyad, satici_tc: v.sifir ? null : satici.tc,
      aciklama: v.sifir ? 'Sıfır araç, distribütör faturalı.' : 'Ekspertizi yapıldı, vitrine alındı.',
      yatirimci_id: v.yatirimci ? kullanicilar[v.yatirimci].id : null, yatirimci_kar_orani: v.yatirimci ? 50 : 0,
      vitrin_baslik: v.baslik, vitrin_aciklama: v.aciklamaTam, vitrin_segment: v.segment, vitrin_cc: v.cc, vitrin_hasar: v.hasar || null,
      created_at: gunOnce(alisGun, 11, i * 3), updated_at: gunOnce(alisGun, 11, i * 3),
    });
    vitrinMotorIdleri.push(id);
    sayac.stokta++;
  }

  // 2) Diğer motorlar: satılanlar ve farklı durumlardaki stok
  const PLAN = [
    ...Array(34).fill('tamamlandi'), ...Array(5).fill('konsinye'), ...Array(3).fill('kapora'),
    ...Array(2).fill('depo_serviste'), ...Array(4).fill('devir_bekliyor'), ...Array(3).fill('perte'),
  ];
  const sonSatilanlar = []; // satış belgesi ve arşiv ilanı örnekleri için
  for (let i = 0; i < PLAN.length; i++) {
    const tur = PLAN[i];
    const [marka, model, cc, segment, sifirFiyat] = MODELLER[(i * 5 + 2) % MODELLER.length];
    const yil = 2016 + ((i * 3) % 9);
    const liste = ikinciElFiyat(sifirFiyat, yil);
    const km = (2026 - yil) * aralik(3500, 8500);
    const satici = musteri(i * 2 + 1);
    const alici = musteri(i * 2 + 14);
    const temel = { plaka: plakaUret(plakaSira++), marka, model, yil, km, satici_adi: satici.ad_soyad, satici_tc: satici.tc, liste_fiyati: liste };
    sayac[tur]++;

    if (tur === 'tamamlandi') {
      const s = i; // 0 = en yeni satış
      const satisGun = s < 2 ? s : Math.round(s * 8.6) + aralik(0, 4);
      const alisGun = satisGun + aralik(8, 70);
      const konsinye = s % 6 === 4;
      const satis = yuvarla(liste * (0.96 + rnd() * 0.05), 1000);
      const alis = konsinye ? yuvarla(satis * 0.93, 1000) : yuvarla(liste * (0.83 + rnd() * 0.07), 1000);
      const masraf = konsinye ? 0 : sec([0, 0, 1500, 2500, 3500, 5000, 7500]);
      const komisyon = s % 9 === 3 ? sec([3000, 4000, 5000, 7500]) : 0;
      const kar = satis - alis - masraf - komisyon;
      const yatirimci = s % 4 === 1 ? 'yatirimci1' : s % 7 === 2 ? 'yatirimci2' : null;
      const oran = yatirimci === 'yatirimci1' ? 50 : 40;
      const borclu = [2, 9, 17].includes(s);
      const kalan = borclu ? yuvarla(satis * 0.15, 1000) : 0;
      if (borclu) motorVeresiye++;
      const odenen = satis - kalan;
      const [odemeSekli, odemeler] = borclu
        ? ['taksit', [{ tip: 'Nakit', tutar: yuvarla(odenen * 0.6, 1000) }, { tip: 'Kart', tutar: odenen - yuvarla(odenen * 0.6, 1000) }]]
        : [
          ['nakit', [{ tip: 'Nakit', tutar: satis }]],
          ['havale', [{ tip: 'Havale/EFT', tutar: satis }]],
          ['kredi_karti', [{ tip: 'Nakit', tutar: yuvarla(satis * 0.4, 1000) }, { tip: 'Kart', tutar: satis - yuvarla(satis * 0.4, 1000) }]],
          ['kredi_karti', [{ tip: 'Kart', tutar: satis }]],
          ['havale', [{ tip: 'Nakit', tutar: yuvarla(satis * 0.5, 1000) }, { tip: 'Havale/EFT', tutar: satis - yuvarla(satis * 0.5, 1000) }]],
        ][s % 5];
      const komisyoncu = komisyon ? musteri(40 + s) : null;
      const satisZamani = gunOnce(satisGun, 10 + (s % 8), (s * 7) % 60);
      const id = await motorEkle({
        ...temel, tarih: tarihStr(gunOnce(alisGun)), stok_tipi: konsinye ? 'konsinye' : 'sahip', durum: 'tamamlandi',
        alis_fiyati: alis, noter_alis: yuvarla(alis * 0.7, 5000), satis_fiyati: satis, noter_satis: yuvarla(satis * 0.7, 5000), masraflar: masraf,
        alici_adi: alici.ad_soyad, alici_tc: alici.tc, alici_telefon: alici.telefon, alici_adres: alici.adres,
        odeme_sekli: odemeSekli, odeme_detaylari: JSON.stringify(odemeler), kalan_odeme: kalan,
        satis_tarihi: tarihStr(satisZamani), tamamlama_tarihi: satisZamani,
        fatura_kesildi: s % 3 !== 0, yevmiye_no: String(10000 + ((s * 457) % 89999)),
        komisyoncu_adi: komisyoncu ? komisyoncu.ad_soyad : null, komisyoncu_telefon: komisyoncu ? komisyoncu.telefon : null, komisyoncu_tutari: komisyon,
        yatirimci_id: yatirimci ? kullanicilar[yatirimci].id : null, yatirimci_kar_orani: yatirimci ? oran : 0,
        yatirimci_kar: yatirimci ? yuvarla(Math.max(kar, 0) * oran / 100, 500) : 0,
        aciklama: borclu ? `Kalan ${tl(kalan)} ₺ iki taksitte ödenecek.` : ['Takasla alınmıştı, bakımı yapılıp satıldı.', null, 'İkinci anahtarı ve kitapçığı teslim edildi.', null][s % 4],
        vitrin_segment: segment, vitrin_cc: cc,
        created_at: gunOnce(alisGun, 11, (s * 5) % 60), updated_at: satisZamani,
      });
      logla(kullanicilar.satis, 'MOTOR_SATIS_GUNCELLE', `2. El Motor #${id} güncellendi`, 'ikinci_el_motorlar', id, satisZamani);
      if (s < 4) sonSatilanlar.push({ id, marka, model, yil, km, cc, segment, plaka: temel.plaka, satis, alici: alici.ad_soyad, satisZamani });
      continue;
    }

    const alisGun = aralik(4, 55);
    const alis = yuvarla(liste * (0.84 + rnd() * 0.06), 1000);
    const ortak = {
      ...temel, tarih: tarihStr(gunOnce(alisGun)), alis_fiyati: alis, noter_alis: yuvarla(alis * 0.7, 5000),
      vitrin_segment: segment, vitrin_cc: cc, created_at: gunOnce(alisGun, 12, (i * 9) % 60), updated_at: gunOnce(alisGun, 12, (i * 9) % 60),
    };
    if (tur === 'konsinye') {
      await motorEkle({ ...ortak, stok_tipi: 'konsinye', durum: 'stokta', alis_fiyati: yuvarla(liste * 0.92, 1000), noter_alis: 0,
        aciklama: `Konsinye: sahibi ${tl(yuvarla(liste * 0.92, 1000))} ₺ istiyor, satılınca ödenecek.` });
    } else if (tur === 'kapora') {
      const kapora = sec([5000, 10000, 15000]);
      await motorEkle({ ...ortak, durum: 'kapora', satis_fiyati: liste, alici_adi: alici.ad_soyad, alici_telefon: alici.telefon,
        odeme_detaylari: JSON.stringify([{ tip: 'Nakit', tutar: kapora }]),
        aciklama: `${tl(kapora)} ₺ kapora alındı. Kalan tutar noter günü ödenecek.` });
    } else if (tur === 'depo_serviste') {
      await motorEkle({ ...ortak, durum: 'depo_serviste', masraflar: sec([2500, 4000]),
        aciklama: 'Serviste: zincir dişli seti ve ön balatalar değişiyor, sonra vitrine alınacak.' });
    } else if (tur === 'devir_bekliyor') {
      const satisGun = aralik(1, 9);
      await motorEkle({ ...ortak, durum: 'devir_bekliyor', satis_fiyati: liste, noter_satis: yuvarla(liste * 0.7, 5000),
        alici_adi: alici.ad_soyad, alici_tc: alici.tc, alici_telefon: alici.telefon, alici_adres: alici.adres,
        odeme_sekli: 'havale', odeme_detaylari: JSON.stringify([{ tip: 'Havale/EFT', tutar: liste }]),
        satis_tarihi: tarihStr(gunOnce(satisGun)), aciklama: 'Ödeme alındı, noter devri için randevu bekleniyor.' });
    } else {
      const pertAlis = yuvarla(liste * 0.35, 1000);
      await motorEkle({ ...ortak, durum: 'perte', alis_fiyati: pertAlis, noter_alis: yuvarla(pertAlis * 0.7, 5000), liste_fiyati: 0,
        aciklama: ['Pert kayıtlı; parça amaçlı alındı.', 'Ağır hasarlı (ön çatal, şasi). Parçalanacak.', 'Motor kilitli, onarım maliyeti değerini aşıyor.'][i % 3] });
    }
  }

  // Satış belgesi örnekleri (son satılan motorlara)
  for (const m of sonSatilanlar.slice(0, 3)) {
    const pdf = ornekPdf([
      'KAYNAR MOTOR - SATIS SOZLESMESI (ORNEK)', '',
      `Arac: ${m.marka} ${m.model} (${m.yil})`, `Plaka: ${m.plaka}`, `Alici: ${m.alici}`,
      `Satis tutari: ${tl(m.satis)} TL`, `Tarih: ${tarihStr(m.satisZamani)}`, '',
      'Bu belge yerel gelistirme icin uretilmis ornek veridir.',
    ]);
    await ekle('satis_belgeleri', {
      motor_id: m.id, dosya_adi: `satis-sozlesmesi-${m.plaka.replace(/\s+/g, '')}.pdf`, mime: 'application/pdf',
      boyut: pdf.length, icerik: pdf, yukleyen_id: kullanicilar.satis.id, yukleyen_adi: kullanicilar.satis.kullanici_adi, created_at: m.satisZamani,
    });
  }

  // --- Vitrin (site ilanları) ---
  const ilanEkle = async (ilan, gorseller, tarih) => {
    const id = await ekle('vitrin_urunleri', { ...ilan, created_at: tarih, updated_at: tarih });
    let kapak = null;
    for (let g = 0; g < gorseller.length; g++) {
      const gid = await ekle('vitrin_gorseller', { urun_id: id, data: gorseller[g], sira: g, created_at: tarih });
      if (kapak === null) kapak = gid;
    }
    await client.query('UPDATE vitrin_urunleri SET kapak_gorsel_id = $1 WHERE id = $2', [kapak, id]);
    return id;
  };
  let gorselSayisi = 0;
  for (let i = 0; i < VITRIN_MOTORLAR.length; i++) {
    const v = VITRIN_MOTORLAR[i];
    const gorseller = ilanGorselleri(v.gorsel, `${v.marka} ${v.model}`, `${v.yil} • ${v.cc} cc • ${v.segment}`);
    gorselSayisi += gorseller.length;
    await ilanEkle({
      kategori: 'motor', baslik: v.baslik, aciklama: v.aciklamaTam, fiyat: v.fiyat, marka: v.marka, model: v.model, yil: v.yil,
      segment: v.segment, motor_cc: v.cc, km: v.km, motor_durumu: v.sifir ? 'sifir' : 'ikinci_el', hasar_kaydi: v.hasar || null,
      yayinda: true, siralama: i, one_cikan: !!v.one, stok_motor_id: vitrinMotorIdleri[i],
    }, gorseller, gunOnce(5 + i * 4, 14, i * 3));
  }
  // Satılan motorların ilanı uygulamada otomatik yayından kalkar → arşiv örnekleri
  for (let i = 0; i < Math.min(2, sonSatilanlar.length); i++) {
    const m = sonSatilanlar[i];
    gorselSayisi++;
    await ilanEkle({
      kategori: 'motor', baslik: `${m.marka} ${m.model} ${m.yil} – ${tl(m.km)} km`, fiyat: m.satis, marka: m.marka, model: m.model, yil: m.yil,
      aciklama: `Bakımlı ${m.marka} ${m.model}.\n\n${IKINCI_EL_NOTLAR}`, segment: m.segment, motor_cc: m.cc, km: m.km,
      motor_durumu: 'ikinci_el', yayinda: false, siralama: VITRIN_MOTORLAR.length + i, one_cikan: false, stok_motor_id: m.id,
    }, [yerTutucu(`${m.marka} ${m.model}`, `${m.yil} • satıldı`)], gunOnce(40 + i * 9, 15));
  }
  const kategoriSira = {};
  for (let i = 0; i < VITRIN_DIGER.length; i++) {
    const v = VITRIN_DIGER[i];
    const gorseller = ilanGorselleri(v.gorsel, v.yer[0], v.yer[1]);
    gorselSayisi += gorseller.length;
    kategoriSira[v.kategori] = (kategoriSira[v.kategori] ?? -1) + 1;
    await ilanEkle({
      kategori: v.kategori, baslik: v.baslik, aciklama: v.aciklama, fiyat: v.fiyat, marka: v.marka,
      yayinda: true, siralama: kategoriSira[v.kategori], one_cikan: i === 0,
    }, gorseller, gunOnce(3 + i * 5, 15, i * 4));
  }
  const iletisim = [
    // Motor satışında iki satış personeli gösterilir (ikinci kişi isteğe bağlıdır)
    ['motor', kullanicilar.satis.ad_soyad, sahteTelefon(901), null, null, null, kullanicilar.satis2.ad_soyad, sahteTelefon(907)],
    ['aksesuar', kullanicilar.aksesuar.ad_soyad, sahteTelefon(902), null, null, null],
    ['yedek_parca', kullanicilar.servis.ad_soyad, sahteTelefon(903), null, null, null],
    ['bakim_servis', kullanicilar.usta.ad_soyad, sahteTelefon(904), 'Bakım ve servis randevusu',
      'Periyodik bakım, fren, zincir dişli, lastik ve elektrik arızaları.\nAynı gün teslim için sabah 10:00\'a kadar randevu alın.',
      yerTutucu('Bakım ve Servis', 'Tüm marka ve modeller')],
    ['nakliye', kullanicilar.satis.ad_soyad, sahteTelefon(905), 'Kapıdan kapıya motosiklet nakliyesi',
      'Sigortalı ve kapalı kasa araçlarla Mersin içi aynı gün, şehirler arası 2 iş günü içinde teslim.',
      gorselOku('nakliye') || yerTutucu('Motosiklet Nakliyesi', 'Sigortalı taşıma')],
    ['sigorta', kullanicilar.satis.ad_soyad, sahteTelefon(906), 'Trafik sigortası ve kasko',
      'Motosikletinize özel trafik sigortası ve kasko tekliflerini aynı gün içinde hazırlıyoruz.',
      yerTutucu('Sigorta ve Kasko', 'Aynı gün teklif')],
  ];
  for (const [kategori, personel, telefon, baslik, aciklama, gorsel, personel2 = null, telefon2 = null] of iletisim) {
    await client.query(
      `INSERT INTO vitrin_kategori_iletisim (kategori, personel_adi, telefon, baslik, aciklama, gorsel, personel_adi_2, telefon_2)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [kategori, personel, telefon, baslik, aciklama, gorsel, personel2, telefon2]
    );
  }

  // --- Aktivite logu ---
  for (let gun = 0; gun < 12; gun++) {
    for (const k of [admin, kullanicilar.servis, kullanicilar.usta, kullanicilar.satis, kullanicilar.aksesuar]) {
      if ((gun + k.id) % 4 === 0) continue; // herkes her gün girmez
      logla(k, 'LOGIN', 'Giriş yapıldı', null, null, gunOnce(gun, 8, 40 + ((gun + k.id) % 20)));
    }
  }
  loglar.sort((a, b) => a.tarih - b.tarih);
  for (const l of loglar) {
    await ekle('aktivite_log', {
      kullanici_id: l.kullanici.id, kullanici_adi: l.kullanici.kullanici_adi, islem_tipi: l.tip, islem_detay: l.detay,
      hedef_tablo: l.tablo, hedef_id: l.hedefId, ip_adresi: '127.0.0.1', created_at: l.tarih,
    });
  }

  return { adminOlusturuldu, sayac, motorVeresiye, servisVeresiye, gorselSayisi, qrLinkleri };
};

const main = async () => {
  const client = await pool.connect();
  try {
    // İkinci kilit: gerçekten bağlanılan sunucu bu makine mi? (şemaya dokunmadan ÖNCE)
    const hedef = (await client.query('SELECT current_database() AS db, inet_server_addr()::text AS adres')).rows[0];
    if (hedef.adres && !['127.0.0.1', '::1'].includes(hedef.adres.split('/')[0])) {
      throw new Error(`Bağlanılan sunucu yerel değil (${hedef.adres}). Hiçbir veri değiştirilmedi.`);
    }
    // Şema hazır olsun (boş veritabanında da çalışabilmek için)
    await initializeDatabase();
    console.log(`\nHedef: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${hedef.db} (yerel)`);
    console.log('Örnek veri yükleniyor...');

    await client.query('BEGIN');
    const sonuc = await seed(client);
    await client.query('COMMIT');

    const say = async (tablo) => (await client.query(`SELECT COUNT(*)::int AS n FROM ${tablo}`)).rows[0].n;
    console.log('\nYÜKLENDİ');
    console.log(`  Müşteri            : ${await say('musteriler')}`);
    console.log(`  İş emri            : ${await say('is_emirleri')}  (${await say('parcalar')} kalem)`);
    console.log(`  Motor              : ${await say('ikinci_el_motorlar')}  (satılan ${sonuc.sayac.tamamlandi}, stokta ${sonuc.sayac.stokta}, konsinye ${sonuc.sayac.konsinye}, kapora ${sonuc.sayac.kapora}, devir bekleyen ${sonuc.sayac.devir_bekliyor}, serviste ${sonuc.sayac.depo_serviste}, pert ${sonuc.sayac.perte})`);
    console.log(`  Aksesuar           : ${await say('aksesuar_stok')} stok kalemi, ${await say('aksesuarlar')} satış`);
    console.log(`  Yedek parça        : ${await say('yedek_parca_stok')} stok kalemi, ${await say('yedek_parcalar')} satış`);
    console.log(`  E-ticaret          : ${await say('eticaret_platformlar')} platform, ${await say('eticaret_satislar')} satış`);
    console.log(`  Vitrin             : ${await say('vitrin_urunleri')} ilan, ${sonuc.gorselSayisi} görsel`);
    console.log(`  Veresiye (borçlu)  : ${sonuc.motorVeresiye} motor, ${sonuc.servisVeresiye} servis + aksesuar ve yedek parça`);
    console.log(`  Aktivite logu      : ${await say('aktivite_log')}`);
    if (eksikGorsel > 0) {
      console.log(`\n  Not: ${eksikGorsel} ilanın fotoğrafı bulunamadı, yer tutucu kullanıldı.`);
      console.log('       Fotoğrafları indirmek için: npm run seed:gorseller  → sonra tekrar npm run seed');
    }
    console.log(`\nDEMO HESAPLARI (şifre: ${DEMO_SIFRE})`);
    DEMO_KULLANICILAR.forEach((k) => console.log(`  ${k.kullanici_adi.padEnd(14)} ${k.ad_soyad.padEnd(16)} ${k.rol}${k.onay ? ' — onay bekliyor (giriş yapamaz)' : ''}`));
    console.log(sonuc.adminOlusturuldu
      ? `  admin          yeni oluşturuldu, şifre: ${process.env.ADMIN_INITIAL_PASSWORD ? '(ADMIN_INITIAL_PASSWORD)' : DEMO_SIFRE}`
      : '  admin          mevcut hesabınız ve şifreniz değişmedi');
    console.log('\nMÜŞTERİ SERVİS GEÇMİŞİ (QR) ÖRNEKLERİ');
    sonuc.qrLinkleri.forEach((l) => console.log(`  ${l}`));
    console.log('');
  } catch (hata) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\nÖrnek veri yüklenemedi, veritabanı eski hâlinde bırakıldı:', hata.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((hata) => {
  console.error('Beklenmeyen hata:', hata.message);
  process.exit(1);
});
