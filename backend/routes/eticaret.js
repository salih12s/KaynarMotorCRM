const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAktivite, ISLEM_TIPLERI } = require('../config/activityLogger');

const emptyToZero = (v) => { if (v === '' || v === undefined || v === null) return 0; const n = Number(v); return isNaN(n) ? 0 : n; };

// ============ PLATFORMLAR ============

// GET /platformlar
router.get('/platformlar', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eticaret_platformlar ORDER BY platform_adi');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /platformlar [ADMIN]
router.post('/platformlar', async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ message: 'Admin yetkisi gerekli' });
    const { platform_adi, komisyon_orani, kdv_orani, kargo_ucreti } = req.body;
    if (!platform_adi || !platform_adi.trim()) return res.status(400).json({ message: 'Platform adı zorunludur' });
    const result = await pool.query(
      'INSERT INTO eticaret_platformlar (platform_adi, komisyon_orani, kdv_orani, kargo_ucreti) VALUES ($1, $2, $3, $4) RETURNING *',
      [platform_adi.trim(), emptyToZero(komisyon_orani), emptyToZero(kdv_orani) || 20, emptyToZero(kargo_ucreti)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Platform ekleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// PUT /platformlar/:id [ADMIN]
router.put('/platformlar/:id', async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ message: 'Admin yetkisi gerekli' });
    const { platform_adi, komisyon_orani, kdv_orani, kargo_ucreti } = req.body;
    if (!platform_adi || !platform_adi.trim()) return res.status(400).json({ message: 'Platform adı zorunludur' });
    const result = await pool.query(
      'UPDATE eticaret_platformlar SET platform_adi=$1, komisyon_orani=$2, kdv_orani=$3, kargo_ucreti=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *',
      [platform_adi.trim(), emptyToZero(komisyon_orani), emptyToZero(kdv_orani) || 20, emptyToZero(kargo_ucreti), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Platform bulunamadı' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Platform güncelleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// DELETE /platformlar/:id [ADMIN]
router.delete('/platformlar/:id', async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ message: 'Admin yetkisi gerekli' });
    await pool.query('DELETE FROM eticaret_platformlar WHERE id = $1', [req.params.id]);
    res.json({ message: 'Platform silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ============ SATIŞLAR ============

// GET /stats
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as toplam_satis,
        COALESCE(SUM(satis_fiyati * adet), 0) as toplam_gelir,
        COALESCE(SUM(komisyon_tutari), 0) as toplam_komisyon,
        COALESCE(SUM(kar), 0) as toplam_kar
      FROM eticaret_satislar
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT es.*, ep.platform_adi, ep.komisyon_orani as platform_komisyon
      FROM eticaret_satislar es
      LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id
      ORDER BY es.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT es.*, ep.platform_adi
      FROM eticaret_satislar es
      LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id
      WHERE es.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Satış bulunamadı' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST / - E-ticaret satış oluştur (stoktan düş)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { stok_id, platform_id, urun_adi, alis_fiyati, satis_fiyati, komisyon_orani, kdv_orani, kargo_ucreti, adet, tarih } = req.body;

    const miktar = emptyToZero(adet) || 1;
    const alis = emptyToZero(alis_fiyati);
    const satis = emptyToZero(satis_fiyati);
    const komisyon = emptyToZero(komisyon_orani);
    const kdv = emptyToZero(kdv_orani) || 20;
    const kargo = emptyToZero(kargo_ucreti);
    const komisyonTutari = (satis * komisyon / 100) * miktar;
    const kar = (satis * miktar) - (alis * miktar) - komisyonTutari;

    const result = await client.query(
      `INSERT INTO eticaret_satislar (stok_id, platform_id, urun_adi, alis_fiyati, satis_fiyati, komisyon_orani, komisyon_tutari, kdv_orani, kargo_ucreti, kar, adet, tarih)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [stok_id, platform_id, urun_adi, alis, satis, komisyon, komisyonTutari, kdv, kargo, kar, miktar, tarih || new Date()]
    );

    // Stoktan düş
    if (stok_id) {
      await client.query(
        `UPDATE aksesuar_stok SET cikan_miktar = cikan_miktar + $1, mevcut = mevcut - $1,
         envanter_degeri = (mevcut - $1) * satis_fiyati, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [miktar, stok_id]
      );
    }

    await client.query('COMMIT');

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.ETICARET_SATIS_OLUSTUR,
      islem_detay: `E-ticaret satış: ${urun_adi} x${miktar}`,
      hedef_tablo: 'eticaret_satislar', hedef_id: result.rows[0].id
    });

    // Platform adını da ekle
    const full = await pool.query(`
      SELECT es.*, ep.platform_adi FROM eticaret_satislar es
      LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id WHERE es.id = $1
    `, [result.rows[0].id]);
    res.status(201).json(full.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('E-ticaret satış hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// PUT /:id - Güncelle
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM eticaret_satislar WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Bulunamadı' }); }
    const eski = existing.rows[0];

    // Eski stok geri ekle
    if (eski.stok_id) {
      await client.query(
        `UPDATE aksesuar_stok SET cikan_miktar = cikan_miktar - $1, mevcut = mevcut + $1,
         envanter_degeri = (mevcut + $1) * satis_fiyati, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [eski.adet, eski.stok_id]
      );
    }

    const { stok_id, platform_id, urun_adi, alis_fiyati, satis_fiyati, komisyon_orani, kdv_orani, kargo_ucreti, adet, tarih } = req.body;
    const miktar = emptyToZero(adet) || 1;
    const alis = emptyToZero(alis_fiyati);
    const satis = emptyToZero(satis_fiyati);
    const komisyon = emptyToZero(komisyon_orani);
    const kdv = emptyToZero(kdv_orani) || 20;
    const kargo = emptyToZero(kargo_ucreti);
    const komisyonTutari = (satis * komisyon / 100) * miktar;
    const kar = (satis * miktar) - (alis * miktar) - komisyonTutari;

    await client.query(
      `UPDATE eticaret_satislar SET stok_id=$1, platform_id=$2, urun_adi=$3, alis_fiyati=$4,
       satis_fiyati=$5, komisyon_orani=$6, komisyon_tutari=$7, kdv_orani=$8, kargo_ucreti=$9,
       kar=$10, adet=$11, tarih=$12, updated_at=CURRENT_TIMESTAMP WHERE id=$13`,
      [stok_id, platform_id, urun_adi, alis, satis, komisyon, komisyonTutari, kdv, kargo, kar, miktar, tarih, req.params.id]
    );

    // Yeni stoktan düş
    if (stok_id) {
      await client.query(
        `UPDATE aksesuar_stok SET cikan_miktar = cikan_miktar + $1, mevcut = mevcut - $1,
         envanter_degeri = (mevcut - $1) * satis_fiyati, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [miktar, stok_id]
      );
    }

    await client.query('COMMIT');

    const full = await pool.query(`
      SELECT es.*, ep.platform_adi FROM eticaret_satislar es
      LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id WHERE es.id = $1
    `, [req.params.id]);
    res.json(full.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// DELETE /:id - Sil (stok geri ekle)
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM eticaret_satislar WHERE id = $1', [req.params.id]);
    if (existing.rows.length > 0 && existing.rows[0].stok_id) {
      await client.query(
        `UPDATE aksesuar_stok SET cikan_miktar = cikan_miktar - $1, mevcut = mevcut + $1,
         envanter_degeri = (mevcut + $1) * satis_fiyati, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [existing.rows[0].adet, existing.rows[0].stok_id]
      );
    }
    await client.query('DELETE FROM eticaret_satislar WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'E-ticaret satışı silindi' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

module.exports = router;
