const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Müşteriye açık servis geçmişi — QR token ile erişilir, giriş gerektirmez.
// Sadece o plakaya ait servis kayıtları döner: tarih, yapılan işlemler ve toplam tutar.
// Maliyet, kâr, müşteri iletişim bilgileri gibi alanlar asla dönülmez.
router.get('/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ message: 'Geçersiz bağlantı' });

    const tokenResult = await pool.query('SELECT plaka FROM servis_qr_tokenler WHERE token = $1', [token]);
    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ message: 'Geçersiz veya süresi dolmuş bağlantı' });
    }
    const plaka = tokenResult.rows[0].plaka;

    // Plakayı normalize ederek eşleştir (büyük/küçük harf ve boşluk farkları sorun olmasın)
    const servisler = await pool.query(
      `SELECT id, fis_no, plaka, marka, model_tip, km, durum, created_at, teslim_tarihi, tamamlama_tarihi, gercek_toplam_ucret
       FROM is_emirleri
       WHERE regexp_replace(upper(COALESCE(plaka, '')), '[^A-Z0-9]', '', 'g') = $1
       ORDER BY created_at DESC`,
      [plaka]
    );

    const ids = servisler.rows.map(s => s.id);
    let parcalar = [];
    if (ids.length > 0) {
      const parcaResult = await pool.query(
        'SELECT is_emri_id, takilan_parca, adet FROM parcalar WHERE is_emri_id = ANY($1) ORDER BY id',
        [ids]
      );
      parcalar = parcaResult.rows;
    }

    res.json({
      plaka,
      servisler: servisler.rows.map(s => ({
        fis_no: s.fis_no,
        plaka: s.plaka,
        marka: s.marka,
        model_tip: s.model_tip,
        km: s.km,
        durum: s.durum,
        tarih: s.created_at,
        teslim_tarihi: s.teslim_tarihi,
        tamamlama_tarihi: s.tamamlama_tarihi,
        toplam_tutar: s.gercek_toplam_ucret,
        islemler: parcalar
          .filter(p => p.is_emri_id === s.id)
          .map(p => ({ islem: p.takilan_parca, adet: p.adet })),
      })),
    });
  } catch (error) {
    console.error('Servis geçmişi hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
