const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const emptyToZero = (v) => { if (v === '' || v === undefined || v === null) return 0; const n = Number(v); return isNaN(n) ? 0 : n; };

// Satış stok kaydına bağlıysa yedek parça stoğunu ayarla (yon: -1 düş, +1 geri ekle)
const stokAyarla = async (client, stokId, adet, yon) => {
  if (!stokId || !adet) return;
  const miktar = adet * yon;
  // GREATEST: stok 0'ın altına düşmez (miktar negatifken, yani geri eklemede, etkisizdir).
  await client.query(
    `UPDATE yedek_parca_stok SET
       cikan_miktar = GREATEST(cikan_miktar + $1, 0),
       mevcut = GREATEST(mevcut - $1, 0),
       envanter_degeri = GREATEST(mevcut - $1, 0) * satis_fiyati,
       updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [miktar, stokId]
  );
};

// GET /
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM yedek_parcalar ORDER BY urun_adi');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM yedek_parcalar WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Yedek parça bulunamadı' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { urun_adi, alis_fiyati, satis_fiyati, musteri_adi, musteri_telefon, kalan_odeme, stok_id, adet } = req.body;
    const satisAdet = emptyToZero(adet) || 1;
    const result = await client.query(
      'INSERT INTO yedek_parcalar (urun_adi, alis_fiyati, satis_fiyati, musteri_adi, musteri_telefon, kalan_odeme, stok_id, adet) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [urun_adi, emptyToZero(alis_fiyati), emptyToZero(satis_fiyati), musteri_adi || null, musteri_telefon || null, emptyToZero(kalan_odeme), stok_id || null, satisAdet]
    );
    // Barkodla stoktan satıldıysa stoktan düş
    await stokAyarla(client, stok_id || null, satisAdet, 1);
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// PUT /:id
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT stok_id, adet FROM yedek_parcalar WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Yedek parça bulunamadı' });
    }

    const { urun_adi, alis_fiyati, satis_fiyati, musteri_adi, musteri_telefon, kalan_odeme, stok_id, adet } = req.body;
    const satisAdet = emptyToZero(adet) || 1;
    const result = await client.query(
      'UPDATE yedek_parcalar SET urun_adi=$1, alis_fiyati=$2, satis_fiyati=$3, musteri_adi=$4, musteri_telefon=$5, kalan_odeme=$7, stok_id=$8, adet=$9, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *',
      [urun_adi, emptyToZero(alis_fiyati), emptyToZero(satis_fiyati), musteri_adi || null, musteri_telefon || null, req.params.id, emptyToZero(kalan_odeme), stok_id || null, satisAdet]
    );

    // Eski stok düşümünü geri al, yenisini uygula
    await stokAyarla(client, existing.rows[0].stok_id, existing.rows[0].adet || 1, -1);
    await stokAyarla(client, stok_id || null, satisAdet, 1);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT stok_id, adet FROM yedek_parcalar WHERE id = $1', [req.params.id]);
    await client.query('DELETE FROM yedek_parcalar WHERE id = $1', [req.params.id]);
    // Satış silinince stok geri eklenir
    if (existing.rows.length > 0) {
      await stokAyarla(client, existing.rows[0].stok_id, existing.rows[0].adet || 1, -1);
    }
    await client.query('COMMIT');
    res.json({ message: 'Yedek parça silindi' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

module.exports = router;
