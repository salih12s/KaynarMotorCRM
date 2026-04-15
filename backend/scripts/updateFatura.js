const { pool } = require('../config/db');

async function run() {
  try {
    // 1. Add eski_kayit column
    await pool.query('ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS eski_kayit BOOLEAN DEFAULT FALSE');
    console.log('eski_kayit column added');

    // 2. Mark ALL existing records as old
    const r1 = await pool.query('UPDATE ikinci_el_motorlar SET eski_kayit = true');
    console.log('Marked', r1.rowCount, 'records as eski_kayit');

    // 3. Set fatura_kesildi = true for ALL tamamlandi records
    const r2 = await pool.query("UPDATE ikinci_el_motorlar SET fatura_kesildi = true WHERE durum = 'tamamlandi'");
    console.log('Set fatura_kesildi=true for', r2.rowCount, 'tamamlandi records');

    // 4. Set fatura_kesildi = false for specific plates (user listed + YANLIS in CSV)
    const falsePlates = [
      '63ALG255', '63 ALG 255',
      '33ADD677',
      '80AGC832',
      '27BLC039',
      '33BDM868', '33 BDM868',
      '33AJB024',
      '33BCY108',
      '33AIT482',
      '33BDE694'
    ];
    
    const r3 = await pool.query(
      `UPDATE ikinci_el_motorlar SET fatura_kesildi = false 
       WHERE REPLACE(UPPER(plaka), ' ', '') IN (
         SELECT REPLACE(UPPER(unnest($1::text[])), ' ', '')
       )`,
      [falsePlates]
    );
    console.log('Set fatura_kesildi=false for', r3.rowCount, 'specific records');

    // Verify
    const check = await pool.query("SELECT plaka, fatura_kesildi FROM ikinci_el_motorlar WHERE durum='tamamlandi' ORDER BY plaka");
    check.rows.forEach(r => console.log(r.plaka, '->', r.fatura_kesildi ? 'KESILDI' : 'KESILMEDI'));

    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();
