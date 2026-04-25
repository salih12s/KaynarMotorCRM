const { pool } = require('./db');

async function upsertMusteri(ad_soyad, telefon, adres) {
  if (!ad_soyad || !ad_soyad.trim()) return null;

  const name = ad_soyad.trim();
  const tel = (telefon || '').trim();
  const telDigits = tel.replace(/\D/g, '');

  try {
    let existingId = null;

    // 1) Try to find by phone first (last 10 digits) - prevents duplicates when name varies
    if (telDigits && telDigits.length >= 7) {
      const tail = telDigits.slice(-10);
      const byPhone = await pool.query(
        `SELECT id FROM musteriler
         WHERE regexp_replace(COALESCE(telefon,''), '\\D', '', 'g') LIKE '%' || $1
         ORDER BY updated_at DESC NULLS LAST, created_at DESC
         LIMIT 1`,
        [tail]
      );
      if (byPhone.rows.length > 0) existingId = byPhone.rows[0].id;
    }

    // 2) Fallback: find by name (case-insensitive)
    if (!existingId) {
      const byName = await pool.query(
        'SELECT id FROM musteriler WHERE LOWER(ad_soyad) = LOWER($1) LIMIT 1',
        [name]
      );
      if (byName.rows.length > 0) existingId = byName.rows[0].id;
    }

    if (existingId) {
      // Update with new info if provided
      const updates = ['ad_soyad = $1'];
      const values = [name];
      let idx = 2;

      if (tel) {
        updates.push(`telefon = $${idx}`);
        values.push(tel);
        idx++;
      }
      if (adres && adres.trim()) {
        updates.push(`adres = $${idx}`);
        values.push(adres.trim());
        idx++;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(existingId);
      await pool.query(
        `UPDATE musteriler SET ${updates.join(', ')} WHERE id = $${idx}`,
        values
      );
      return existingId;
    } else {
      // Create new
      const result = await pool.query(
        'INSERT INTO musteriler (ad_soyad, telefon, adres) VALUES ($1, $2, $3) RETURNING id',
        [name, tel || null, adres?.trim() || null]
      );
      return result.rows[0].id;
    }
  } catch (err) {
    console.error('Müşteri upsert hatası:', err.message);
    return null;
  }
}

module.exports = { upsertMusteri };
