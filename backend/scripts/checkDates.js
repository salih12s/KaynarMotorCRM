require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config();
const { pool } = require('../config/db');

(async () => {
  try {
    const r = await pool.query(
      "SELECT id, plaka, marka, model, tamamlama_tarihi, tarih, alici_adi, eski_kayit FROM ikinci_el_motorlar WHERE durum = 'tamamlandi' ORDER BY tamamlama_tarihi DESC NULLS LAST LIMIT 20"
    );
    console.log('Son 20 satilan motor (tarih sıralı):');
    r.rows.forEach(row => {
      const tamTarih = row.tamamlama_tarihi ? new Date(row.tamamlama_tarihi).toLocaleDateString('tr-TR') : 'NULL';
      console.log(
        'id:', row.id,
        '| plaka:', row.plaka,
        '| satim_tarihi:', tamTarih,
        '| alici:', row.alici_adi,
        '| eski:', row.eski_kayit
      );
    });

    const noDate = await pool.query("SELECT COUNT(*) as cnt FROM ikinci_el_motorlar WHERE durum = 'tamamlandi' AND tamamlama_tarihi IS NULL");
    console.log('\ntamamlama_tarihi NULL olan:', noDate.rows[0].cnt);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
