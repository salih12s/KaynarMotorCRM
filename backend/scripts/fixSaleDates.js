require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config();
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

(async () => {
  try {
    const csvPath = path.join(__dirname, '..', '..', 'Motorsiklet alım satım.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');

    // Build a map from CSV: plaka+aliciAdi -> satisTarihi
    const csvData = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim() === '') continue;
      const cols = parseCsvLine(line);
      const plaka = (cols[0] || '').trim().toUpperCase();
      if (!plaka) continue;
      
      const aliciAdi = (cols[13] || '').trim() || null;
      const satisTarihi = parseTurkishDate(cols[15]);
      
      csvData.push({ plaka, aliciAdi, satisTarihi, row: i + 1 });
    }

    // Get all sold motors from DB
    const dbResult = await pool.query(
      "SELECT id, plaka, alici_adi, tamamlama_tarihi FROM ikinci_el_motorlar WHERE durum = 'tamamlandi' ORDER BY id"
    );

    let updated = 0;
    let alreadyCorrect = 0;
    let noMatch = 0;
    let nullInCsv = 0;

    for (const dbRow of dbResult.rows) {
      const dbPlaka = (dbRow.plaka || '').trim().toUpperCase();
      const dbAlici = (dbRow.alici_adi || '').trim().toUpperCase();
      
      // Find matching CSV row
      const match = csvData.find(c => {
        const csvPlaka = c.plaka;
        const csvAlici = (c.aliciAdi || '').toUpperCase();
        return csvPlaka === dbPlaka && csvAlici === dbAlici;
      });

      if (!match) {
        // Try match by plaka only
        const plakaMatch = csvData.find(c => c.plaka === dbPlaka);
        if (!plakaMatch) {
          noMatch++;
          console.log(`Eşleşme yok: id=${dbRow.id} plaka=${dbPlaka} alici=${dbRow.alici_adi}`);
        } else {
          // Match by plaka but different alici
          if (plakaMatch.satisTarihi) {
            const dbDate = dbRow.tamamlama_tarihi ? new Date(dbRow.tamamlama_tarihi).toISOString().split('T')[0] : null;
            if (dbDate !== plakaMatch.satisTarihi) {
              await pool.query(
                'UPDATE ikinci_el_motorlar SET tamamlama_tarihi = $1 WHERE id = $2',
                [plakaMatch.satisTarihi + 'T00:00:00+03:00', dbRow.id]
              );
              updated++;
              console.log(`Güncellendi (plaka): id=${dbRow.id} ${dbPlaka} | ${dbDate} → ${plakaMatch.satisTarihi}`);
            } else {
              alreadyCorrect++;
            }
          } else {
            nullInCsv++;
            console.log(`CSV'de tarih yok: id=${dbRow.id} ${dbPlaka}`);
          }
        }
        continue;
      }

      if (!match.satisTarihi) {
        nullInCsv++;
        console.log(`CSV'de tarih yok: id=${dbRow.id} ${dbPlaka}`);
        continue;
      }

      // Compare dates
      const dbDate = dbRow.tamamlama_tarihi ? new Date(dbRow.tamamlama_tarihi).toISOString().split('T')[0] : null;
      
      if (dbDate !== match.satisTarihi) {
        await pool.query(
          'UPDATE ikinci_el_motorlar SET tamamlama_tarihi = $1 WHERE id = $2',
          [match.satisTarihi + 'T00:00:00+03:00', dbRow.id]
        );
        updated++;
        console.log(`Güncellendi: id=${dbRow.id} ${dbPlaka} | ${dbDate} → ${match.satisTarihi}`);
      } else {
        alreadyCorrect++;
      }
    }

    console.log(`\n--- Sonuç ---`);
    console.log(`Toplam satılan motor: ${dbResult.rows.length}`);
    console.log(`Güncellenen: ${updated}`);
    console.log(`Zaten doğru: ${alreadyCorrect}`);
    console.log(`CSV'de tarih yok: ${nullInCsv}`);
    console.log(`Eşleşme bulunamadı: ${noMatch}`);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
