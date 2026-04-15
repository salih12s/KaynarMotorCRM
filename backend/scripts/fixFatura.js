require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../config/db');

// plaka -> fatura_kesildi (true=1, false=0)
// Aynı plaka birden fazla varsa sırayla işlenir
const data = [
  ['34AA0058', false],
  ['34AA0095', false],
  ['34AA0004', false],
  ['34AA0089', false],
  ['34AA0158', false],
  ['34AA0136', false],
  ['34AA0107', false],
  ['34AA0123', false],
  ['34AA0044', false],
  ['34AA0103', false],
  ['34AA0099', false],
  ['34AA0016', false],
  ['34AA0083', false],
  ['34AA0076', false],
  ['34AA0071', false],
  ['34AA0075', false],
  ['34AA0152', false],
  ['34AA0169', false],
  ['34AA0092', false],
  ['34AA0064', false],
  ['34AA0161', false],
  ['34AA0017', false],
  ['34AA0013', false],
  ['34AA0124', false],
  ['34AA0157', false],
  ['34AA0086', false],
  ['34AA0105', false],
  ['34AA0029', false],
  ['34AA0033', false],
  ['34AA0087', false],
  ['34AA0066', false],
  ['34AA0042', false],
  ['34AA0122', false],
  ['34AA0102', false],
  ['34AA0104', false],
  ['34AA0159', false],
  ['34AA0097', false],
  ['34AA0018', true],
  ['34AA0025', true],
  ['34AA0046', true],
  ['34AA0151', true],
  ['34AA0052', true],
  ['34AA0063', true],
  ['34AA0155', true],
  ['34AA0112', true],
  ['34AA0115', true],
  ['34AA0041', true],
  ['34AA0070', true],
  ['34AA0106', true],
  ['34AA0031', true],
  ['34AA0010', true],
  ['34AA0091', true],
  ['34AA0158', true],
  ['34AA0110', true],
  ['34AA0108', true],
  ['34AA0165', true],
  ['34AA0135', true],
  ['34AA0163', true],
  ['34AA0116', true],
  ['34AA0065', true],
  ['34AA0117', true],
  ['34AA0096', true],
  ['34AA0146', true],
  ['34AA0093', true],
  ['34AA0126', true],
  ['34AA0134', true],
  ['34AA0081', true],
  ['34AA0132', true],
  ['34AA0067', true],
  ['34AA0109', true],
  ['34AA0118', true],
  ['34AA0105', true],
  ['34AA0164', true],
  ['34AA0072', true],
  ['34AA0060', true],
  ['34AA0035', true],
  ['34AA0111', true],
  ['34AA0057', true],
  ['34AA0147', true],
  ['34AA0088', true],
  ['34AA0051', true],
  ['34AA0007', true],
  ['34AA0068', true],
  ['34AA0144', true],
  ['34AA0171', true],
  ['34AA0073', true],
  ['34AA0098', true],
  ['34AA0121', true],
  ['34AA0084', true],
  ['34AA0036', true],
  ['34AA0129', true],
  ['34AA0001', true],
  ['34AA0056', true],
  ['34AA0050', true],
  ['34AA0006', true],
  ['34AA0003', true],
  ['34AA0008', true],
  ['34AA0131', true],
  ['34AA0119', true],
  ['34AA0034', true],
  ['34AA0162', true],
  ['34AA0061', true],
  ['34AA0005', true],
  ['34AA0009', true],
  ['34AA0150', true],
  ['34AA0038', true],
  ['34AA0022', true],
  ['34AA0153', true],
  ['34AA0149', true],
  ['34AA0085', true],
  ['34AA0040', true],
  ['34AA0055', true],
  ['34AA0023', true],
  ['34AA0148', true],
  ['34AA0021', true],
  ['34AA0170', true],
  ['34AA0120', true],
  ['34AA0014', true],
  ['34AA0081', true],
  ['34AA0133', true],
  ['34AA0062', true],
  ['34AA0077', true],
  ['34AA0028', true],
  ['34AA0114', true],
  ['34AA0103', true],
  ['34AA0002', true],
  ['34AA0059', true],
  ['34AA0030', true],
  ['34AA0145', true],
  ['34AA0074', true],
  ['34AA0082', true],
  ['34AA0020', true],
  ['34AA0015', true],
  ['34AA0142', true],
  ['34AA0140', true],
  ['34AA0160', true],
  ['34AA0156', true],
  ['34AA0069', true],
  ['34AA0138', true],
  ['34AA0045', true],
  ['34AA0141', false],
  ['34AA0048', false],
  ['34AA0024', false],
  ['34AA0039', false],
  ['34AA0143', false],
  ['34AA0154', false],
  ['34AA0012', false],
  ['34AA0137', false],
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
