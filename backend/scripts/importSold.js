const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

function parseTurkishNumber(val) {
  if (!val || val === '0₺' || val === '0') return 0;
  const cleaned = val.replace(/₺/g, '').replace(/\./g, '').replace(/,/g, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function parseTurkishDate(val) {
  if (!val || val.trim() === '') return null;
  val = val.trim();
  let parts;
  if (val.includes('.')) parts = val.split('.');
  else if (val.includes('/')) parts = val.split('/');
  else return null;
  if (parts.length !== 3) return null;
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
  if (parseInt(year) < 2000 || parseInt(year) > 2030) return null;
  if (parseInt(month) < 1 || parseInt(month) > 12) return null;
  if (parseInt(day) < 1 || parseInt(day) > 31) return null;
  return `${year}-${month}-${day}`;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function importSold() {
  const csvPath = path.join(__dirname, '..', '..', 'Motorsiklet alım satım.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  // Get existing records from DB
  const existing = await pool.query('SELECT plaka, satici_adi, durum FROM ikinci_el_motorlar');
  const existingSet = new Set();
  existing.rows.forEach(r => {
    const key = (r.plaka || '').trim().toUpperCase() + '|' + (r.satici_adi || '').trim().toUpperCase();
    existingSet.add(key);
  });
  console.log('Mevcut DB kayıt:', existing.rows.length);

  let imported = 0, skipped = 0, errors = 0;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;

    const cols = parseCsvLine(line);
    const plaka = (cols[0] || '').trim().toUpperCase();
    const marka = (cols[1] || '').trim();
    const model = (cols[2] || '').trim();
    if (!plaka && !marka && !model) continue;

    // Check if already exists in DB
    const saticiAdi = (cols[9] || '').trim() || null;
    const key = (plaka || '') + '|' + (saticiAdi || '').toUpperCase();
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    const yil = parseInt(cols[3]) || null;
    const km = parseTurkishNumber(cols[4]);
    const alis_fiyati = parseTurkishNumber(cols[5]);
    const satis_fiyati = parseTurkishNumber(cols[6]);
    const netKar = parseTurkishNumber(cols[7]);
    const noter_alis = parseTurkishNumber(cols[12]);
    const aliciAdi = (cols[13] || '').trim() || null;
    const aliciTc = (cols[14] || '').trim() || null;
    const satisTarihi = parseTurkishDate(cols[15]);
    const noter_satis = parseTurkishNumber(cols[16]);
    const saticiTc = (cols[10] || '').trim() || null;
    const alisTarihi = parseTurkishDate(cols[11]);
    const yevmiyeNo = (cols[17] || '').trim() || null;
    const kar = netKar || (satis_fiyati > 0 ? satis_fiyati - alis_fiyati : 0);

    // All remaining records are SOLD (tamamlandi)
    const durum = 'tamamlandi';
    const stokTipi = alis_fiyati === 0 ? 'konsinye' : 'sahip';

    try {
      await pool.query(
        `INSERT INTO ikinci_el_motorlar 
          (plaka, marka, model, yil, km, alis_fiyati, satis_fiyati, noter_alis, noter_satis, masraflar, kar,
           satici_adi, satici_tc, alici_adi, alici_tc, tarih, tamamlama_tarihi,
           durum, stok_tipi, yevmiye_no, fatura_kesildi, kalan_odeme, odeme_sekli, aciklama)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
        [
          plaka || null, marka || null, model || null, yil, km,
          alis_fiyati, satis_fiyati, noter_alis, noter_satis, 0, kar,
          saticiAdi, saticiTc, aliciAdi, aliciTc,
          alisTarihi, satisTarihi,
          durum, stokTipi, yevmiyeNo, false, 0, 'nakit', null
        ]
      );
      imported++;
      console.log(`Eklendi: ${plaka || '(plaka yok)'} - ${marka} ${model} → ${aliciAdi || '-'}`);
    } catch (err) {
      errors++;
      console.error(`Hata (satır ${i + 1}, ${plaka}):`, err.message);
    }
  }

  console.log(`\nImport tamamlandı:`);
  console.log(`  Eklenen (tamamlandi): ${imported}`);
  console.log(`  Atlanan (zaten mevcut): ${skipped}`);
  console.log(`  Hata: ${errors}`);
  process.exit(0);
}

importSold().catch(err => {
  console.error('Import hatası:', err);
  process.exit(1);
});
