const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logAktivite, ISLEM_TIPLERI } = require('../config/activityLogger');
const { upsertMusteri } = require('../config/musteriHelper');

const emptyToZero = (v) => { if (v === '' || v === undefined || v === null) return 0; const n = Number(v); return isNaN(n) ? 0 : n; };
// Parçalı ödeme dağılımını JSON string olarak normalize eder
const normalizeOdeme = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return null; }
};

// Bir motor kaydını kullanıcının yetkisine göre temizler (hassas alanları gizler)
const sanitizeMotor = (row, user) => {
  if (!row) return row;
  // Admin her şeyi görür
  if (user.rol === 'admin') return row;
  // Yatırımcı:
  //  - liste_fiyati_gor AÇIK ise "vitrin" modundadır: tüm satılık motorları SADECE liste fiyatıyla görür
  //  - kapalı ise kendi motorlarını tam detayıyla görür
  if (user.rol === 'yatirimci') {
    if (!user.liste_fiyati_gor) return row;
    return {
      id: row.id, plaka: row.plaka, marka: row.marka, model: row.model,
      yil: row.yil, km: row.km, durum: row.durum, stok_tipi: row.stok_tipi,
      tarih: row.tarih, liste_fiyati: row.liste_fiyati,
      // Hassas alanlar gizli
      alis_fiyati: null, noter_alis: null, satis_fiyati: null, noter_satis: null,
      masraflar: null, kar: null, yatirimci_id: null, yatirimci_kar: null, yatirimci_kar_orani: null,
      satici_adi: null, satici_tc: null, alici_adi: null, alici_tc: null,
      alici_telefon: null, alici_adres: null,
      komisyoncu_adi: null, komisyoncu_telefon: null, komisyoncu_tutari: null
    };
  }

  const m = { ...row };
  // Motor Satış yetkisi; satış fiyatı, alış fiyatı, müşteri bilgisi ve satış geçmişini kapsar (Kâr HARİÇ — yalnızca admin)
  const ms = !!user.motor_satis_yetkisi;
  // Yalnızca "Kâr" admine özeldir. Alış fiyatı, noter alış/satış ve satış fiyatı motor satış yetkisinde görünür/düzenlenebilir.
  if (!(user.alis_fiyati_gor || ms)) { m.alis_fiyati = null; }
  if (!(user.satis_fiyati_gor || ms)) { m.satis_fiyati = null; m.noter_satis = null; m.noter_alis = null; }
  if (!user.kar_gor) { m.kar = null; m.yatirimci_kar = null; m.yatirimci_kar_orani = null; }
  if (!(user.musteri_gor || ms)) {
    m.alici_adi = null; m.alici_tc = null; m.alici_telefon = null; m.alici_adres = null;
    m.satici_adi = null; m.satici_tc = null;
    m.komisyoncu_adi = null; m.komisyoncu_telefon = null; m.komisyoncu_tutari = null;
  }
  if (!user.liste_fiyati_gor) m.liste_fiyati = null;
  return m;
};

// GET /stats/ozet
router.get('/stats/ozet', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE durum = 'tamamlandi') as toplam,
        COALESCE(SUM(satis_fiyati) FILTER (WHERE durum = 'tamamlandi'), 0) as toplam_satis,
        COALESCE(SUM(alis_fiyati) FILTER (WHERE durum = 'tamamlandi'), 0) as toplam_alis,
        COALESCE(SUM(kar) FILTER (WHERE durum = 'tamamlandi'), 0) as toplam_kar,
        COALESCE(SUM(satis_fiyati) FILTER (WHERE durum = 'tamamlandi'), 0) as toplam_satis_tutari,
        COUNT(CASE WHEN durum = 'beklemede' THEN 1 END) as bekleyen,
        COUNT(CASE WHEN durum = 'tamamlandi' THEN 1 END) as tamamlanan
      FROM ikinci_el_motorlar
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

    // Yatırımcı:
    if (req.user.rol === 'yatirimci') {
      if (req.user.liste_fiyati_gor) {
        // Vitrin modu: satılan/perte hariç tüm satılık motorlar (sadece liste fiyatı görünür)
        query += ` AND durum NOT IN ('tamamlandi', 'perte')`;
      } else {
        // Kendi motorları
        params.push(req.user.id);
        query += ` AND yatirimci_id = $${params.length}`;
      }
    } else if (req.user.rol !== 'admin' && !req.user.satis_gecmisi_gor && !req.user.motor_satis_yetkisi) {
      // Satış geçmişi/motor satış yetkisi olmayan personel satılan motorları görmez
      query += ` AND durum <> 'tamamlandi'`;
    }

    query += ' ORDER BY COALESCE(tamamlama_tarihi, created_at) DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(r => sanitizeMotor(r, req.user)));
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ikinci_el_motorlar WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });
    const row = result.rows[0];
    // Yatırımcı (vitrin modu hariç) başka birine ait motoru göremez
    if (req.user.rol === 'yatirimci' && !req.user.liste_fiyati_gor && row.yatirimci_id !== req.user.id) {
      return res.status(403).json({ message: 'Bu kayda erişim yetkiniz yok' });
    }
    res.json(sanitizeMotor(row, req.user));
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
      yil, satici_adi, satici_tc, kalan_odeme, fatura_kesildi, yevmiye_no, satis_tarihi,
      komisyoncu_adi, komisyoncu_telefon, komisyoncu_tutari,
      yatirimci_id, yatirimci_kar_orani, yatirimci_kar, liste_fiyati, odeme_detaylari,
      vitrin_baslik, vitrin_aciklama, vitrin_segment, vitrin_cc, vitrin_fiyat, vitrin_hasar
    } = req.body;

    const alis = emptyToZero(alis_fiyati);
    const satis = emptyToZero(satis_fiyati);
    const nAlis = emptyToZero(noter_alis);
    const nSatis = emptyToZero(noter_satis);
    const masraf = emptyToZero(masraflar);
    const komisyonTutar = emptyToZero(komisyoncu_tutari);
    const kar = satis - alis - masraf - komisyonTutar;
    const odemeDetay = normalizeOdeme(odeme_detaylari);
    const yatirimciId = yatirimci_id ? parseInt(yatirimci_id) : null;
    const yatirimciOran = yatirimciId ? emptyToZero(yatirimci_kar_orani) : 0;
    // Yatırımcı kârı artık satış esnasında elle (tutar olarak) girilir; komisyoncu gibi işletme kârından düşer
    const yatirimciKar = yatirimciId ? emptyToZero(yatirimci_kar) : 0;
    const listeFiyati = emptyToZero(liste_fiyati);
    const tamamlamaTarihi = durum === 'tamamlandi' ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO ikinci_el_motorlar (tarih, plaka, marka, model, km, alis_fiyati, satis_fiyati, noter_alis, noter_satis, masraflar, kar,
        alici_adi, alici_tc, alici_telefon, alici_adres, odeme_sekli, aciklama, durum, tamamlama_tarihi, stok_tipi,
        yil, satici_adi, satici_tc, kalan_odeme, fatura_kesildi, yevmiye_no, satis_tarihi,
        komisyoncu_adi, komisyoncu_telefon, komisyoncu_tutari,
        yatirimci_id, yatirimci_kar_orani, yatirimci_kar, liste_fiyati, odeme_detaylari,
        vitrin_baslik, vitrin_aciklama, vitrin_segment, vitrin_cc, vitrin_fiyat, vitrin_hasar)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41) RETURNING *`,
      [tarih || new Date(), plaka, marka, model, emptyToZero(km), alis, satis, nAlis, nSatis, masraf, kar,
       alici_adi, alici_tc, alici_telefon, alici_adres, odeme_sekli || 'nakit', aciklama, durum || 'stokta', tamamlamaTarihi, stok_tipi || 'sahip',
       emptyToZero(yil) || null, satici_adi || null, satici_tc || null, emptyToZero(kalan_odeme), fatura_kesildi || false, yevmiye_no || null, satis_tarihi || null,
       komisyoncu_adi || null, komisyoncu_telefon || null, komisyonTutar,
       yatirimciId, yatirimciOran, yatirimciKar, listeFiyati, odemeDetay,
       vitrin_baslik || null, vitrin_aciklama || null, vitrin_segment || null, emptyToZero(vitrin_cc) || null, emptyToZero(vitrin_fiyat) || null, vitrin_hasar || null]
    );

    // Müşteri auto-collect
    if (satici_adi) await upsertMusteri(satici_adi, null, null);
    if (alici_adi) await upsertMusteri(alici_adi, alici_telefon, alici_adres);
    if (komisyoncu_adi) await upsertMusteri(komisyoncu_adi, komisyoncu_telefon, null);

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_OLUSTUR,
      islem_detay: `2. El Motor: ${plaka} - ${marka} ${model}`,
      hedef_tablo: 'ikinci_el_motorlar', hedef_id: result.rows[0].id
    });

    res.status(201).json(sanitizeMotor(result.rows[0], req.user));
  } catch (error) {
    console.error('Motor satış ekleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PUT /:id - Güncelle
router.put('/:id', async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM ikinci_el_motorlar WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });
    const mevcut = existing.rows[0];

    // Yatırımcı kendi motoru dışındakini güncelleyemez
    if (req.user.rol === 'yatirimci' && mevcut.yatirimci_id !== req.user.id) {
      return res.status(403).json({ message: 'Bu kayda erişim yetkiniz yok' });
    }

    const isAdmin = req.user.rol === 'admin';
    const ms = !!req.user.motor_satis_yetkisi;
    const canAlis = isAdmin || req.user.alis_fiyati_gor || ms;
    const canKar = isAdmin || req.user.kar_gor;
    const canListe = isAdmin || req.user.liste_fiyati_gor;
    // Motor Satış yetkisi satış fiyatı ve müşteri bilgisini düzenlemeyi kapsar
    const canSatis = isAdmin || req.user.satis_fiyati_gor || ms;
    const canMusteri = isAdmin || req.user.musteri_gor || ms;

    const {
      tarih, plaka, marka, model, km,
      alis_fiyati, satis_fiyati, noter_alis, noter_satis, masraflar,
      alici_adi, alici_tc, alici_telefon, alici_adres,
      odeme_sekli, aciklama, durum, stok_tipi,
      yil, satici_adi, satici_tc, kalan_odeme, fatura_kesildi, yevmiye_no, eski_kayit, satis_tarihi,
      komisyoncu_adi, komisyoncu_telefon, komisyoncu_tutari,
      yatirimci_id, yatirimci_kar_orani, yatirimci_kar, liste_fiyati, odeme_detaylari,
      vitrin_baslik, vitrin_aciklama, vitrin_segment, vitrin_cc, vitrin_fiyat, vitrin_hasar
    } = req.body;
    // Ödeme dağılımı body'de yoksa mevcut değeri koru (kısmi güncellemeyi bozma)
    const odemeDetay = odeme_detaylari !== undefined ? normalizeOdeme(odeme_detaylari) : (mevcut.odeme_detaylari || null);

    // Hassas alanlar: yetkisi olmayan kullanıcının gönderdiği (boş/null) değerle veriyi bozmamak için DB değerini koru
    const alis = canAlis ? emptyToZero(alis_fiyati) : parseFloat(mevcut.alis_fiyati || 0);
    const nAlis = canSatis ? emptyToZero(noter_alis) : parseFloat(mevcut.noter_alis || 0);
    const satis = canSatis ? emptyToZero(satis_fiyati) : parseFloat(mevcut.satis_fiyati || 0);
    const nSatis = canSatis ? emptyToZero(noter_satis) : parseFloat(mevcut.noter_satis || 0);
    const masraf = emptyToZero(masraflar);
    // Müşteri/komisyon alanları: yetkisi olmayan personelin boş göndermesiyle veri bozulmasın
    const komisyonTutar = canMusteri ? emptyToZero(komisyoncu_tutari) : parseFloat(mevcut.komisyoncu_tutari || 0);
    const aliciAdi = canMusteri ? alici_adi : mevcut.alici_adi;
    const aliciTc = canMusteri ? alici_tc : mevcut.alici_tc;
    const aliciTel = canMusteri ? alici_telefon : mevcut.alici_telefon;
    const aliciAdres = canMusteri ? alici_adres : mevcut.alici_adres;
    const saticiAdi = canMusteri ? (satici_adi || null) : mevcut.satici_adi;
    const saticiTc = canMusteri ? (satici_tc || null) : mevcut.satici_tc;
    const komAdi = canMusteri ? (komisyoncu_adi || null) : mevcut.komisyoncu_adi;
    const komTel = canMusteri ? (komisyoncu_telefon || null) : mevcut.komisyoncu_telefon;
    const kar = satis - alis - masraf - komisyonTutar;
    const yatirimciId = canKar ? (yatirimci_id ? parseInt(yatirimci_id) : (yatirimci_id === null ? null : (mevcut.yatirimci_id || null))) : (mevcut.yatirimci_id || null);
    const yatirimciOran = canKar ? (yatirimciId ? emptyToZero(yatirimci_kar_orani) : 0) : parseFloat(mevcut.yatirimci_kar_orani || 0);
    // Yatırımcı kârı: satışta elle girilen tutar. Body'de yoksa (örn. stok düzenleme) mevcut değeri koru.
    const yatirimciKar = !yatirimciId ? 0
      : (canKar && yatirimci_kar !== undefined ? emptyToZero(yatirimci_kar) : parseFloat(mevcut.yatirimci_kar || 0));
    const listeFiyati = canListe ? emptyToZero(liste_fiyati) : parseFloat(mevcut.liste_fiyati || 0);
    const tamamlamaTarihi = (durum === 'tamamlandi' && mevcut.durum !== 'tamamlandi') ? new Date() : null;

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
        satis_tarihi=COALESCE($29, satis_tarihi),
        komisyoncu_adi=$30, komisyoncu_telefon=$31, komisyoncu_tutari=$32,
        yatirimci_id=$33, yatirimci_kar_orani=$34, yatirimci_kar=$35, liste_fiyati=$36,
        odeme_detaylari=$37,
        vitrin_baslik=$38, vitrin_aciklama=$39, vitrin_segment=$40, vitrin_cc=$41, vitrin_fiyat=$42, vitrin_hasar=$43,
        updated_at=CURRENT_TIMESTAMP WHERE id=$27 RETURNING *`,
      [tarih, plaka, marka, model, emptyToZero(km), alis, satis, nAlis, nSatis, masraf, kar,
       aliciAdi, aliciTc, aliciTel, aliciAdres, odeme_sekli, aciklama, durum,
       tamamlamaTarihi, stok_tipi || 'sahip', emptyToZero(yil) || null, saticiAdi, saticiTc,
       emptyToZero(kalan_odeme), fatura_kesildi || false, yevmiye_no || null, req.params.id,
       eski_kayit !== undefined ? eski_kayit : null, satis_tarihi || null,
       komAdi, komTel, komisyonTutar,
       yatirimciId, yatirimciOran, yatirimciKar, listeFiyati, odemeDetay,
       vitrin_baslik !== undefined ? (vitrin_baslik || null) : mevcut.vitrin_baslik,
       vitrin_aciklama !== undefined ? (vitrin_aciklama || null) : mevcut.vitrin_aciklama,
       vitrin_segment !== undefined ? (vitrin_segment || null) : mevcut.vitrin_segment,
       vitrin_cc !== undefined ? (emptyToZero(vitrin_cc) || null) : mevcut.vitrin_cc,
       vitrin_fiyat !== undefined ? (emptyToZero(vitrin_fiyat) || null) : mevcut.vitrin_fiyat,
       vitrin_hasar !== undefined ? (vitrin_hasar || null) : mevcut.vitrin_hasar]
    );

    // Motor yeni satıldıysa, bağlı vitrin/site ilanını otomatik yayından kaldır
    if (durum === 'tamamlandi' && mevcut.durum !== 'tamamlandi') {
      try {
        await pool.query('UPDATE vitrin_urunleri SET yayinda = FALSE, updated_at = CURRENT_TIMESTAMP WHERE stok_motor_id = $1', [req.params.id]);
      } catch (e) { console.error('Vitrin ilanı yayından kaldırma hatası:', e.message); }
    }

    // Müşteri auto-collect
    if (satici_adi) await upsertMusteri(satici_adi, null, null);
    if (alici_adi) await upsertMusteri(alici_adi, alici_telefon, alici_adres);
    if (komisyoncu_adi) await upsertMusteri(komisyoncu_adi, komisyoncu_telefon, null);

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_GUNCELLE,
      islem_detay: `2. El Motor #${req.params.id} güncellendi`,
      hedef_tablo: 'ikinci_el_motorlar', hedef_id: parseInt(req.params.id)
    });

    res.json(sanitizeMotor(result.rows[0], req.user));
  } catch (error) {
    console.error('Motor satış güncelleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /:id - Yalnızca admin silebilir
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ message: 'Silme yetkiniz yok' });
    }
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
