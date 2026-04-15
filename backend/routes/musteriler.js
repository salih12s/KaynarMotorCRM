const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET / - Tüm müşteriler
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM musteriler ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Müşteri listeleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /ara/:query - Müşteri ara
router.get('/ara/:query', async (req, res) => {
  try {
    const searchQuery = `%${req.params.query}%`;
    const result = await pool.query(
      'SELECT * FROM musteriler WHERE ad_soyad ILIKE $1 OR telefon ILIKE $1 ORDER BY ad_soyad LIMIT 20',
      [searchQuery]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Müşteri arama hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id - Tek müşteri
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM musteriler WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Müşteri bulunamadı' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST / - Müşteri ekle
router.post('/', async (req, res) => {
  try {
    const { ad_soyad, adres, telefon } = req.body;
    const result = await pool.query(
      'INSERT INTO musteriler (ad_soyad, adres, telefon) VALUES ($1, $2, $3) RETURNING *',
      [ad_soyad, adres, telefon]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Müşteri ekleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PUT /:id - Müşteri güncelle
router.put('/:id', async (req, res) => {
  try {
    const { ad_soyad, adres, telefon } = req.body;
    const result = await pool.query(
      'UPDATE musteriler SET ad_soyad = $1, adres = $2, telefon = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [ad_soyad, adres, telefon, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Müşteri bulunamadı' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /:id - Müşteri sil
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM musteriler WHERE id = $1', [req.params.id]);
    res.json({ message: 'Müşteri silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
