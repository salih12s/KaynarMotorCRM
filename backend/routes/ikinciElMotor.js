const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAktivite, ISLEM_TIPLERI } = require('../config/activityLogger');

const emptyToZero = (v) => { if (v === '' || v === undefined || v === null) return 0; const n = Number(v); return isNaN(n) ? 0 : n; };

// GET /stats/ozet
router.get('/stats/ozet', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as toplam,
        COALESCE(SUM(satis_fiyati), 0) as toplam_satis,
        COALESCE(SUM(alis_fiyati), 0) as toplam_alis,
        COALESCE(SUM(kar), 0) as toplam_kar,
        COUNT(CASE WHEN durum = 'beklemede' THEN 1 END) as bekleyen,
        COUNT(CASE WHEN durum = 'tamamlandi' THEN 1 END) as tamamlanan
      FROM ikinci_el_motorlar WHERE eski_kayit IS NOT TRUE
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET / - Tüm motor satışları
router.get('/', async (req, res) => {
  try {
    const { baslangic, bitis, durum } = req.query;
    let query = 'SELECT * FROM ikinci_el_motorlar WHERE 1=1';
    const params = [];

    if (baslangic) { params.push(baslangic); query += ` AND tarih >= $${params.length}`; }
    if (bitis) { params.push(bitis); query += ` AND tarih <= $${params.length}`; }
    if (durum) { params.push(durum); query += ` AND durum = $${params.length}`; }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ikinci_el_motorlar WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST / - Motor satışı ekle
router.post('/', async (req, res) => {
  try {
    const {
      tarih, plaka, marka, model, km,
      alis_fiyati, satis_fiyati, noter_alis, noter_satis, masraflar,
      alici_adi, alici_tc, alici_telefon, alici_adres,
      odeme_sekli, aciklama, durum, stok_tipi,
      yil, satici_adi, satici_tc, kalan_odeme, fatura_kesildi, yevmiye_no
    } = req.body;

    const alis = emptyToZero(alis_fiyati);
    const satis = emptyToZero(satis_fiyati);
    const nAlis = emptyToZero(noter_alis);
    const nSatis = emptyToZero(noter_satis);
    const masraf = emptyToZero(masraflar);
    const kar = satis - alis - masraf;
    const tamamlamaTarihi = durum === 'tamamlandi' ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO ikinci_el_motorlar (tarih, plaka, marka, model, km, alis_fiyati, satis_fiyati, noter_alis, noter_satis, masraflar, kar,
        alici_adi, alici_tc, alici_telefon, alici_adres, odeme_sekli, aciklama, durum, tamamlama_tarihi, stok_tipi,
        yil, satici_adi, satici_tc, kalan_odeme, fatura_kesildi, yevmiye_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING *`,
      [tarih || new Date(), plaka, marka, model, emptyToZero(km), alis, satis, nAlis, nSatis, masraf, kar,
       alici_adi, alici_tc, alici_telefon, alici_adres, odeme_sekli || 'nakit', aciklama, durum || 'stokta', tamamlamaTarihi, stok_tipi || 'sahip',
       emptyToZero(yil) || null, satici_adi || null, satici_tc || null, emptyToZero(kalan_odeme), fatura_kesildi || false, yevmiye_no || null]
    );

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_OLUSTUR,
      islem_detay: `2. El Motor: ${plaka} - ${marka} ${model}`,
      hedef_tablo: 'ikinci_el_motorlar', hedef_id: result.rows[0].id
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Motor satış ekleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PUT /:id - Güncelle
router.put('/:id', async (req, res) => {
  try {
    const existing = await pool.query('SELECT durum FROM ikinci_el_motorlar WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });

    const {
      tarih, plaka, marka, model, km,
      alis_fiyati, satis_fiyati, noter_alis, noter_satis, masraflar,
      alici_adi, alici_tc, alici_telefon, alici_adres,
      odeme_sekli, aciklama, durum, stok_tipi,
      yil, satici_adi, satici_tc, kalan_odeme, fatura_kesildi, yevmiye_no, eski_kayit
    } = req.body;

    const alis = emptyToZero(alis_fiyati);
    const satis = emptyToZero(satis_fiyati);
    const nAlis = emptyToZero(noter_alis);
    const nSatis = emptyToZero(noter_satis);
    const masraf = emptyToZero(masraflar);
    const kar = satis - alis - masraf;
    const tamamlamaTarihi = (durum === 'tamamlandi' && existing.rows[0].durum !== 'tamamlandi') ? new Date() : null;

    const result = await pool.query(
      `UPDATE ikinci_el_motorlar SET
        tarih=$1, plaka=$2, marka=$3, model=$4, km=$5,
        alis_fiyati=$6, satis_fiyati=$7, noter_alis=$8, noter_satis=$9, masraflar=$10, kar=$11,
        alici_adi=$12, alici_tc=$13, alici_telefon=$14, alici_adres=$15,
        odeme_sekli=$16, aciklama=$17, durum=$18,
        tamamlama_tarihi=COALESCE($19, tamamlama_tarihi),
        stok_tipi=$20, yil=$21, satici_adi=$22, satici_tc=$23,
        kalan_odeme=$24, fatura_kesildi=$25, yevmiye_no=$26,
        eski_kayit=COALESCE($28, eski_kayit),
        updated_at=CURRENT_TIMESTAMP WHERE id=$27 RETURNING *`,
      [tarih, plaka, marka, model, emptyToZero(km), alis, satis, nAlis, nSatis, masraf, kar,
       alici_adi, alici_tc, alici_telefon, alici_adres, odeme_sekli, aciklama, durum,
       tamamlamaTarihi, stok_tipi || 'sahip', emptyToZero(yil) || null, satici_adi || null, satici_tc || null,
       emptyToZero(kalan_odeme), fatura_kesildi || false, yevmiye_no || null, req.params.id,
       eski_kayit !== undefined ? eski_kayit : null]
    );

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_GUNCELLE,
      islem_detay: `2. El Motor #${req.params.id} güncellendi`,
      hedef_tablo: 'ikinci_el_motorlar', hedef_id: parseInt(req.params.id)
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Motor satış güncelleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ikinci_el_motorlar WHERE id = $1', [req.params.id]);
    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_SIL,
      islem_detay: `2. El Motor #${req.params.id} silindi`,
      hedef_tablo: 'ikinci_el_motorlar', hedef_id: parseInt(req.params.id)
    });
    res.json({ message: 'Motor satışı silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
