const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const emptyToZero = (v) => { if (v === '' || v === undefined || v === null) return 0; const n = Number(v); return isNaN(n) ? 0 : n; };

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
  try {
    const { urun_adi, alis_fiyati, satis_fiyati, musteri_adi, musteri_telefon } = req.body;
    const result = await pool.query(
      'INSERT INTO yedek_parcalar (urun_adi, alis_fiyati, satis_fiyati, musteri_adi, musteri_telefon) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [urun_adi, emptyToZero(alis_fiyati), emptyToZero(satis_fiyati), musteri_adi || null, musteri_telefon || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PUT /:id
router.put('/:id', async (req, res) => {
  try {
    const { urun_adi, alis_fiyati, satis_fiyati, musteri_adi, musteri_telefon } = req.body;
    const result = await pool.query(
      'UPDATE yedek_parcalar SET urun_adi=$1, alis_fiyati=$2, satis_fiyati=$3, musteri_adi=$4, musteri_telefon=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *',
      [urun_adi, emptyToZero(alis_fiyati), emptyToZero(satis_fiyati), musteri_adi || null, musteri_telefon || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Yedek parça bulunamadı' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM yedek_parcalar WHERE id = $1', [req.params.id]);
    res.json({ message: 'Yedek parça silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
