const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /next-stok-kodu - Sonraki otomatik stok kodu
router.get('/next-stok-kodu', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT stok_kodu FROM aksesuar_stok WHERE stok_kodu ~ '^[0-9]+$' ORDER BY stok_kodu DESC LIMIT 1`
    );
    let nextCode = '0000000000001';
    if (result.rows.length > 0) {
      const lastNum = parseInt(result.rows[0].stok_kodu, 10);
      nextCode = String(lastNum + 1).padStart(13, '0');
    }
    res.json({ nextStokKodu: nextCode });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET / - Tüm stok kayıtları
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aksesuar_stok ORDER BY stok_adi');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /ara?q=... - Stok ara
router.get('/ara', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const searchQuery = `%${q}%`;
    const result = await pool.query(
      'SELECT * FROM aksesuar_stok WHERE stok_kodu ILIKE $1 OR stok_adi ILIKE $1 ORDER BY stok_adi LIMIT 20',
      [searchQuery]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST / - Stok ekle
router.post('/', async (req, res) => {
  try {
    const { stok_kodu, stok_adi, marka, giren_miktar, birimi, alis_fiyati, satis_fiyati, platform } = req.body;
    const mevcut = parseInt(giren_miktar) || 0;
    const envanter = mevcut * (parseFloat(satis_fiyati) || 0);

    const result = await pool.query(
      `INSERT INTO aksesuar_stok (stok_kodu, stok_adi, marka, giren_miktar, mevcut, birimi, alis_fiyati, satis_fiyati, envanter_degeri, platform)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [stok_kodu, stok_adi, marka || null, mevcut, mevcut, birimi || 'Adet', parseFloat(alis_fiyati) || 0, parseFloat(satis_fiyati) || 0, envanter, platform || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Bu stok kodu zaten mevcut' });
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PUT /:id - Stok güncelle
router.put('/:id', async (req, res) => {
  try {
    const { stok_kodu, stok_adi, marka, giren_miktar, birimi, alis_fiyati, satis_fiyati, platform } = req.body;
    const giren = parseInt(giren_miktar) || 0;
    const mevcut = giren;
    const envanter = mevcut * (parseFloat(satis_fiyati) || 0);

    const result = await pool.query(
      `UPDATE aksesuar_stok SET stok_kodu=$1, stok_adi=$2, marka=$3, giren_miktar=$4, mevcut=$5,
       birimi=$6, alis_fiyati=$7, satis_fiyati=$8, envanter_degeri=$9, platform=$10, updated_at=CURRENT_TIMESTAMP
       WHERE id=$11 RETURNING *`,
      [stok_kodu, stok_adi, marka || null, giren, mevcut, birimi || 'Adet', parseFloat(alis_fiyati) || 0, parseFloat(satis_fiyati) || 0, envanter, platform || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Stok bulunamadı' });
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Bu stok kodu zaten mevcut' });
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /:id - Stok sil
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM aksesuar_stok WHERE id = $1', [req.params.id]);
    res.json({ message: 'Stok silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /toplu - Toplu stok ekleme
router.post('/toplu', async (req, res) => {
  try {
    const { stoklar } = req.body;
    if (!stoklar || !Array.isArray(stoklar)) return res.status(400).json({ message: 'Stok listesi gerekli' });

    let eklenen = 0;
    for (const stok of stoklar) {
      const mevcut = parseInt(stok.giren_miktar) || 0;
      const envanter = mevcut * (parseFloat(stok.satis_fiyati) || 0);
      await pool.query(
        `INSERT INTO aksesuar_stok (stok_kodu, stok_adi, marka, giren_miktar, mevcut, birimi, alis_fiyati, satis_fiyati, envanter_degeri)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (stok_kodu) DO UPDATE SET
           stok_adi=EXCLUDED.stok_adi, marka=EXCLUDED.marka, giren_miktar=EXCLUDED.giren_miktar, mevcut=EXCLUDED.mevcut,
           alis_fiyati=EXCLUDED.alis_fiyati, satis_fiyati=EXCLUDED.satis_fiyati, envanter_degeri=EXCLUDED.envanter_degeri,
           updated_at=CURRENT_TIMESTAMP`,
        [stok.stok_kodu, stok.stok_adi, stok.marka || null, mevcut, mevcut, stok.birimi || 'Adet',
         parseFloat(stok.alis_fiyati) || 0, parseFloat(stok.satis_fiyati) || 0, envanter]
      );
      eklenen++;
    }
    res.json({ message: `${eklenen} stok kaydı eklendi/güncellendi` });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
