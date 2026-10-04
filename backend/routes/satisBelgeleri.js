const express = require('express');
const path = require('path');
const router = express.Router();
const { pool } = require('../config/db');
const { logAktivite, ISLEM_TIPLERI } = require('../config/activityLogger');

const MAX_BOYUT = 10 * 1024 * 1024; // dosya başına 10 MB
const MAX_ADET = 30; // satış başına

const baslar = (buf, bytes) => bytes.every((b, i) => buf[i] === b);
const OLE2 = [0xD0, 0xCF, 0x11, 0xE0]; // eski .doc / .xls
const ZIP = [0x50, 0x4B]; // .docx / .xlsx (zip kapsayıcı)

// İzin verilen türler. mime istemciden alınmaz, uzantıdan çıkarılır; ayrıca dosyanın
// ilk baytları uzantıyla uyuşmalı (adı değiştirilmiş zararlı dosya girmesin).
const TURLER = {
  pdf: { mime: 'application/pdf', gecerli: (b) => b.subarray(0, 1024).includes('%PDF') },
  doc: { mime: 'application/msword', gecerli: (b) => baslar(b, OLE2) },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', gecerli: (b) => baslar(b, ZIP) },
  xls: { mime: 'application/vnd.ms-excel', gecerli: (b) => baslar(b, OLE2) },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', gecerli: (b) => baslar(b, ZIP) },
  jpg: { mime: 'image/jpeg', gecerli: (b) => baslar(b, [0xFF, 0xD8, 0xFF]) },
  jpeg: { mime: 'image/jpeg', gecerli: (b) => baslar(b, [0xFF, 0xD8, 0xFF]) },
  png: { mime: 'image/png', gecerli: (b) => baslar(b, [0x89, 0x50, 0x4E, 0x47]) },
};

const temizAd = (s) => String(s || '').replace(/[\\/\u0000-\u001f<>:"|?*]+/g, '_').trim().slice(0, 200) || 'belge';
const pozitifId = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

// Sözleşmelerde TC kimlik gibi kişisel veri olur: satış sayfasına girebilenler (admin veya
// Motor Satış yetkilisi) görür/yükler/siler. Yatırımcı ve diğer personel erişemez.
router.use((req, res, next) => {
  const u = req.user || {};
  if (u.rol === 'admin' || u.motor_satis_yetkisi) return next();
  return res.status(403).json({ message: 'Satış belgelerine erişim yetkiniz yok' });
});

// GET /motor/:motorId - bir satışın belge listesi (dosya içeriği YOK, yalnızca bilgi)
router.get('/motor/:motorId', async (req, res) => {
  const motorId = pozitifId(req.params.motorId);
  if (!motorId) return res.status(400).json({ message: 'Geçersiz satış' });
  try {
    const result = await pool.query(
      `SELECT id, motor_id, dosya_adi, mime, boyut, yukleyen_adi, created_at
       FROM satis_belgeleri WHERE motor_id = $1 ORDER BY created_at ASC, id ASC`, [motorId]);
    res.json(result.rows);
  } catch (e) {
    console.error('Satış belge listesi hatası:', e.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /motor/:motorId?ad=dosya.pdf - ham dosya gövdesi (Content-Type: application/octet-stream)
// Yetki kontrolü yukarıda yapıldığı için gövde (10 MB'a kadar) ancak yetkili isteklerde okunur.
router.post('/motor/:motorId', express.raw({ type: () => true, limit: MAX_BOYUT }), async (req, res) => {
  const motorId = pozitifId(req.params.motorId);
  if (!motorId) return res.status(400).json({ message: 'Geçersiz satış' });
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || buf.length === 0) return res.status(400).json({ message: 'Dosya boş veya okunamadı' });

  const dosyaAdi = temizAd(req.query.ad);
  const tur = TURLER[path.extname(dosyaAdi).slice(1).toLowerCase()];
  if (!tur) return res.status(400).json({ message: 'Desteklenmeyen dosya türü (PDF, Word, Excel, JPG, PNG kabul edilir)' });
  if (!tur.gecerli(buf)) return res.status(400).json({ message: 'Dosya içeriği uzantısıyla uyuşmuyor' });

  try {
    const motor = await pool.query(
      `SELECT m.id, (SELECT COUNT(*)::int FROM satis_belgeleri b WHERE b.motor_id = m.id) AS adet
       FROM ikinci_el_motorlar m WHERE m.id = $1`, [motorId]);
    if (motor.rows.length === 0) return res.status(404).json({ message: 'Satış kaydı bulunamadı' });
    if (motor.rows[0].adet >= MAX_ADET) return res.status(400).json({ message: `Bir satışa en fazla ${MAX_ADET} belge eklenebilir` });

    const ins = await pool.query(
      `INSERT INTO satis_belgeleri (motor_id, dosya_adi, mime, boyut, icerik, yukleyen_id, yukleyen_adi)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, motor_id, dosya_adi, mime, boyut, yukleyen_adi, created_at`,
      [motorId, dosyaAdi, tur.mime, buf.length, buf, req.user.id || null, req.user.kullanici_adi || null]);

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_GUNCELLE,
      islem_detay: `2. El Motor #${motorId}: belge eklendi (${dosyaAdi})`,
      hedef_tablo: 'ikinci_el_motorlar', hedef_id: motorId
    });
    res.status(201).json(ins.rows[0]);
  } catch (e) {
    console.error('Satış belgesi yükleme hatası:', e.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id/indir - dosyayı indir
router.get('/:id/indir', async (req, res) => {
  const id = pozitifId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Geçersiz belge' });
  try {
    const r = await pool.query('SELECT dosya_adi, mime, icerik FROM satis_belgeleri WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Belge bulunamadı' });
    const { dosya_adi: ad, mime, icerik } = r.rows[0];
    res.set({
      'Content-Type': mime,
      'Content-Length': icerik.length,
      'Content-Disposition': `attachment; filename="${ad.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(ad)}`,
      'Cache-Control': 'private, no-store',
    });
    res.end(icerik);
  } catch (e) {
    console.error('Satış belgesi indirme hatası:', e.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /:id - belgeyi sil
router.delete('/:id', async (req, res) => {
  const id = pozitifId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Geçersiz belge' });
  try {
    const r = await pool.query('DELETE FROM satis_belgeleri WHERE id = $1 RETURNING motor_id, dosya_adi', [id]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Belge bulunamadı' });
    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_GUNCELLE,
      islem_detay: `2. El Motor #${r.rows[0].motor_id}: belge silindi (${r.rows[0].dosya_adi})`,
      hedef_tablo: 'ikinci_el_motorlar', hedef_id: r.rows[0].motor_id
    });
    res.json({ message: 'Belge silindi' });
  } catch (e) {
    console.error('Satış belgesi silme hatası:', e.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
