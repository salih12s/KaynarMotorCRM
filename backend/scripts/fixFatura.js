require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../config/db');

// plaka -> fatura_kesildi (true=1, false=0)
// Aynı plaka birden fazla varsa sırayla işlenir
const data = [
  ['33ART565', false],
  ['33AZK071', false],
  ['01AOK996', false],
  ['33AYH903', false],
  ['48ALV639', false],
  ['33BEZ364', false],
  ['33BAU512', false],
  ['33BCL934', false],
  ['33ANZ318', false],
  ['33AZZ397', false],
  ['33AZN513', false],
  ['13AAZ368', false],
  ['33AVU278', false],
  ['33AVF149', false],
  ['33AUB568', false],
  ['33AVF138', false],
  ['41BDU789', false],
  ['79ABN241', false],
  ['33AYY214', false],
  ['33ASJ929', false],
  ['54ALE891', false],
  ['13ACO918', false],
  ['07BYV128', false],
  ['33BCR593', false],
  ['46AJJ429', false],
  ['33AXC208', false],
  ['33BAH634', false],
  ['33ADD677', false],
  ['33AFP885', false],
  ['33AYE249', false],
  ['33ASY739', false],
  ['33AKJ665', false],
  ['33BCJ513', false],
  ['33AZV974', false],
  ['33BAD797', false],
  ['48ANH357', false],
  ['33AZL404', false],
  ['16BOM771', true],
  ['31ATC768', true],
  ['33AOC535', true],
  ['35CNB364', true],
  ['33APF016', true],
  ['33ASH882', true],
  ['42AVG894', true],
  ['33BBC859', true],
  ['33BBH849', true],
  ['33AKC059', true],
  ['33AUA654', true],
  ['33BAT278', true],
  ['33ADG348', true],
  ['06DVG895', true],
  ['33AYT970', true],
  ['48ALV639', true],
  ['33BBB571', true],
  ['33BAZ317', true],
  ['56ABE673', true],
  ['33BES887', true],
  ['55ALJ619', true],
  ['33BBL157', true],
  ['33ASU880', true],
  ['33BBS485', true],
  ['33AZK343', true],
  ['34GBY205', true],
  ['33AZG091', true],
  ['33BCY108', true],
  ['33BEE602', true],
  ['33AVR652', true],
  ['33BDN807', true],
  ['33ATV409', true],
  ['33BBB168', true],
  ['33BBZ106', true],
  ['33BAH634', true],
  ['56AAZ954', true],
  ['33AUT972', true],
  ['33ASC098', true],
  ['33AIF172', true],
  ['33BBB943', true],
  ['33ARR235', true],
  ['34JD7579', true],
  ['33AYG716', true],
  ['33AOV563', true],
  ['01BAC729', true],
  ['33ATZ926', true],
  ['33VJF76', true],
  ['80EC055', true],
  ['33AUY291', true],
  ['33AZL423', true],
  ['33BCG586', true],
  ['33AVV863', true],
  ['33AIT482', true],
  ['33BDL546', true],
  ['01AJL323', true],
  ['33ARK390', true],
  ['33AOS606', true],
  ['01AUJ224', true],
  ['01AOH682', true],
  ['01BER691', true],
  ['33BDM868', true],
  ['33BCC422', true],
  ['33AID312', true],
  ['54KT299', true],
  ['33ASE927', true],
  ['01ASA165', true],
  ['01BFE366', true],
  ['35CFJ306', true],
  ['33AJR998', true],
  ['27BLC039', true],
  ['42ANR954', true],
  ['34RH8423', true],
  ['33AVY727', true],
  ['33AJU395', true],
  ['33APT474', true],
  ['27P3076', true],
  ['34PGV958', true],
  ['27BDS078', true],
  ['80AGC832', true],
  ['33BCE819', true],
  ['07CCS397', true],
  ['33AVR652', true],
  ['33BDV242', true],
  ['33ASG769', true],
  ['33AVH837', true],
  ['33ABS005', true],
  ['33BBH492', true],
  ['33AZZ397', true],
  ['01ANJ816', true],
  ['33ARY249', true],
  ['33ADF243', true],
  ['34CEE482', true],
  ['33AUY905', true],
  ['33AVS780', true],
  ['27BAR128', true],
  ['07CFN230', true],
  ['33R8332', true],
  ['33PG075', true],
  ['50AEE407', true],
  ['45ASD344', true],
  ['33AUA091', true],
  ['33DOM92', true],
  ['33AOA622', true],
  ['33R1737', false],
  ['33AOH610', false],
  ['31AHM170', false],
  ['33AJS714', false],
  ['33SS997', false],
  ['42ARB823', false],
  ['07AVY220', false],
  ['33D1134', false],
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
