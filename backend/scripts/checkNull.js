require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config();
const { pool } = require('../config/db');

(async () => {
  try {
    const r = await pool.query(
      "SELECT id, plaka, marka, model, alici_adi, tarih, created_at FROM ikinci_el_motorlar WHERE durum = 'tamamlandi' AND tamamlama_tarihi IS NULL"
    );
    console.log('tamamlama_tarihi NULL olan motorlar:');
    r.rows.forEach(row => {
      const tarih = row.tarih ? new Date(row.tarih).toLocaleDateString('tr-TR') : 'NULL';
      const created = row.created_at ? new Date(row.created_at).toLocaleDateString('tr-TR') : 'NULL';
      console.log(
        'id:', row.id,
        '| plaka:', row.plaka,
        '|', row.marka, row.model,
        '| alici:', row.alici_adi,
        '| tarih:', tarih,
        '| created:', created
      );
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
