const { pool } = require('./db');

async function upsertMusteri(ad_soyad, telefon, adres) {
  if (!ad_soyad || !ad_soyad.trim()) return null;

  const name = ad_soyad.trim();

  try {
    // Try to find by name (case-insensitive)
    const existing = await pool.query(
      'SELECT id FROM musteriler WHERE LOWER(ad_soyad) = LOWER($1) LIMIT 1',
      [name]
    );

    if (existing.rows.length > 0) {
      // Update with new info if provided
      const updates = [];
      const values = [];
      let idx = 1;

      if (telefon && telefon.trim()) {
        updates.push(`telefon = $${idx}`);
        values.push(telefon.trim());
        idx++;
      }
      if (adres && adres.trim()) {
        updates.push(`adres = $${idx}`);
        values.push(adres.trim());
        idx++;
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(existing.rows[0].id);
        await pool.query(
          `UPDATE musteriler SET ${updates.join(', ')} WHERE id = $${idx}`,
          values
        );
      }
      return existing.rows[0].id;
    } else {
      // Create new
      const result = await pool.query(
        'INSERT INTO musteriler (ad_soyad, telefon, adres) VALUES ($1, $2, $3) RETURNING id',
        [name, telefon?.trim() || null, adres?.trim() || null]
      );
      return result.rows[0].id;
    }
  } catch (err) {
    console.error('Müşteri upsert hatası:', err.message);
    return null;
  }
}

module.exports = { upsertMusteri };
