const { pool } = require('../config/db');

// NOT: Tek seferlik veri aktarim script'idir. Asagidaki kayitlar tamamen
// ornek (sahte) verilerdir; gercek musteri bilgisi icermez.
const pertMotorlar = [
  { plaka: '34AA0200', marka: '', model: 'BEAT', yil: 2006, km: 90000, alis_fiyati: 5000, noter_alis: 20000, satici_adi: 'ORNEK SATICI 21', satici_tc: '10000000021', tarih: '2025-11-24' },
  { plaka: '34AA0047', marka: '', model: 'VN50 PRO', yil: 2023, km: null, alis_fiyati: null, noter_alis: 40000, satici_adi: 'ORNEK SATICI 22', satici_tc: '10000000022', tarih: '2025-06-11' },
  { plaka: '34AA0024', marka: '', model: 'XRS', yil: 2021, km: 15000, alis_fiyati: null, noter_alis: 50000, satici_adi: 'ORNEK SATICI 23', satici_tc: '10000000023', tarih: '2025-04-18' },
  { plaka: '34AA0038', marka: 'O', model: '250NK', yil: 2022, km: 10000, alis_fiyati: null, noter_alis: 100000, satici_adi: 'ORNEK SATICI 24', satici_tc: '10000000024', tarih: '2025-09-18' },
  { plaka: '34AA0142', marka: '', model: '', yil: null, km: null, alis_fiyati: null, noter_alis: 20000, satici_adi: 'ORNEK SATICI 25', satici_tc: '10000000025', tarih: '2024-09-10' },
  { plaka: '34AA0153', marka: '', model: '', yil: null, km: null, alis_fiyati: null, noter_alis: null, satici_adi: 'ORNEK SATICI 26', satici_tc: '', tarih: '2025-04-24' },
  { plaka: '34AA0012', marka: 'O', model: '250SR', yil: 2022, km: 24000, alis_fiyati: null, noter_alis: 35000, satici_adi: 'ORNEK SATICI 27', satici_tc: '10000000027', tarih: '2025-11-26' },
  { plaka: '34AA0136', marka: 'O', model: '450SR', yil: 2024, km: 14000, alis_fiyati: null, noter_alis: 200000, satici_adi: 'ORNEK SATICI 28', satici_tc: '10000000028', tarih: '2026-03-26' },
];

async function main() {
  for (const m of pertMotorlar) {
    // Check if plaka already exists
    const existing = await pool.query('SELECT id, durum FROM ikinci_el_motorlar WHERE plaka = $1', [m.plaka]);
    if (existing.rows.length > 0) {
      console.log(`MEVCUT: ${m.plaka} (durum: ${existing.rows[0].durum}) - güncelleniyor perte olarak`);
      await pool.query(
        'UPDATE ikinci_el_motorlar SET durum = $1 WHERE plaka = $2',
        ['perte', m.plaka]
      );
    } else {
      await pool.query(
        `INSERT INTO ikinci_el_motorlar (plaka, marka, model, yil, km, alis_fiyati, noter_alis, satici_adi, satici_tc, tarih, durum, stok_tipi)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'perte','sahip')`,
        [m.plaka, m.marka, m.model, m.yil, m.km, m.alis_fiyati, m.noter_alis, m.satici_adi, m.satici_tc, m.tarih]
      );
      console.log(`EKLENDİ: ${m.plaka} - ${m.model || '(model yok)'} - ${m.satici_adi}`);
    }
  }

  const result = await pool.query("SELECT COUNT(*) FROM ikinci_el_motorlar WHERE durum = 'perte'");
  console.log(`\nToplam perte motor: ${result.rows[0].count}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
