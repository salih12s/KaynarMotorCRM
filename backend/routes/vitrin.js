const express = require('express');
const { pool } = require('../config/db');

// Geçerli kategoriler
const KATEGORILER = ['motor', 'aksesuar', 'yedek_parca', 'bakim_servis', 'nakliye', 'sigorta'];

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);
const numOrNull = (v) => {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

// base64 data URL'i { mime, buffer } olarak çözer
const parseDataUrl = (data) => {
  if (!data || typeof data !== 'string') return null;
  const m = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
};

module.exports = (authenticateToken, isAdmin) => {
  const router = express.Router();
  const admin = [authenticateToken, isAdmin];

  // ---------- PUBLIC ----------

  // GET /segmentler - dinamik segment listesi
  router.get('/segmentler', async (req, res) => {
    try {
      const result = await pool.query('SELECT id, ad FROM vitrin_segmentler ORDER BY sira ASC, ad ASC');
      res.json(result.rows);
    } catch (e) {
      console.error('Vitrin segment hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // Yeni segment yoksa ekler (auto-grow); admin ilan eklerken kullanılır
  const ensureSegment = async (ad) => {
    if (!ad) return;
    try {
      const max = await pool.query('SELECT COALESCE(MAX(sira),0)+1 AS s FROM vitrin_segmentler');
      await pool.query('INSERT INTO vitrin_segmentler (ad, sira) VALUES ($1,$2) ON CONFLICT (ad) DO NOTHING', [ad, max.rows[0].s]);
    } catch { /* sessiz */ }
  };

  // Ürünün videosunu değiştir (eskiyi sil, yenisini ekle) — transaction client ile çağrılır
  const setVideo = async (client, urunId, videoData) => {
    const parsed = parseDataUrl(videoData);
    if (!parsed) return;
    await client.query('DELETE FROM vitrin_videolar WHERE urun_id = $1', [urunId]);
    const v = await client.query(
      'INSERT INTO vitrin_videolar (urun_id, data, mime) VALUES ($1,$2,$3) RETURNING id',
      [urunId, videoData, parsed.mime]
    );
    await client.query('UPDATE vitrin_urunleri SET video_dosya_id = $1 WHERE id = $2', [v.rows[0].id, urunId]);
  };

  // Ürünün videosunu kaldır
  const clearVideo = async (client, urunId) => {
    await client.query('DELETE FROM vitrin_videolar WHERE urun_id = $1', [urunId]);
    await client.query('UPDATE vitrin_urunleri SET video_dosya_id = NULL WHERE id = $1', [urunId]);
  };

  // GET /iletisim - tüm kategori iletişim kayıtları
  router.get('/iletisim', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM vitrin_kategori_iletisim');
      res.json(result.rows);
    } catch (e) {
      console.error('Vitrin iletişim hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // GET /gorsel/:id - görseli binary olarak servis et (tarayıcı önbelleğe alır)
  router.get('/gorsel/:id', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM vitrin_gorseller WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).send('Görsel bulunamadı');
      const parsed = parseDataUrl(result.rows[0].data);
      if (!parsed) return res.status(404).send('Geçersiz görsel');
      res.set('Content-Type', parsed.mime);
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(parsed.buffer);
    } catch (e) {
      console.error('Vitrin görsel hatası:', e.message);
      res.status(500).send('Sunucu hatası');
    }
  });

  // GET /video/:id - yüklenen videoyu HTTP Range destekli (akıcı) servis et
  router.get('/video/:id', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM vitrin_videolar WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).send('Video bulunamadı');
      const parsed = parseDataUrl(result.rows[0].data);
      if (!parsed) return res.status(404).send('Geçersiz video');
      const total = parsed.buffer.length;
      const range = req.headers.range;

      // Tarayıcı parça (Range) istediyse 206 ile sadece o aralığı gönder → kasmaz, sarılabilir
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m && m[1] ? parseInt(m[1], 10) : 0;
        let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
        if (isNaN(start) || start < 0) start = 0;
        if (isNaN(end) || end >= total) end = total - 1;
        if (start > end) { start = 0; end = total - 1; }
        const chunk = parsed.buffer.subarray(start, end + 1);
        res.status(206).set({
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunk.length,
          'Content-Type': parsed.mime,
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        return res.end(chunk);
      }

      res.set({
        'Content-Type': parsed.mime,
        'Content-Length': total,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      res.end(parsed.buffer);
    } catch (e) {
      console.error('Vitrin video hatası:', e.message);
      res.status(500).send('Sunucu hatası');
    }
  });

  // GET / - yayında olan ürünler (metadata + kapak_gorsel_id; base64 YOK)
  router.get('/', async (req, res) => {
    try {
      const { kategori, segment, cc_min, cc_max, km_max, marka, q, hepsi } = req.query;
      let query = `
        SELECT id, ilan_no, kategori, baslik, aciklama, fiyat, video_url, video_dosya_id, kapak_gorsel_id,
               marka, model, yil, segment, motor_cc, km, yayinda, siralama, one_cikan, stok_motor_id, created_at
        FROM vitrin_urunleri WHERE 1=1`;
      const params = [];

      // Public istek: sadece yayında olanlar. (admin yönetim için hepsi=1 + token gönderilebilir)
      if (!hepsi) query += ' AND yayinda = TRUE';

      if (kategori && KATEGORILER.includes(kategori)) { params.push(kategori); query += ` AND kategori = $${params.length}`; }
      if (segment) { params.push(segment); query += ` AND segment = $${params.length}`; }
      if (marka) { params.push(`%${marka}%`); query += ` AND marka ILIKE $${params.length}`; }
      if (cc_min) { params.push(Number(cc_min)); query += ` AND motor_cc >= $${params.length}`; }
      if (cc_max) { params.push(Number(cc_max)); query += ` AND motor_cc <= $${params.length}`; }
      if (km_max) { params.push(Number(km_max)); query += ` AND km <= $${params.length}`; }
      if (q) { params.push(`%${q}%`); query += ` AND (baslik ILIKE $${params.length} OR aciklama ILIKE $${params.length} OR marka ILIKE $${params.length} OR model ILIKE $${params.length})`; }

      query += ' ORDER BY one_cikan DESC, siralama ASC, created_at DESC';
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (e) {
      console.error('Vitrin liste hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // GET /:id - tek ürün + görsel id listesi
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, ilan_no, kategori, baslik, aciklama, fiyat, video_url, video_dosya_id, kapak_gorsel_id,
                marka, model, yil, segment, motor_cc, km, yayinda, siralama, one_cikan, stok_motor_id, created_at
         FROM vitrin_urunleri WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });
      const gorseller = await pool.query(
        'SELECT id FROM vitrin_gorseller WHERE urun_id = $1 ORDER BY sira ASC, id ASC', [req.params.id]);
      res.json({ ...result.rows[0], gorsel_idler: gorseller.rows.map(r => r.id) });
    } catch (e) {
      console.error('Vitrin detay hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // ---------- ADMIN ----------

  // POST / - ürün oluştur (gorseller: base64 data URL dizisi; ilki kapak)
  router.post('/', ...admin, async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        kategori, baslik, aciklama, fiyat, video_url,
        marka, model, yil, segment, motor_cc, km, yayinda, siralama, gorseller, video,
        one_cikan, stok_motor_id
      } = req.body;

      if (!KATEGORILER.includes(kategori)) return res.status(400).json({ message: 'Geçersiz kategori' });
      if (!baslik) return res.status(400).json({ message: 'Başlık zorunlu' });
      if (kategori === 'motor' && !segment) return res.status(400).json({ message: 'Motor ilanı için segment zorunlu' });

      if (segment) await ensureSegment(segment);
      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO vitrin_urunleri
          (kategori, baslik, aciklama, fiyat, video_url, marka, model, yil, segment, motor_cc, km, yayinda, siralama, one_cikan, stok_motor_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id, ilan_no`,
        [kategori, baslik, emptyToNull(aciklama), numOrNull(fiyat) || 0, emptyToNull(video_url),
         emptyToNull(marka), emptyToNull(model), numOrNull(yil), emptyToNull(segment),
         numOrNull(motor_cc), numOrNull(km), yayinda !== false, numOrNull(siralama) || 0,
         one_cikan === true, numOrNull(stok_motor_id)]
      );
      const urunId = ins.rows[0].id;
      const ilanNo = ins.rows[0].ilan_no;

      let kapakId = null;
      if (Array.isArray(gorseller)) {
        for (let i = 0; i < gorseller.length; i++) {
          if (!parseDataUrl(gorseller[i])) continue;
          const g = await client.query(
            'INSERT INTO vitrin_gorseller (urun_id, data, sira) VALUES ($1,$2,$3) RETURNING id',
            [urunId, gorseller[i], i]
          );
          if (kapakId === null) kapakId = g.rows[0].id;
        }
      }
      if (kapakId !== null) {
        await client.query('UPDATE vitrin_urunleri SET kapak_gorsel_id = $1 WHERE id = $2', [kapakId, urunId]);
      }
      if (typeof video === 'string' && video) await setVideo(client, urunId, video);
      await client.query('COMMIT');
      res.status(201).json({ id: urunId, ilan_no: ilanNo, kapak_gorsel_id: kapakId });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Vitrin ekleme hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    } finally {
      client.release();
    }
  });

  // PUT /:id - güncelle (gorseller verilirse görseller tamamen yenilenir)
  router.put('/:id', ...admin, async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        kategori, baslik, aciklama, fiyat, video_url,
        marka, model, yil, segment, motor_cc, km, yayinda, siralama, gorseller, video, video_sil,
        one_cikan, stok_motor_id
      } = req.body;

      const mevcut = await client.query('SELECT id FROM vitrin_urunleri WHERE id = $1', [req.params.id]);
      if (mevcut.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });
      if (kategori === 'motor' && !segment) return res.status(400).json({ message: 'Motor ilanı için segment zorunlu' });

      if (segment) await ensureSegment(segment);
      await client.query('BEGIN');
      await client.query(
        `UPDATE vitrin_urunleri SET
          kategori=$1, baslik=$2, aciklama=$3, fiyat=$4, video_url=$5,
          marka=$6, model=$7, yil=$8, segment=$9, motor_cc=$10, km=$11,
          yayinda=$12, siralama=$13, one_cikan=$14, stok_motor_id=$15, updated_at=CURRENT_TIMESTAMP
         WHERE id=$16`,
        [kategori, baslik, emptyToNull(aciklama), numOrNull(fiyat) || 0, emptyToNull(video_url),
         emptyToNull(marka), emptyToNull(model), numOrNull(yil), emptyToNull(segment),
         numOrNull(motor_cc), numOrNull(km), yayinda !== false, numOrNull(siralama) || 0,
         one_cikan === true, numOrNull(stok_motor_id), req.params.id]
      );

      // gorseller alanı gönderildiyse görselleri tamamen yenile
      if (Array.isArray(gorseller)) {
        await client.query('DELETE FROM vitrin_gorseller WHERE urun_id = $1', [req.params.id]);
        let kapakId = null;
        for (let i = 0; i < gorseller.length; i++) {
          if (!parseDataUrl(gorseller[i])) continue;
          const g = await client.query(
            'INSERT INTO vitrin_gorseller (urun_id, data, sira) VALUES ($1,$2,$3) RETURNING id',
            [req.params.id, gorseller[i], i]
          );
          if (kapakId === null) kapakId = g.rows[0].id;
        }
        await client.query('UPDATE vitrin_urunleri SET kapak_gorsel_id = $1 WHERE id = $2', [kapakId, req.params.id]);
      }

      // Video: yeni dosya geldiyse değiştir; video_sil işaretliyse kaldır; aksi halde dokunma
      if (typeof video === 'string' && video) await setVideo(client, req.params.id, video);
      else if (video_sil) await clearVideo(client, req.params.id);

      await client.query('COMMIT');
      res.json({ message: 'Güncellendi' });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Vitrin güncelleme hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    } finally {
      client.release();
    }
  });

  // DELETE /:id - sil (görseller cascade)
  router.delete('/:id', ...admin, async (req, res) => {
    try {
      await pool.query('DELETE FROM vitrin_urunleri WHERE id = $1', [req.params.id]);
      res.json({ message: 'Silindi' });
    } catch (e) {
      console.error('Vitrin silme hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // POST /segmentler - yeni segment ekle (admin)
  router.post('/segmentler', ...admin, async (req, res) => {
    try {
      const ad = (req.body.ad || '').trim();
      if (!ad) return res.status(400).json({ message: 'Segment adı zorunlu' });
      await ensureSegment(ad);
      const result = await pool.query('SELECT id, ad FROM vitrin_segmentler WHERE ad = $1', [ad]);
      res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error('Segment ekleme hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // PUT /iletisim/:kategori - kategori iletişimi upsert
  router.put('/iletisim/:kategori', ...admin, async (req, res) => {
    try {
      const { kategori } = req.params;
      if (!KATEGORILER.includes(kategori)) return res.status(400).json({ message: 'Geçersiz kategori' });
      const { personel_adi, telefon, aciklama } = req.body;
      await pool.query(
        `INSERT INTO vitrin_kategori_iletisim (kategori, personel_adi, telefon, aciklama, updated_at)
         VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)
         ON CONFLICT (kategori) DO UPDATE SET
           personel_adi=EXCLUDED.personel_adi, telefon=EXCLUDED.telefon,
           aciklama=EXCLUDED.aciklama, updated_at=CURRENT_TIMESTAMP`,
        [kategori, emptyToNull(personel_adi), emptyToNull(telefon), emptyToNull(aciklama)]
      );
      res.json({ message: 'Kaydedildi' });
    } catch (e) {
      console.error('Vitrin iletişim güncelleme hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  return router;
};
