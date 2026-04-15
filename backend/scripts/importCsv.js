const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// Turkish number parser: "31,000₺" → 31000, "6,005" → 6005
function parseTurkishNumber(val) {
  if (!val || val === '0₺' || val === '0') return 0;
  const cleaned = val.replace(/₺/g, '').replace(/\./g, '').replace(/,/g, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

// Parse Turkish date: "30.03.2026" → "2026-03-30", "04/07/2025" → "2025-07-04"
function parseTurkishDate(val) {
  if (!val || val.trim() === '') return null;
  val = val.trim();
  let parts;
  if (val.includes('.')) {
    parts = val.split('.');
  } else if (val.includes('/')) {
    parts = val.split('/');
  } else {
    return null;
  }
  if (parts.length !== 3) return null;
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
  if (parseInt(year) < 2000 || parseInt(year) > 2030) return null;
  if (parseInt(month) < 1 || parseInt(month) > 12) return null;
  if (parseInt(day) < 1 || parseInt(day) > 31) return null;
  return `${year}-${month}-${day}`;
}

// Parse CSV line respecting quoted fields
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

async function importCsv() {
  const csvPath = path.join(__dirname, '..', '..', 'Motorsiklet alım satım.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV dosyası bulunamadı:', csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');
  
  console.log(`Toplam satır: ${lines.length}`);

  // Skip header rows (0 and 1)
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') { skipped++; continue; }

    const cols = parseCsvLine(line);
    
    const plaka = (cols[0] || '').trim().toUpperCase();
    const marka = (cols[1] || '').trim();
    const model = (cols[2] || '').trim();

    // Skip rows with no meaningful data
    if (!plaka && !marka && !model) { skipped++; continue; }

    const yil = parseInt(cols[3]) || null;
    const km = parseTurkishNumber(cols[4]);
    const alim = parseTurkishNumber(cols[5]); // Actual cost
    const satim = parseTurkishNumber(cols[6]); // Actual sell price
    const netKar = parseTurkishNumber(cols[7]);

    // ALIM group (seller info)
    const saticiAdi = (cols[9] || '').trim() || null;
    const saticiTc = (cols[10] || '').trim() || null;
    const alisTarihi = parseTurkishDate(cols[11]);
    const alisBedeli = parseTurkishNumber(cols[12]); // Noter purchase price

    // SATIM group (buyer info)
    const aliciAdi = (cols[13] || '').trim() || null;
    const aliciTc = (cols[14] || '').trim() || null;
    const satisTarihi = parseTurkishDate(cols[15]);
    const satisBedeli = parseTurkishNumber(cols[16]); // Noter sale price

    const yevmiyeNo = (cols[17] || '').trim() || null;
    const faturaVal = (cols[18] || '').trim();
    const faturaKesildi = faturaVal === '1₺' || faturaVal === '1' || faturaVal.toLowerCase() === 'evet';

    // Tüm kayıtlar stok olarak eklenir
    let durum = 'stokta';
    let stokTipi = 'sahip';
    
    // If alim is 0 and we have seller info, might be konsinye
    if (alim === 0 && saticiAdi) {
      stokTipi = 'konsinye';
    }

    // Calculate kar
    const kar = satim > 0 ? satim - alim : (netKar || 0);

    const tamamlamaTarihi = null;

    try {
      await pool.query(
        `INSERT INTO ikinci_el_motorlar 
          (plaka, marka, model, yil, km, alis_fiyati, satis_fiyati, noter_alis, noter_satis, masraflar, kar,
           satici_adi, satici_tc, alici_adi, alici_tc, tarih, tamamlama_tarihi,
           durum, stok_tipi, yevmiye_no, fatura_kesildi, kalan_odeme, odeme_sekli, aciklama)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
        [
          plaka || null, marka || null, model || null, yil, km,
          alim, satim, alisBedeli, satisBedeli, 0, kar,
          saticiAdi, saticiTc, aliciAdi, aliciTc,
          alisTarihi || new Date(), tamamlamaTarihi,
          durum, stokTipi, yevmiyeNo, faturaKesildi, 0, 'nakit', null
        ]
      );
      imported++;
      if (imported % 20 === 0) console.log(`${imported} kayıt eklendi...`);
    } catch (err) {
      errors++;
      console.error(`Satır ${i + 1} hatası (${plaka}):`, err.message);
    }
  }

  console.log(`\nImport tamamlandı:`);
  console.log(`  Eklenen: ${imported}`);
  console.log(`  Atlanan: ${skipped}`);
  console.log(`  Hata: ${errors}`);
  
  process.exit(0);
}

importCsv().catch(err => {
  console.error('Import hatası:', err);
  process.exit(1);
});
