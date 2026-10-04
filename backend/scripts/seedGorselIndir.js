/**
 * Örnek veri (seedLocal.js) için vitrin fotoğraflarını Wikimedia Commons'tan indirir.
 *
 *   npm run seed:gorseller        (backend klasöründe)
 *
 * Fotoğraflar backend/scripts/seed-gorseller/ altına iner; bu klasör .gitignore'dadır,
 * repoya girmez. Klasör boşsa seed yine çalışır, ilanlara yer tutucu görsel koyar.
 * Aşağıdaki fotoğrafların tamamı serbest lisanslıdır (CC BY-SA / CC0); yazar ve lisans
 * bilgisi her satırda belirtilmiştir. Veritabanına dokunmaz.
 */
const fs = require('fs');
const path = require('path');

const HEDEF = path.join(__dirname, 'seed-gorseller');
const UA = 'KaynarMotorLocalSeed/1.0 (yerel gelistirme ornek verisi)';
const GENISLIK = 960;

const GORSELLER = [
  { dosya: 'honda-pcx', baslik: 'File:HONDA PCX 160 China.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Dinkun Chen' },
  { dosya: 'yamaha-nmax', baslik: 'File:Yamaha NMAX 2025.jpg', lisans: 'CC BY-SA 4.0', yazar: 'AVMOTO' },
  { dosya: 'yamaha-mt07', baslik: 'File:2021 Black Yamaha MT-07.jpg', lisans: 'CC BY-SA 4.0', yazar: 'PackMecEng' },
  { dosya: 'yamaha-r25', baslik: 'File:2015 Yamaha YZF-R25.JPG', lisans: 'CC BY-SA 4.0', yazar: 'Rainmaker47' },
  { dosya: 'honda-cb650r', baslik: 'File:Honda CB650R Motorcycle 2021.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Captainmorlypogi1959' },
  { dosya: 'kawasaki-z900', baslik: 'File:KawasakiZ900.jpg', lisans: 'CC BY-SA 4.0', yazar: 'T.doi.z900' },
  { dosya: 'kawasaki-z900-2', baslik: 'File:Kawasaki Z900 FrontView.jpg', lisans: 'CC BY-SA 4.0', yazar: 'サフィル' },
  { dosya: 'ktm-390-duke', baslik: 'File:KTM 390 Duke 2017.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Slink21' },
  { dosya: 'honda-africa-twin', baslik: 'File:2025 Honda CRF1100L Africa Twin DCT.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Chanokchon' },
  { dosya: 'yamaha-xmax', baslik: 'File:Yamaha Xmax.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Corvettec6r' },
  { dosya: 'honda-rebel', baslik: 'File:Honda Rebel 500 (2BL-PC60) front.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Tokumeigakarinoaoshima' },
  { dosya: 'honda-rebel-2', baslik: 'File:Honda Rebel 500 (2BL-PC60) rear.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Tokumeigakarinoaoshima' },
  { dosya: 'vespa-primavera', baslik: 'File:08-2024 Vespa Primavera Alter-Markt Potsdam.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Wikisympathisant' },
  { dosya: 'honda-crf250l', baslik: 'File:Honda CRF250L.jpg', lisans: 'CC BY-SA 3.0', yazar: 'Takoyashi' },
  { dosya: 'honda-super-cub', baslik: 'File:Honda Super Cub C125 (2BJ-JA48) front.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Tokumeigakarinoaoshima' },
  { dosya: 'honda-super-cub-2', baslik: 'File:Honda Super Cub C125 (2BJ-JA48) rear.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Tokumeigakarinoaoshima' },
  { dosya: 'bajaj-dominar', baslik: 'File:Dominar 400 Naked cruiser.jpg', lisans: 'CC0', yazar: 'Cppfront' },
  { dosya: 'bajaj-dominar-2', baslik: 'File:Dominar 400.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Ganesh Mohan T' },
  { dosya: 'kask', baslik: 'File:SHOEI XR 1100 Symmetry TC-5.jpg', lisans: 'CC BY-SA 1.0', yazar: 'Malsa' },
  { dosya: 'eldiven', baslik: 'File:MotorcycleRacingGlove.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Thermos' },
  { dosya: 'top-case', baslik: 'File:Honda CBF1000 - topcase.jpg', lisans: 'CC BY-SA 4.0', yazar: 'Cjp24' },
  { dosya: 'nakliye', baslik: 'File:Open motorcycle trailer with motorcycle.jpg', lisans: 'CC BY-SA 3.0', yazar: 'Jeffrey M Dean' },
];

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  fs.mkdirSync(HEDEF, { recursive: true });
  const eksikler = GORSELLER.filter((g) => !fs.existsSync(path.join(HEDEF, `${g.dosya}.jpg`)));
  if (eksikler.length === 0) {
    console.log(`Tüm görseller zaten mevcut (${GORSELLER.length} dosya): ${HEDEF}`);
    return;
  }

  // Tek API çağrısıyla tüm başlıkların küçültülmüş (thumbnail) adreslerini al
  const api = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', titles: eksikler.map((g) => g.baslik).join('|'),
    prop: 'imageinfo', iiprop: 'url', iiurlwidth: String(GENISLIK), format: 'json',
  });
  const yanit = await fetch(api, { headers: { 'User-Agent': UA } });
  if (!yanit.ok) throw new Error(`Wikimedia API yanıt vermedi: ${yanit.status}`);
  const json = await yanit.json();
  // API başlıkları normalize edebilir (ör. alt çizgi → boşluk); eşleştirme bu tabloyla yapılır
  const normal = Object.fromEntries((json.query?.normalized || []).map((n) => [n.from, n.to]));
  const adresler = {};
  Object.values(json.query?.pages || {}).forEach((p) => { adresler[p.title] = p.imageinfo?.[0]?.thumburl; });

  let inen = 0;
  for (const g of eksikler) {
    const adres = adresler[normal[g.baslik] || g.baslik];
    if (!adres) { console.warn(`  bulunamadı: ${g.baslik}`); continue; }
    try {
      const r = await fetch(adres, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(String(r.status));
      fs.writeFileSync(path.join(HEDEF, `${g.dosya}.jpg`), Buffer.from(await r.arrayBuffer()));
      inen++;
      console.log(`  indirildi: ${g.dosya}.jpg  (${g.yazar}, ${g.lisans})`);
    } catch (e) {
      console.warn(`  indirilemedi: ${g.dosya} (${e.message})`);
    }
    await bekle(1500); // Wikimedia hız sınırına takılmamak için
  }
  console.log(`${inen}/${eksikler.length} görsel indirildi → ${HEDEF}`);
};

main().catch((e) => { console.error('Görsel indirme hatası:', e.message); process.exit(1); });
