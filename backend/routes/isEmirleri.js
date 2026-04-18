const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAktivite, ISLEM_TIPLERI } = require('../config/activityLogger');

const emptyToNull = (value) => (value === '' || value === undefined) ? null : value;
const emptyToZero = (value) => {
  if (value === '' || value === undefined || value === null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// GET /next-fis-no/preview
router.get('/next-fis-no/preview', async (req, res) => {
  try {
    const result = await pool.query('SELECT COALESCE(MAX(fis_no), 0) + 1 AS next_fis_no FROM is_emirleri');
    res.json({ nextFisNo: result.rows[0].next_fis_no });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET / - Tüm iş emirleri
router.get('/', async (req, res) => {
  try {
    const { baslangic, bitis, durum } = req.query;
    let query = 'SELECT * FROM is_emirleri WHERE 1=1';
    const params = [];

    if (baslangic) {
      params.push(baslangic);
      query += ` AND created_at >= $${params.length}`;
    }
    if (bitis) {
      params.push(bitis);
      query += ` AND created_at <= $${params.length}::date + interval '1 day'`;
    }
    if (durum) {
      params.push(durum);
      query += ` AND durum = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('İş emri listeleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id - Tek iş emri + parçalar
router.get('/:id', async (req, res) => {
  try {
    const isEmri = await pool.query('SELECT * FROM is_emirleri WHERE id = $1', [req.params.id]);
    if (isEmri.rows.length === 0) return res.status(404).json({ message: 'İş emri bulunamadı' });

    const parcalar = await pool.query('SELECT * FROM parcalar WHERE is_emri_id = $1 ORDER BY id', [req.params.id]);

    res.json({ ...isEmri.rows[0], parcalar: parcalar.rows });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST / - İş emri oluştur
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      musteri_ad_soyad, adres, telefon, km, model_tip, marka,
      aciklama, ariza_sikayetler, tahmini_teslim_tarihi, tahmini_toplam_ucret,
      durum, odeme_detaylari, parcalar
    } = req.body;

    // Fiş numarası
    const fisNoResult = await client.query('SELECT COALESCE(MAX(fis_no), 0) + 1 AS next_fis_no FROM is_emirleri');
    const fisNo = fisNoResult.rows[0].next_fis_no;

    // Müşteri oluştur/güncelle (telefon bazlı)
    let musteriId = null;
    if (telefon) {
      const existingMusteri = await client.query('SELECT id FROM musteriler WHERE telefon = $1', [telefon]);
      if (existingMusteri.rows.length > 0) {
        musteriId = existingMusteri.rows[0].id;
        await client.query(
          'UPDATE musteriler SET ad_soyad = $1, adres = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [musteri_ad_soyad, adres, musteriId]
        );
      } else {
        const newMusteri = await client.query(
          'INSERT INTO musteriler (ad_soyad, adres, telefon) VALUES ($1, $2, $3) RETURNING id',
          [musteri_ad_soyad, adres, telefon]
        );
        musteriId = newMusteri.rows[0].id;
      }
    }

    // İş emri INSERT
    const isEmriResult = await client.query(
      `INSERT INTO is_emirleri (fis_no, musteri_id, musteri_ad_soyad, adres, telefon, km, model_tip, marka,
        aciklama, ariza_sikayetler, tahmini_teslim_tarihi, tahmini_toplam_ucret, durum, odeme_detaylari,
        olusturan_kullanici_id, olusturan_kisi, teslim_eden_teknisyen)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [fisNo, musteriId, musteri_ad_soyad, adres, telefon, emptyToZero(km), model_tip, marka,
       aciklama, ariza_sikayetler, emptyToNull(tahmini_teslim_tarihi), emptyToZero(tahmini_toplam_ucret),
       durum || 'beklemede', odeme_detaylari, req.user.id, req.user.ad_soyad, req.user.ad_soyad]
    );

    const isEmriId = isEmriResult.rows[0].id;

    // Parçalar ekle
    let toplamFiyat = 0;
    let toplamMaliyet = 0;
    if (parcalar && parcalar.length > 0) {
      for (const parca of parcalar) {
        const adet = emptyToZero(parca.adet) || 1;
        const birimFiyat = emptyToZero(parca.birim_fiyat);
        const maliyet = emptyToZero(parca.maliyet);
        const parcaToplamFiyat = adet * birimFiyat;

        await client.query(
          `INSERT INTO parcalar (is_emri_id, parca_kodu, takilan_parca, adet, birim_fiyat, maliyet, toplam_fiyat)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [isEmriId, parca.parca_kodu, parca.takilan_parca, adet, birimFiyat, maliyet, parcaToplamFiyat]
        );
        toplamFiyat += parcaToplamFiyat;
        toplamMaliyet += adet * maliyet;
      }
    }

    // Toplamları güncelle
    const kar = toplamFiyat - toplamMaliyet;
    await client.query(
      'UPDATE is_emirleri SET gercek_toplam_ucret = $1, toplam_maliyet = $2, kar = $3 WHERE id = $4',
      [toplamFiyat, toplamMaliyet, kar, isEmriId]
    );

    await client.query('COMMIT');

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.IS_EMRI_OLUSTUR,
      islem_detay: `Fiş No: ${fisNo} - ${musteri_ad_soyad}`,
      hedef_tablo: 'is_emirleri', hedef_id: isEmriId
    });

    const fullResult = await pool.query('SELECT * FROM is_emirleri WHERE id = $1', [isEmriId]);
    const parcalarResult = await pool.query('SELECT * FROM parcalar WHERE is_emri_id = $1 ORDER BY id', [isEmriId]);
    res.status(201).json({ ...fullResult.rows[0], parcalar: parcalarResult.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('İş emri oluşturma hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// PUT /:id - İş emri güncelle
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tamamlanan iş emrini personel düzenleyemez
    const existing = await client.query('SELECT durum FROM is_emirleri WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'İş emri bulunamadı' });
    }
    if (existing.rows[0].durum === 'tamamlandi' && req.user.rol !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Tamamlanan iş emrini düzenleme yetkiniz yok' });
    }

    const {
      musteri_ad_soyad, adres, telefon, km, model_tip, marka,
      aciklama, ariza_sikayetler, tahmini_teslim_tarihi, tahmini_toplam_ucret,
      durum, odeme_detaylari, teslim_alan_ad_soyad, teslim_eden_teknisyen,
      teslim_tarihi, parcalar
    } = req.body;

    // Tamamlama tarihi
    let tamamlamaTarihi = null;
    if (durum === 'tamamlandi' && existing.rows[0].durum !== 'tamamlandi') {
      tamamlamaTarihi = new Date();
    }

    // Müşteri güncelle
    if (telefon) {
      const existingMusteri = await client.query('SELECT id FROM musteriler WHERE telefon = $1', [telefon]);
      if (existingMusteri.rows.length > 0) {
        await client.query('UPDATE musteriler SET ad_soyad = $1, adres = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [musteri_ad_soyad, adres, existingMusteri.rows[0].id]);
      }
    }

    await client.query(
      `UPDATE is_emirleri SET
        musteri_ad_soyad=$1, adres=$2, telefon=$3, km=$4, model_tip=$5, marka=$6,
        aciklama=$7, ariza_sikayetler=$8, tahmini_teslim_tarihi=$9, tahmini_toplam_ucret=$10,
        durum=$11, odeme_detaylari=$12, teslim_alan_ad_soyad=$13, teslim_eden_teknisyen=$14,
        teslim_tarihi=$15, tamamlama_tarihi=COALESCE($16, tamamlama_tarihi),
        updated_at=CURRENT_TIMESTAMP WHERE id=$17`,
      [musteri_ad_soyad, adres, telefon, emptyToZero(km), model_tip, marka,
       aciklama, ariza_sikayetler, emptyToNull(tahmini_teslim_tarihi), emptyToZero(tahmini_toplam_ucret),
       durum, odeme_detaylari, teslim_alan_ad_soyad, teslim_eden_teknisyen,
       emptyToNull(teslim_tarihi), tamamlamaTarihi, req.params.id]
    );

    // Parçaları yeniden oluştur
    await client.query('DELETE FROM parcalar WHERE is_emri_id = $1', [req.params.id]);

    let toplamFiyat = 0;
    let toplamMaliyet = 0;
    if (parcalar && parcalar.length > 0) {
      for (const parca of parcalar) {
        const adet = emptyToZero(parca.adet) || 1;
        const birimFiyat = emptyToZero(parca.birim_fiyat);
        const maliyet = emptyToZero(parca.maliyet);
        const parcaToplamFiyat = adet * birimFiyat;

        await client.query(
          `INSERT INTO parcalar (is_emri_id, parca_kodu, takilan_parca, adet, birim_fiyat, maliyet, toplam_fiyat)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.params.id, parca.parca_kodu, parca.takilan_parca, adet, birimFiyat, maliyet, parcaToplamFiyat]
        );
        toplamFiyat += parcaToplamFiyat;
        toplamMaliyet += adet * maliyet;
      }
    }

    const kar = toplamFiyat - toplamMaliyet;
    await client.query(
      'UPDATE is_emirleri SET gercek_toplam_ucret = $1, toplam_maliyet = $2, kar = $3 WHERE id = $4',
      [toplamFiyat, toplamMaliyet, kar, req.params.id]
    );

    await client.query('COMMIT');

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.IS_EMRI_GUNCELLE,
      islem_detay: `İş emri #${req.params.id} güncellendi`,
      hedef_tablo: 'is_emirleri', hedef_id: parseInt(req.params.id)
    });

    const fullResult = await pool.query('SELECT * FROM is_emirleri WHERE id = $1', [req.params.id]);
    const parcalarResult = await pool.query('SELECT * FROM parcalar WHERE is_emri_id = $1 ORDER BY id', [req.params.id]);
    res.json({ ...fullResult.rows[0], parcalar: parcalarResult.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('İş emri güncelleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// DELETE /:id - İş emri sil [ADMIN]
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ message: 'Admin yetkisi gerekli' });
    await pool.query('DELETE FROM is_emirleri WHERE id = $1', [req.params.id]);
    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.IS_EMRI_SIL,
      islem_detay: `İş emri #${req.params.id} silindi`,
      hedef_tablo: 'is_emirleri', hedef_id: parseInt(req.params.id)
    });
    res.json({ message: 'İş emri silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
