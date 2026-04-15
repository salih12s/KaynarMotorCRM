const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { logAktivite, ISLEM_TIPLERI } = require('../config/activityLogger');

// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token gerekli' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Geçersiz token' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ message: 'Admin yetkisi gerekli' });
  next();
};

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { kullanici_adi, sifre, ad_soyad } = req.body;
    if (!kullanici_adi || !sifre || !ad_soyad) {
      return res.status(400).json({ message: 'Tüm alanlar zorunludur' });
    }

    const existing = await pool.query('SELECT id FROM kullanicilar WHERE kullanici_adi = $1', [kullanici_adi]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    const hashedPassword = await bcrypt.hash(sifre, 10);
    const result = await pool.query(
      `INSERT INTO kullanicilar (kullanici_adi, sifre, plain_sifre, ad_soyad)
       VALUES ($1, $2, $3, $4) RETURNING id, kullanici_adi, ad_soyad, rol, onay_durumu`,
      [kullanici_adi, hashedPassword, sifre, ad_soyad]
    );

    await logAktivite({
      kullanici_id: result.rows[0].id,
      kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.REGISTER,
      islem_detay: `${ad_soyad} kayıt oldu`,
      ip_adresi: req.ip
    });

    res.status(201).json({ message: 'Kayıt başarılı. Admin onayı bekleniyor.', user: result.rows[0] });
  } catch (error) {
    console.error('Register hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { kullanici_adi, sifre } = req.body;
    const result = await pool.query('SELECT * FROM kullanicilar WHERE kullanici_adi = $1', [kullanici_adi]);

    if (result.rows.length === 0) {
      await logAktivite({ kullanici_adi, islem_tipi: ISLEM_TIPLERI.LOGIN_FAILED, islem_detay: 'Kullanıcı bulunamadı', ip_adresi: req.ip });
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
    }

    const user = result.rows[0];

    if (user.onay_durumu !== 'onaylandi') {
      return res.status(403).json({ message: 'Hesabınız henüz onaylanmadı' });
    }

    const isValid = await bcrypt.compare(sifre, user.sifre);
    if (!isValid) {
      await logAktivite({ kullanici_id: user.id, kullanici_adi, islem_tipi: ISLEM_TIPLERI.LOGIN_FAILED, islem_detay: 'Yanlış şifre', ip_adresi: req.ip });
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
    }

    const token = jwt.sign(
      { id: user.id, kullanici_adi: user.kullanici_adi, rol: user.rol, ad_soyad: user.ad_soyad, aksesuar_yetkisi: user.aksesuar_yetkisi, motor_satis_yetkisi: user.motor_satis_yetkisi, eticaret_yetkisi: user.eticaret_yetkisi, servis_yetkisi: user.servis_yetkisi, aksesuar_stok_yetkisi: user.aksesuar_stok_yetkisi, yedek_parca_yetkisi: user.yedek_parca_yetkisi },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAktivite({ kullanici_id: user.id, kullanici_adi, islem_tipi: ISLEM_TIPLERI.LOGIN, islem_detay: 'Giriş yapıldı', ip_adresi: req.ip });

    res.json({
      token,
      user: { id: user.id, kullanici_adi: user.kullanici_adi, ad_soyad: user.ad_soyad, rol: user.rol, aksesuar_yetkisi: user.aksesuar_yetkisi, motor_satis_yetkisi: user.motor_satis_yetkisi, eticaret_yetkisi: user.eticaret_yetkisi, servis_yetkisi: user.servis_yetkisi, aksesuar_stok_yetkisi: user.aksesuar_stok_yetkisi, yedek_parca_yetkisi: user.yedek_parca_yetkisi }
    });
  } catch (error) {
    console.error('Login hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await logAktivite({ kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.LOGOUT, islem_detay: 'Çıkış yapıldı', ip_adresi: req.ip });
    res.json({ message: 'Çıkış başarılı' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /verify
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, kullanici_adi, ad_soyad, rol, aksesuar_yetkisi, motor_satis_yetkisi, eticaret_yetkisi, servis_yetkisi, aksesuar_stok_yetkisi, yedek_parca_yetkisi FROM kullanicilar WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /users [ADMIN]
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, kullanici_adi, ad_soyad, rol, onay_durumu, aksesuar_yetkisi, motor_satis_yetkisi, eticaret_yetkisi, servis_yetkisi, aksesuar_stok_yetkisi, yedek_parca_yetkisi, plain_sifre, created_at FROM kullanicilar ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/approve [ADMIN]
router.patch('/users/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE kullanicilar SET onay_durumu = 'onaylandi' WHERE id = $1", [req.params.id]);
    await logAktivite({ kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.APPROVE, islem_detay: `Kullanıcı #${req.params.id} onaylandı`, hedef_tablo: 'kullanicilar', hedef_id: parseInt(req.params.id) });
    res.json({ message: 'Kullanıcı onaylandı' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/reject [ADMIN]
router.patch('/users/:id/reject', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE kullanicilar SET onay_durumu = 'reddedildi' WHERE id = $1", [req.params.id]);
    await logAktivite({ kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.REJECT, islem_detay: `Kullanıcı #${req.params.id} reddedildi`, hedef_tablo: 'kullanicilar', hedef_id: parseInt(req.params.id) });
    res.json({ message: 'Kullanıcı reddedildi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /users/:id [ADMIN]
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'Kendinizi silemezsiniz' });
    }
    await pool.query('DELETE FROM kullanicilar WHERE id = $1', [req.params.id]);
    res.json({ message: 'Kullanıcı silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/aksesuar-yetkisi [ADMIN]
router.patch('/users/:id/aksesuar-yetkisi', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { aksesuar_yetkisi } = req.body;
    await pool.query('UPDATE kullanicilar SET aksesuar_yetkisi = $1 WHERE id = $2', [aksesuar_yetkisi, req.params.id]);
    res.json({ message: 'Aksesuar yetkisi güncellendi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/motor-satis-yetkisi [ADMIN]
router.patch('/users/:id/motor-satis-yetkisi', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { motor_satis_yetkisi } = req.body;
    await pool.query('UPDATE kullanicilar SET motor_satis_yetkisi = $1 WHERE id = $2', [motor_satis_yetkisi, req.params.id]);
    res.json({ message: 'Motor satış yetkisi güncellendi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/eticaret-yetkisi [ADMIN]
router.patch('/users/:id/eticaret-yetkisi', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { eticaret_yetkisi } = req.body;
    await pool.query('UPDATE kullanicilar SET eticaret_yetkisi = $1 WHERE id = $2', [eticaret_yetkisi, req.params.id]);
    res.json({ message: 'E-ticaret yetkisi güncellendi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/servis-yetkisi [ADMIN]
router.patch('/users/:id/servis-yetkisi', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { servis_yetkisi } = req.body;
    await pool.query('UPDATE kullanicilar SET servis_yetkisi = $1 WHERE id = $2', [servis_yetkisi, req.params.id]);
    res.json({ message: 'Servis yetkisi güncellendi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/aksesuar-stok-yetkisi [ADMIN]
router.patch('/users/:id/aksesuar-stok-yetkisi', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { aksesuar_stok_yetkisi } = req.body;
    await pool.query('UPDATE kullanicilar SET aksesuar_stok_yetkisi = $1 WHERE id = $2', [aksesuar_stok_yetkisi, req.params.id]);
    res.json({ message: 'Aksesuar stok yetkisi güncellendi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/yedek-parca-yetkisi [ADMIN]
router.patch('/users/:id/yedek-parca-yetkisi', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { yedek_parca_yetkisi } = req.body;
    await pool.query('UPDATE kullanicilar SET yedek_parca_yetkisi = $1 WHERE id = $2', [yedek_parca_yetkisi, req.params.id]);
    res.json({ message: 'Yedek parça yetkisi güncellendi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /activity-logs [ADMIN]
router.get('/activity-logs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aktivite_log ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /users/:id/activity-logs [ADMIN]
router.get('/users/:id/activity-logs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aktivite_log WHERE kullanici_id = $1 ORDER BY created_at DESC LIMIT 100', [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
