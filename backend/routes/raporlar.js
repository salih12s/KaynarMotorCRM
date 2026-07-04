const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Yatırımcıların genel raporlara erişimini engelle (sadece kendi raporlarını görebilir)
const engelleYatirimci = (req, res, next) => {
  if (req.user && req.user.rol === 'yatirimci') {
    return res.status(403).json({ message: 'Bu rapora erişim yetkiniz yok' });
  }
  next();
};

// GET /gunluk?tarih=YYYY-MM-DD
router.get('/gunluk', engelleYatirimci, async (req, res) => {
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
    const motorKarToplam = motorlar.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);
    const motorYatirimciKar = motorlar.rows.reduce((t, r) => t + parseFloat(r.yatirimci_kar || 0), 0);
    const motorKomisyon = motorlar.rows.reduce((t, r) => t + parseFloat(r.komisyoncu_tutari || 0), 0);
    const motorKar = motorKarToplam - motorYatirimciKar; // Admin (işletme) payı = toplam kâr - yatırımcı kârı

    const eticaretGelir = eticaret.rows.reduce((t, r) => t + parseFloat(r.satis_fiyati || 0) * parseInt(r.adet || 1), 0);
    const eticaretKar = eticaret.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);

    res.json({
      tarih: hedefTarih,
      is_emirleri: { kayitlar: isEmirleri.rows, gelir: isEmriGelir, maliyet: isEmriMaliyet, kar: isEmriKar },
      aksesuarlar: { kayitlar: aksesuarlar.rows, gelir: aksesuarGelir, maliyet: aksesuarMaliyet, kar: aksesuarKar },
      motorlar: { kayitlar: motorlar.rows, gelir: motorGelir, maliyet: motorMaliyet, kar: motorKar, kar_toplam: motorKarToplam, yatirimci_kar: motorYatirimciKar, komisyon: motorKomisyon },
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
router.get('/aralik', engelleYatirimci, async (req, res) => {
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
      `SELECT * FROM ikinci_el_motorlar WHERE durum = 'tamamlandi' AND tamamlama_tarihi IS NOT NULL AND (eski_kayit IS NOT TRUE OR DATE(tamamlama_tarihi) >= '2026-01-01') AND DATE(COALESCE(satis_tarihi, tamamlama_tarihi)) BETWEEN $1 AND $2 ORDER BY COALESCE(satis_tarihi, tamamlama_tarihi) DESC`,
      [baslangic, bitis]
    );

    const eticaret = await pool.query(
      `SELECT es.*, ep.platform_adi FROM eticaret_satislar es
       LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id
       WHERE DATE(es.tarih) BETWEEN $1 AND $2 ORDER BY es.tarih DESC`,
      [baslangic, bitis]
    );

    const yedekParcalar = await pool.query(
      `SELECT * FROM yedek_parcalar WHERE DATE(created_at) BETWEEN $1 AND $2 ORDER BY urun_adi`,
      [baslangic, bitis]
    );

    const isEmriKar = isEmirleri.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);
    const aksesuarKar = aksesuarlar.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);
    const motorKarToplam = motorlar.rows.reduce((t, r) => t + parseFloat(r.kar || 0), 0);
    const motorYatirimciKar = motorlar.rows.reduce((t, r) => t + parseFloat(r.yatirimci_kar || 0), 0);
    const motorKomisyon = motorlar.rows.reduce((t, r) => t + parseFloat(r.komisyoncu_tutari || 0), 0);
    const motorKar = motorKarToplam - motorYatirimciKar; // Admin (işletme) payı
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

    // Motor stok toplam değeri (stoktaki motorların alım fiyatları toplamı)
    const stokMotorlar = await pool.query(
      `SELECT COALESCE(SUM(alis_fiyati), 0) as toplam_alis FROM ikinci_el_motorlar WHERE durum IN ('stokta', 'kapora', 'devir_bekliyor')`
    );
    const motorStokToplam = parseFloat(stokMotorlar.rows[0].toplam_alis || 0);

    res.json({
      baslangic, bitis,
      motorlar: motorlar.rows,
      motorGelir, motorMaliyet, motorKar, motorKarToplam, motorYatirimciKar, motorKomisyon, motorNoterSatisCiro,
      isEmirleri: isEmirleri.rows,
      isEmriGelir, isEmriMaliyet, isEmriKar,
      aksesuarlar: aksesuarlar.rows,
      aksesuarGelir, aksesuarMaliyet, aksesuarKar,
      eticaret: eticaret.rows,
      eticaretGelir, eticaretMaliyet, eticaretKar,
      yedekParcalar: yedekParcalar.rows,
      yedekParcaToplamDeger, yedekParcaToplamMaliyet,
      motorStokToplam,
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
router.get('/genel', engelleYatirimci, async (req, res) => {
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
      SELECT COUNT(*) as toplam, COALESCE(SUM(satis_fiyati), 0) as gelir,
             COALESCE(SUM(kar - COALESCE(yatirimci_kar,0)), 0) as kar,
             COALESCE(SUM(kar), 0) as kar_toplam,
             COALESCE(SUM(COALESCE(yatirimci_kar,0)), 0) as yatirimci_kar,
             COALESCE(SUM(COALESCE(komisyoncu_tutari,0)), 0) as komisyon
      FROM ikinci_el_motorlar WHERE durum='tamamlandi' AND tamamlama_tarihi IS NOT NULL AND (eski_kayit IS NOT TRUE OR DATE(tamamlama_tarihi) >= '2026-01-01')
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
router.get('/fis-kar', engelleYatirimci, async (req, res) => {
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
router.get('/personeller', engelleYatirimci, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (LOWER(personel)) personel FROM (
        SELECT COALESCE(NULLIF(teslim_eden_teknisyen, ''), olusturan_kisi) AS personel FROM is_emirleri
      ) t WHERE personel IS NOT NULL AND personel != '' ORDER BY LOWER(personel), personel`
    );
    res.json(result.rows.map(r => r.personel));
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /yatirimci-rapor - Yatırımcının kendi stok/satış/kâr raporu
// Yatırımcı kendi verisini görür; admin ?yatirimci_id ile herhangi birini görebilir
router.get('/yatirimci-rapor', async (req, res) => {
  try {
    let yatirimciId;
    if (req.user.rol === 'yatirimci') {
      yatirimciId = req.user.id;
    } else if (req.user.rol === 'admin') {
      yatirimciId = req.query.yatirimci_id ? parseInt(req.query.yatirimci_id) : null;
      if (!yatirimciId) return res.status(400).json({ message: 'yatirimci_id gerekli' });
    } else {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const { baslangic, bitis } = req.query;

    // Stoktaki motorlar (satılmamış)
    const stoktakiler = await pool.query(
      `SELECT * FROM ikinci_el_motorlar
       WHERE yatirimci_id = $1 AND durum <> 'tamamlandi'
       ORDER BY created_at DESC`,
      [yatirimciId]
    );

    // Satılan motorlar (tarih filtresi opsiyonel)
    let satisQuery = `SELECT * FROM ikinci_el_motorlar
       WHERE yatirimci_id = $1 AND durum = 'tamamlandi'`;
    const satisParams = [yatirimciId];
    if (baslangic) { satisParams.push(baslangic); satisQuery += ` AND DATE(COALESCE(satis_tarihi, tamamlama_tarihi)) >= $${satisParams.length}`; }
    if (bitis) { satisParams.push(bitis); satisQuery += ` AND DATE(COALESCE(satis_tarihi, tamamlama_tarihi)) <= $${satisParams.length}`; }
    satisQuery += ` ORDER BY COALESCE(satis_tarihi, tamamlama_tarihi) DESC`;
    const satilanlar = await pool.query(satisQuery, satisParams);

    const toplamYatirimciKar = satilanlar.rows.reduce((t, r) => t + parseFloat(r.yatirimci_kar || 0), 0);
    const toplamSatis = satilanlar.rows.reduce((t, r) => t + parseFloat(r.satis_fiyati || 0), 0);
    const toplamAlis = satilanlar.rows.reduce((t, r) => t + parseFloat(r.alis_fiyati || 0), 0);
    const stokDegeri = stoktakiler.rows.reduce((t, r) => t + parseFloat(r.alis_fiyati || 0), 0);

    res.json({
      stoktakiler: stoktakiler.rows,
      satilanlar: satilanlar.rows,
      ozet: {
        stok_adet: stoktakiler.rows.length,
        satilan_adet: satilanlar.rows.length,
        toplam_yatirimci_kar: toplamYatirimciKar,
        toplam_satis: toplamSatis,
        toplam_alis: toplamAlis,
        stok_degeri: stokDegeri
      }
    });
  } catch (error) {
    console.error('Yatırımcı rapor hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /yatirimci-ozet [ADMIN] - Yatırımcı bazlı özet liste
router.get('/yatirimci-ozet', engelleYatirimci, async (req, res) => {
  try {
    const { baslangic, bitis } = req.query;
    const result = await pool.query(`
      SELECT k.id, k.ad_soyad, k.kullanici_adi,
        COUNT(*) FILTER (WHERE m.durum <> 'tamamlandi') AS stok_adet,
        COUNT(*) FILTER (
          WHERE m.durum = 'tamamlandi'
            AND ($1::date IS NULL OR DATE(COALESCE(m.satis_tarihi, m.tamamlama_tarihi)) >= $1::date)
            AND ($2::date IS NULL OR DATE(COALESCE(m.satis_tarihi, m.tamamlama_tarihi)) <= $2::date)
        ) AS satilan_adet,
        COALESCE(SUM(m.alis_fiyati) FILTER (WHERE m.durum <> 'tamamlandi'), 0) AS stok_degeri,
        COALESCE(SUM(m.satis_fiyati) FILTER (
          WHERE m.durum = 'tamamlandi'
            AND ($1::date IS NULL OR DATE(COALESCE(m.satis_tarihi, m.tamamlama_tarihi)) >= $1::date)
            AND ($2::date IS NULL OR DATE(COALESCE(m.satis_tarihi, m.tamamlama_tarihi)) <= $2::date)
        ), 0) AS toplam_satis,
        COALESCE(SUM(m.yatirimci_kar) FILTER (
          WHERE m.durum = 'tamamlandi'
            AND ($1::date IS NULL OR DATE(COALESCE(m.satis_tarihi, m.tamamlama_tarihi)) >= $1::date)
            AND ($2::date IS NULL OR DATE(COALESCE(m.satis_tarihi, m.tamamlama_tarihi)) <= $2::date)
        ), 0) AS yatirimci_kar,
        COALESCE(SUM(COALESCE(m.kar, 0) - COALESCE(m.yatirimci_kar, 0)) FILTER (
          WHERE m.durum = 'tamamlandi'
            AND ($1::date IS NULL OR DATE(COALESCE(m.satis_tarihi, m.tamamlama_tarihi)) >= $1::date)
            AND ($2::date IS NULL OR DATE(COALESCE(m.satis_tarihi, m.tamamlama_tarihi)) <= $2::date)
        ), 0) AS isletme_kar
      FROM kullanicilar k
      LEFT JOIN ikinci_el_motorlar m ON m.yatirimci_id = k.id
      WHERE k.rol = 'yatirimci'
      GROUP BY k.id, k.ad_soyad, k.kullanici_adi
      ORDER BY k.ad_soyad
    `, [baslangic || null, bitis || null]);
    res.json(result.rows);
  } catch (error) {
    console.error('Yatırımcı özet hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
