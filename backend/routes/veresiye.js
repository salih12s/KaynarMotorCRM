const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET / - Tüm açık borçları (kalan_odeme > 0) tek bir listede döndür
router.get('/', async (req, res) => {
  try {
    const sources = [];

    // Motor Satış
    const motor = await pool.query(`
      SELECT id, alici_adi AS musteri_adi, alici_telefon AS telefon,
             kalan_odeme, satis_fiyati AS toplam_tutar,
             COALESCE(satis_tarihi, tarih) AS tarih,
             plaka, marka, model, yil, km, odeme_sekli, alici_tc, alici_adres,
             alis_fiyati, noter_satis, fatura_kesildi, yevmiye_no, aciklama AS notlar,
             durum
      FROM ikinci_el_motorlar
      WHERE COALESCE(kalan_odeme, 0) > 0
      ORDER BY COALESCE(satis_tarihi, tarih) DESC
    `);
    motor.rows.forEach(r => sources.push({
      kaynak: 'Motor Satış',
      kaynak_key: 'motor',
      id: r.id,
      musteri_adi: r.musteri_adi || '-',
      telefon: r.telefon || '',
      kalan_odeme: parseFloat(r.kalan_odeme || 0),
      toplam_tutar: parseFloat(r.toplam_tutar || 0),
      tarih: r.tarih,
      aciklama: `${r.plaka || ''} ${r.marka || ''} ${r.model || ''}`.trim(),
      detay: {
        plaka: r.plaka, marka: r.marka, model: r.model, yil: r.yil, km: r.km,
        odeme_sekli: r.odeme_sekli, alici_tc: r.alici_tc, alici_adres: r.alici_adres,
        alis_fiyati: parseFloat(r.alis_fiyati || 0),
        noter_satis: parseFloat(r.noter_satis || 0),
        fatura_kesildi: r.fatura_kesildi, yevmiye_no: r.yevmiye_no,
        notlar: r.notlar, durum: r.durum
      }
    }));

    // Servis (İş Emirleri)
    const servis = await pool.query(`
      SELECT ie.id, ie.fis_no, ie.musteri_ad_soyad AS musteri_adi, ie.telefon, ie.adres,
             ie.kalan_odeme, ie.gercek_toplam_ucret AS toplam_tutar,
             COALESCE(ie.tamamlama_tarihi, ie.created_at) AS tarih,
             ie.marka, ie.model_tip, ie.km, ie.ariza_sikayetler, ie.aciklama AS notlar,
             ie.odeme_detaylari, ie.durum, ie.tahmini_toplam_ucret,
             COALESCE(json_agg(json_build_object(
               'takilan_parca', p.takilan_parca, 'adet', p.adet,
               'birim_fiyat', p.birim_fiyat, 'toplam_fiyat', p.toplam_fiyat
             )) FILTER (WHERE p.id IS NOT NULL), '[]') AS parcalar
      FROM is_emirleri ie
      LEFT JOIN parcalar p ON p.is_emri_id = ie.id
      WHERE COALESCE(ie.kalan_odeme, 0) > 0
      GROUP BY ie.id
      ORDER BY COALESCE(ie.tamamlama_tarihi, ie.created_at) DESC
    `);
    servis.rows.forEach(r => sources.push({
      kaynak: 'Servis',
      kaynak_key: 'servis',
      id: r.id,
      fis_no: r.fis_no,
      musteri_adi: r.musteri_adi || '-',
      telefon: r.telefon || '',
      kalan_odeme: parseFloat(r.kalan_odeme || 0),
      toplam_tutar: parseFloat(r.toplam_tutar || 0),
      tarih: r.tarih,
      aciklama: `Fiş #${r.fis_no} • ${r.marka || ''} ${r.model_tip || ''}`.trim(),
      detay: {
        fis_no: r.fis_no, marka: r.marka, model_tip: r.model_tip, km: r.km,
        adres: r.adres, ariza_sikayetler: r.ariza_sikayetler, notlar: r.notlar,
        odeme_detaylari: r.odeme_detaylari, durum: r.durum,
        tahmini_toplam_ucret: parseFloat(r.tahmini_toplam_ucret || 0),
        parcalar: r.parcalar
      }
    }));

    // Aksesuar
    const aksesuar = await pool.query(`
      SELECT a.id, a.ad_soyad AS musteri_adi, a.telefon,
             a.kalan_odeme, a.toplam_satis AS toplam_tutar,
             COALESCE(a.satis_tarihi, a.created_at) AS tarih,
             a.aciklama AS notlar, a.odeme_sekli, a.odeme_detaylari, a.durum,
             COALESCE(json_agg(json_build_object(
               'urun_adi', ap.urun_adi, 'adet', ap.adet,
               'satis_fiyati', ap.satis_fiyati
             )) FILTER (WHERE ap.id IS NOT NULL), '[]') AS parcalar
      FROM aksesuarlar a
      LEFT JOIN aksesuar_parcalar ap ON ap.aksesuar_id = a.id
      WHERE COALESCE(a.kalan_odeme, 0) > 0
      GROUP BY a.id
      ORDER BY COALESCE(a.satis_tarihi, a.created_at) DESC
    `);
    aksesuar.rows.forEach(r => sources.push({
      kaynak: 'Aksesuar',
      kaynak_key: 'aksesuar',
      id: r.id,
      musteri_adi: r.musteri_adi || '-',
      telefon: r.telefon || '',
      kalan_odeme: parseFloat(r.kalan_odeme || 0),
      toplam_tutar: parseFloat(r.toplam_tutar || 0),
      tarih: r.tarih,
      aciklama: (r.parcalar && r.parcalar.length ? r.parcalar.map(x => x.urun_adi).filter(Boolean).join(', ') : '') || r.notlar || '',
      detay: {
        odeme_sekli: r.odeme_sekli, odeme_detaylari: r.odeme_detaylari,
        durum: r.durum, notlar: r.notlar, parcalar: r.parcalar
      }
    }));

    // Yedek Parça
    const yedek = await pool.query(`
      SELECT id, musteri_adi, musteri_telefon AS telefon,
             kalan_odeme, satis_fiyati AS toplam_tutar,
             alis_fiyati, created_at AS tarih, urun_adi
      FROM yedek_parcalar
      WHERE COALESCE(kalan_odeme, 0) > 0
      ORDER BY created_at DESC
    `);
    yedek.rows.forEach(r => sources.push({
      kaynak: 'Yedek Parça',
      kaynak_key: 'yedek_parca',
      id: r.id,
      musteri_adi: r.musteri_adi || '-',
      telefon: r.telefon || '',
      kalan_odeme: parseFloat(r.kalan_odeme || 0),
      toplam_tutar: parseFloat(r.toplam_tutar || 0),
      tarih: r.tarih,
      aciklama: r.urun_adi || '',
      detay: {
        urun_adi: r.urun_adi,
        alis_fiyati: parseFloat(r.alis_fiyati || 0),
        satis_fiyati: parseFloat(r.toplam_tutar || 0)
      }
    }));

    // Tarihe göre sırala (en yeni önce)
    sources.sort((a, b) => {
      const da = a.tarih ? new Date(a.tarih).getTime() : 0;
      const db = b.tarih ? new Date(b.tarih).getTime() : 0;
      return db - da;
    });

    const toplamBorc = sources.reduce((s, x) => s + (x.kalan_odeme || 0), 0);
    const ozet = {
      motor: sources.filter(s => s.kaynak_key === 'motor').reduce((s, x) => s + x.kalan_odeme, 0),
      servis: sources.filter(s => s.kaynak_key === 'servis').reduce((s, x) => s + x.kalan_odeme, 0),
      aksesuar: sources.filter(s => s.kaynak_key === 'aksesuar').reduce((s, x) => s + x.kalan_odeme, 0),
      yedek_parca: sources.filter(s => s.kaynak_key === 'yedek_parca').reduce((s, x) => s + x.kalan_odeme, 0),
      toplam: toplamBorc,
      kayit_sayisi: sources.length,
    };

    res.json({ borclar: sources, ozet });
  } catch (error) {
    console.error('Veresiye listeleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
