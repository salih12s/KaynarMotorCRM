require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../config/db');

// plaka -> fatura_kesildi (true=1, false=0)
// Aynı plaka birden fazla varsa sırayla işlenir
const data = [
  ['34AA0057', false],
  ['34AA0094', false],
  ['34AA0004', false],
  ['34AA0088', false],
  ['34AA0157', false],
  ['34AA0135', false],
  ['34AA0106', false],
  ['34AA0122', false],
  ['34AA0043', false],
  ['34AA0102', false],
  ['34AA0098', false],
  ['34AA0016', false],
  ['34AA0082', false],
  ['34AA0075', false],
  ['34AA0070', false],
  ['34AA0074', false],
  ['34AA0151', false],
  ['34AA0167', false],
  ['34AA0091', false],
  ['34AA0063', false],
  ['34AA0160', false],
  ['34AA0017', false],
  ['34AA0013', false],
  ['34AA0123', false],
  ['34AA0156', false],
  ['34AA0085', false],
  ['34AA0104', false],
  ['34AA0028', false],
  ['34AA0032', false],
  ['34AA0086', false],
  ['34AA0065', false],
  ['34AA0041', false],
  ['34AA0121', false],
  ['34AA0101', false],
  ['34AA0103', false],
  ['34AA0158', false],
  ['34AA0096', false],
  ['34AA0018', true],
  ['34AA0025', true],
  ['34AA0045', true],
  ['34AA0150', true],
  ['34AA0051', true],
  ['34AA0062', true],
  ['34AA0154', true],
  ['34AA0111', true],
  ['34AA0114', true],
  ['34AA0040', true],
  ['34AA0069', true],
  ['34AA0105', true],
  ['34AA0030', true],
  ['34AA0010', true],
  ['34AA0090', true],
  ['34AA0157', true],
  ['34AA0109', true],
  ['34AA0107', true],
  ['34AA0164', true],
  ['34AA0134', true],
  ['34AA0162', true],
  ['34AA0115', true],
  ['34AA0064', true],
  ['34AA0116', true],
  ['34AA0095', true],
  ['34AA0145', true],
  ['34AA0092', true],
  ['34AA0125', true],
  ['34AA0133', true],
  ['34AA0080', true],
  ['34AA0131', true],
  ['34AA0066', true],
  ['34AA0108', true],
  ['34AA0117', true],
  ['34AA0104', true],
  ['34AA0163', true],
  ['34AA0071', true],
  ['34AA0059', true],
  ['34AA0034', true],
  ['34AA0110', true],
  ['34AA0056', true],
  ['34AA0146', true],
  ['34AA0087', true],
  ['34AA0050', true],
  ['34AA0007', true],
  ['34AA0067', true],
  ['34AA0143', true],
  ['34AA0169', true],
  ['34AA0072', true],
  ['34AA0097', true],
  ['34AA0120', true],
  ['34AA0083', true],
  ['34AA0035', true],
  ['34AA0128', true],
  ['34AA0001', true],
  ['34AA0055', true],
  ['34AA0049', true],
  ['34AA0006', true],
  ['34AA0003', true],
  ['34AA0008', true],
  ['34AA0130', true],
  ['34AA0118', true],
  ['34AA0033', true],
  ['34AA0161', true],
  ['34AA0060', true],
  ['34AA0005', true],
  ['34AA0009', true],
  ['34AA0149', true],
  ['34AA0037', true],
  ['34AA0022', true],
  ['34AA0152', true],
  ['34AA0148', true],
  ['34AA0084', true],
  ['34AA0039', true],
  ['34AA0054', true],
  ['34AA0023', true],
  ['34AA0147', true],
  ['34AA0021', true],
  ['34AA0168', true],
  ['34AA0119', true],
  ['34AA0014', true],
  ['34AA0080', true],
  ['34AA0132', true],
  ['34AA0061', true],
  ['34AA0076', true],
  ['34AA0027', true],
  ['34AA0113', true],
  ['34AA0102', true],
  ['34AA0002', true],
  ['34AA0058', true],
  ['34AA0029', true],
  ['34AA0144', true],
  ['34AA0073', true],
  ['34AA0081', true],
  ['34AA0020', true],
  ['34AA0015', true],
  ['34AA0141', true],
  ['34AA0139', true],
  ['34AA0159', true],
  ['34AA0155', true],
  ['34AA0068', true],
  ['34AA0137', true],
  ['34AA0044', true],
  ['34AA0140', false],
  ['34AA0047', false],
  ['34AA0024', false],
  ['34AA0038', false],
  ['34AA0142', false],
  ['34AA0153', false],
  ['34AA0012', false],
  ['34AA0136', false],
];

async function run() {
  const processedIds = [];
  let updated = 0;
  let notFound = 0;

  for (const [plaka, kesildi] of data) {
    let query, params;

    if (processedIds.length > 0) {
      // Daha önce güncellenen ID'leri hariç tut (aynı plaka tekrarlarında farklı kayıt yakala)
      query = `UPDATE ikinci_el_motorlar SET fatura_kesildi = $1 WHERE id = (
        SELECT id FROM ikinci_el_motorlar WHERE plaka = $2 AND durum = 'tamamlandi' AND id NOT IN (${processedIds.join(',')})
        ORDER BY created_at ASC LIMIT 1
      ) RETURNING id`;
      params = [kesildi, plaka];
    } else {
      query = `UPDATE ikinci_el_motorlar SET fatura_kesildi = $1 WHERE id = (
        SELECT id FROM ikinci_el_motorlar WHERE plaka = $2 AND durum = 'tamamlandi'
        ORDER BY created_at ASC LIMIT 1
      ) RETURNING id`;
      params = [kesildi, plaka];
    }

    const result = await pool.query(query, params);
    if (result.rows.length > 0) {
      const id = result.rows[0].id;
      processedIds.push(id);
      console.log(`OK: id=${id} ${plaka} → fatura_kesildi=${kesildi}`);
      updated++;
    } else {
      console.log(`BULUNAMADI: ${plaka}`);
      notFound++;
    }
  }

  console.log(`\n--- Sonuç ---`);
  console.log(`Güncellenen: ${updated}`);
  console.log(`Bulunamayan: ${notFound}`);
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
