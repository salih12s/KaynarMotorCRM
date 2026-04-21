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

// GET /telefon/:telefon - Telefon numarasına göre müşteri bul (tam eşleşme)
router.get('/telefon/:telefon', async (req, res) => {
  try {
    const tel = (req.params.telefon || '').replace(/\D/g, '');
    if (!tel || tel.length < 7) return res.json(null);
    // Normalize: remove non-digits from stored telefon when comparing
    const result = await pool.query(
      `SELECT * FROM musteriler
       WHERE regexp_replace(COALESCE(telefon,''), '\\D', '', 'g') = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [tel]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Telefon arama hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id - Tek müşteri + işlem geçmişi
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM musteriler WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Müşteri bulunamadı' });

    const musteri = result.rows[0];
    const name = musteri.ad_soyad;

    // Motor işlemleri - satıcı veya alıcı olarak
    const motorlar = await pool.query(
      `SELECT id, plaka, marka, model, yil, alis_fiyati, satis_fiyati, noter_satis, kar, durum, tarih, satis_tarihi, satici_adi, alici_adi, yevmiye_no
       FROM ikinci_el_motorlar WHERE LOWER(satici_adi) = LOWER($1) OR LOWER(alici_adi) = LOWER($1)
       ORDER BY COALESCE(satis_tarihi, tarih, created_at) DESC`,
      [name]
    );

    // Aksesuar satışları
    const aksesuarlar = await pool.query(
      `SELECT id, ad_soyad, telefon, toplam_satis, kar, durum, satis_tarihi, olusturan_kisi
       FROM aksesuarlar WHERE LOWER(ad_soyad) = LOWER($1)
       ORDER BY COALESCE(satis_tarihi, created_at) DESC`,
      [name]
    );

    // İş emirleri
    const isEmirleri = await pool.query(
      `SELECT id, fis_no, musteri_ad_soyad, model_tip, marka, durum, gercek_toplam_ucret, created_at
       FROM is_emirleri WHERE LOWER(musteri_ad_soyad) = LOWER($1)
       ORDER BY created_at DESC`,
      [name]
    );

    res.json({
      ...musteri,
      motorlar: motorlar.rows,
      aksesuarlar: aksesuarlar.rows,
      isEmirleri: isEmirleri.rows
    });
  } catch (error) {
    console.error('Müşteri detay hatası:', error);
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
