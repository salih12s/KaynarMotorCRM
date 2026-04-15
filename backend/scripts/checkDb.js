const { pool } = require('../config/db');

(async () => {
  // Delete tamamlandi duplicates where the same plaka already has a non-tamamlandi record
  const r = await pool.query(
    "DELETE FROM ikinci_el_motorlar WHERE durum='tamamlandi' AND plaka IN (SELECT plaka FROM ikinci_el_motorlar WHERE durum != 'tamamlandi' AND plaka IS NOT NULL AND plaka != '')"
  );
  console.log('Silinen duplike tamamlandi:', r.rowCount);
  
  const c = await pool.query('SELECT durum, COUNT(*) as c FROM ikinci_el_motorlar GROUP BY durum ORDER BY durum');
  console.log('Güncel durum:');
  c.rows.forEach(x => console.log(' ', x.durum, ':', x.c));
  
  const t = await pool.query('SELECT COUNT(*) as total FROM ikinci_el_motorlar');
  console.log('TOTAL:', t.rows[0].total);
  process.exit(0);
})();
