const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /gunluk?tarih=YYYY-MM-DD
router.get('/gunluk', async (req, res) => {
  try {
    const { tarih } = req.query;
    const hedefTarih = tarih || new Date().toISOString().split('T')[0];

    // İş emirleri (tamamlanan)
    const isEmirleri = await pool.query(
      `SELECT * FROM is_emirleri WHERE durum = 'tamamlandi' AND DATE(tamamlama_tarihi) = $1`,
      [hedefTarih]
    );

    // Aksesuar satışları (tamamlanan)
    const aksesuarlar = await pool.query(
      `SELECT * FROM aksesuarlar WHERE durum = 'tamamlandi' AND DATE(tamamlama_tarihi) = $1`,
      [hedefTarih]
    );

    // 2. El motor satışları (tamamlanan)
    const motorlar = await pool.query(
      `SELECT * FROM ikinci_el_motorlar WHERE durum = 'tamamlandi' AND tamamlama_tarihi IS NOT NULL AND (eski_kayit IS NOT TRUE OR DATE(tamamlama_tarihi) >= '2026-01-01') AND DATE(tamamlama_tarihi) = $1 ORDER BY tamamlama_tarihi DESC`,
      [hedefTarih]
    );

    // E-ticaret satışları
    const eticaret = await pool.query(
      `SELECT es.*, ep.platform_adi FROM eticaret_satislar es
       LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id
       WHERE DATE(es.tarih) = $1`,
      [hedefTarih]
    );

    // Hesaplamalar
    const isEmriGelir = isEmirleri.rows.reduce((t, r) => t + parseFloat(r.gercek_toplam_ucret || 0), 0);
    const isEmriMaliyet = isEmirleri.rows.reduce((t, r) => t + parseFloat(r.toplam_maliyet || 0), 0);
    const isEmriKar = isEmirleri.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);

    const aksesuarGelir = aksesuarlar.rows.reduce((t, r) => t + parseFloat(r.toplam_satis || 0), 0);
    const aksesuarMaliyet = aksesuarlar.rows.reduce((t, r) => t + parseFloat(r.toplam_maliyet || 0), 0);
    const aksesuarKar = aksesuarlar.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);

    const motorGelir = motorlar.rows.reduce((t, r) => t + parseFloat(r.satis_fiyati || 0), 0);
    const motorMaliyet = motorlar.rows.reduce((t, r) => t + parseFloat(r.alis_fiyati || 0) + parseFloat(r.masraflar || 0), 0);
    const motorKar = motorlar.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);

    const eticaretGelir = eticaret.rows.reduce((t, r) => t + parseFloat(r.satis_fiyati || 0) * parseInt(r.adet || 1), 0);
    const eticaretKar = eticaret.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);

    res.json({
      tarih: hedefTarih,
      is_emirleri: { kayitlar: isEmirleri.rows, gelir: isEmriGelir, maliyet: isEmriMaliyet, kar: isEmriKar },
      aksesuarlar: { kayitlar: aksesuarlar.rows, gelir: aksesuarGelir, maliyet: aksesuarMaliyet, kar: aksesuarKar },
      motorlar: { kayitlar: motorlar.rows, gelir: motorGelir, maliyet: motorMaliyet, kar: motorKar },
      eticaret: { kayitlar: eticaret.rows, gelir: eticaretGelir, kar: eticaretKar },
      toplam: {
        gelir: isEmriGelir + aksesuarGelir + motorGelir + eticaretGelir,
        kar: isEmriKar + aksesuarKar + motorKar + eticaretKar
      }
    });
  } catch (error) {
    console.error('Günlük rapor hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /aralik?baslangic=...&bitis=...
router.get('/aralik', async (req, res) => {
  try {
    const { baslangic, bitis } = req.query;
    if (!baslangic || !bitis) return res.status(400).json({ message: 'Başlangıç ve bitiş tarihi gerekli' });

    const isEmirleri = await pool.query(
      `SELECT ie.*, 
        COALESCE((SELECT json_agg(json_build_object('takilan_parca', ip.takilan_parca, 'adet', ip.adet, 'birim_fiyat', ip.birim_fiyat, 'toplam_fiyat', ip.toplam_fiyat, 'maliyet', ip.maliyet)) FROM parcalar ip WHERE ip.is_emri_id = ie.id), '[]') as parcalar
       FROM is_emirleri ie WHERE ie.durum = 'tamamlandi' AND DATE(COALESCE(ie.tamamlama_tarihi, ie.created_at)) BETWEEN $1 AND $2 ORDER BY ie.created_at DESC`,
      [baslangic, bitis]
    );

    const aksesuarlar = await pool.query(
      `SELECT a.*, COALESCE(json_agg(json_build_object('urun_adi', ap.urun_adi, 'adet', ap.adet, 'maliyet', ap.maliyet, 'satis_fiyati', ap.satis_fiyati)) FILTER (WHERE ap.id IS NOT NULL), '[]') as parcalar
       FROM aksesuarlar a
       LEFT JOIN aksesuar_parcalar ap ON a.id = ap.aksesuar_id
       WHERE DATE(COALESCE(a.tamamlama_tarihi, a.created_at)) BETWEEN $1 AND $2
       GROUP BY a.id ORDER BY a.created_at DESC`,
      [baslangic, bitis]
    );

    const motorlar = await pool.query(
      `SELECT * FROM ikinci_el_motorlar WHERE durum = 'tamamlandi' AND tamamlama_tarihi IS NOT NULL AND (eski_kayit IS NOT TRUE OR DATE(tamamlama_tarihi) >= '2026-01-01') AND DATE(tamamlama_tarihi) BETWEEN $1 AND $2 ORDER BY tamamlama_tarihi DESC`,
      [baslangic, bitis]
    );

    const eticaret = await pool.query(
      `SELECT es.*, ep.platform_adi FROM eticaret_satislar es
       LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id
       WHERE DATE(es.tarih) BETWEEN $1 AND $2 ORDER BY es.tarih DESC`,
      [baslangic, bitis]
    );

    const yedekParcalar = await pool.query(
      `SELECT * FROM yedek_parcalar ORDER BY urun_adi`
    );

    const isEmriKar = isEmirleri.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);
    const aksesuarKar = aksesuarlar.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);
    const motorKar = motorlar.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);
    const eticaretKar = eticaret.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);

    const isEmriGelir = isEmirleri.rows.reduce((t, r) => t + parseFloat(r.gercek_toplam_ucret || 0), 0);
    const isEmriMaliyet = isEmirleri.rows.reduce((t, r) => t + parseFloat(r.toplam_maliyet || 0), 0);
    const aksesuarGelir = aksesuarlar.rows.reduce((t, r) => t + parseFloat(r.toplam_satis || 0), 0);
    const aksesuarMaliyet = aksesuarlar.rows.reduce((t, r) => t + parseFloat(r.toplam_maliyet || 0), 0);
    const motorGelir = motorlar.rows.reduce((t, r) => t + parseFloat(r.satis_fiyati || 0), 0);
    const motorMaliyet = motorlar.rows.reduce((t, r) => t + parseFloat(r.alis_fiyati || 0) + parseFloat(r.masraflar || 0), 0);
    const motorNoterSatisCiro = motorlar.rows.reduce((t, r) => t + parseFloat(r.noter_satis || 0), 0);
    const eticaretGelir = eticaret.rows.reduce((t, r) => t + parseFloat(r.satis_fiyati || 0) * parseInt(r.adet || 1), 0);
    const eticaretMaliyet = eticaret.rows.reduce((t, r) => t + parseFloat(r.alis_fiyati || 0) * parseInt(r.adet || 1), 0);

    const yedekParcaToplamDeger = yedekParcalar.rows.reduce((t, r) => t + parseFloat(r.satis_fiyati || 0), 0);
    const yedekParcaToplamMaliyet = yedekParcalar.rows.reduce((t, r) => t + parseFloat(r.alis_fiyati || 0), 0);

    res.json({
      baslangic, bitis,
      motorlar: motorlar.rows,
      motorGelir, motorMaliyet, motorKar, motorNoterSatisCiro,
      isEmirleri: isEmirleri.rows,
      isEmriGelir, isEmriMaliyet, isEmriKar,
      aksesuarlar: aksesuarlar.rows,
      aksesuarGelir, aksesuarMaliyet, aksesuarKar,
      eticaret: eticaret.rows,
      eticaretGelir, eticaretMaliyet, eticaretKar,
      yedekParcalar: yedekParcalar.rows,
      yedekParcaToplamDeger, yedekParcaToplamMaliyet,
      toplam: {
        gelir: isEmriGelir + aksesuarGelir + motorGelir + eticaretGelir,
        maliyet: isEmriMaliyet + aksesuarMaliyet + motorMaliyet + eticaretMaliyet,
        kar: isEmriKar + aksesuarKar + motorKar + eticaretKar
      }
    });
  } catch (error) {
    console.error('Aralık rapor hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /genel
router.get('/genel', async (req, res) => {
  try {
    const isEmirleri = await pool.query(`
      SELECT COUNT(*) as toplam, COUNT(CASE WHEN durum='tamamlandi' THEN 1 END) as tamamlanan,
      COALESCE(SUM(CASE WHEN durum='tamamlandi' THEN gercek_toplam_ucret END), 0) as gelir,
      COALESCE(SUM(CASE WHEN durum='tamamlandi' THEN kar END), 0) as kar FROM is_emirleri
    `);

    const aksesuarlar = await pool.query(`
      SELECT COUNT(*) as toplam, COALESCE(SUM(toplam_satis), 0) as gelir, COALESCE(SUM(kar), 0) as kar FROM aksesuarlar WHERE durum='tamamlandi'
    `);

    const motorlar = await pool.query(`
      SELECT COUNT(*) as toplam, COALESCE(SUM(satis_fiyati), 0) as gelir, COALESCE(SUM(kar), 0) as kar FROM ikinci_el_motorlar WHERE durum='tamamlandi' AND tamamlama_tarihi IS NOT NULL AND (eski_kayit IS NOT TRUE OR DATE(tamamlama_tarihi) >= '2026-01-01')
    `);

    const eticaret = await pool.query(`
      SELECT COUNT(*) as toplam, COALESCE(SUM(satis_fiyati * adet), 0) as gelir, COALESCE(SUM(kar), 0) as kar FROM eticaret_satislar
    `);

    const yedekParcalar = await pool.query(`
      SELECT COUNT(*) as toplam, COALESCE(SUM(satis_fiyati), 0) as toplam_deger, COALESCE(SUM(alis_fiyati), 0) as toplam_maliyet FROM yedek_parcalar
    `);

    res.json({
      is_emirleri: isEmirleri.rows[0],
      aksesuarlar: aksesuarlar.rows[0],
      motorlar: motorlar.rows[0],
      eticaret: eticaret.rows[0],
      yedek_parcalar: yedekParcalar.rows[0],
      toplam: {
        gelir: parseFloat(isEmirleri.rows[0].gelir) + parseFloat(aksesuarlar.rows[0].gelir) + parseFloat(motorlar.rows[0].gelir) + parseFloat(eticaret.rows[0].gelir),
        kar: parseFloat(isEmirleri.rows[0].kar) + parseFloat(aksesuarlar.rows[0].kar) + parseFloat(motorlar.rows[0].kar) + parseFloat(eticaret.rows[0].kar)
      }
    });
  } catch (error) {
    console.error('Genel rapor hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /fis-kar?baslangic=...&bitis=...
router.get('/fis-kar', async (req, res) => {
  try {
    const { baslangic, bitis } = req.query;
    let query = `SELECT fis_no, musteri_ad_soyad, gercek_toplam_ucret, toplam_maliyet, kar, durum, tamamlama_tarihi, created_at, marka, model_tip, telefon, olusturan_kisi
                 FROM is_emirleri WHERE 1=1`;
    const params = [];

    if (baslangic) { params.push(baslangic); query += ` AND DATE(tamamlama_tarihi) >= $${params.length}`; }
    if (bitis) { params.push(bitis); query += ` AND DATE(tamamlama_tarihi) <= $${params.length}`; }
    query += ' ORDER BY fis_no DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /personeller - distinct personel list
router.get('/personeller', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT olusturan_kisi FROM is_emirleri WHERE olusturan_kisi IS NOT NULL AND olusturan_kisi != '' ORDER BY olusturan_kisi`
    );
    res.json(result.rows.map(r => r.olusturan_kisi));
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
