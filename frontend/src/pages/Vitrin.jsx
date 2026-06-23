import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Tabs, Tab, Button, Typography, Grid, Card, CardMedia, CardContent, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Switch, FormControlLabel, Chip, Paper, Stack, Snackbar, Alert, CircularProgress, Autocomplete
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon,
  Save as SaveIcon, PhotoCamera as PhotoIcon, Phone as PhoneIcon,
  Movie as MovieIcon, PlayCircle as PlayCircleIcon
} from '@mui/icons-material';
import { vitrinService, ikinciElMotorService, aksesuarStokService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const KATEGORILER = [
  { key: 'motor', label: 'Motor Satışı' },
  { key: 'aksesuar', label: 'Aksesuar' },
  { key: 'yedek_parca', label: 'Yedek Parça' },
  { key: 'bakim_servis', label: 'Bakım / Servis' },
  { key: 'nakliye', label: 'Nakliye / Yol Kurtarma' },
  { key: 'sigorta', label: 'Araç Sigortası' },
];

export const SEGMENTLER = ['Chopper', 'Scooter', 'Racing', 'Naked', 'Touring', 'Cross/Enduro', 'Cub', 'Maxi Scooter'];

// İlan girilmeyen, sadece hizmet sayfası (resim + telefon + WhatsApp) gösterilen kategoriler
export const HIZMET_KATEGORILER = ['bakim_servis', 'nakliye', 'sigorta'];

// Görseli istemcide küçültüp JPEG base64 döndürür (DB yükünü azaltmak için)
const resizeImage = (file, maxSize = 1280, quality = 0.7) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
        else if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const bosUrun = {
  baslik: '', aciklama: '', fiyat: '', video_url: '',
  marka: '', model: '', yil: '', segment: '', motor_cc: '', km: '',
  yayinda: true, siralama: 0, one_cikan: false, stok_motor_id: null, rubik_link: '',
};

const Vitrin = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  // Yetkiye göre görünen vitrin kategorileri: admin hepsini, personel yalnızca izinli olduğu vitrini yönetir
  const gorunenKategoriler = isAdmin ? KATEGORILER : KATEGORILER.filter(k =>
    (k.key === 'motor' && user?.motor_vitrin_yetkisi) ||
    (k.key === 'aksesuar' && user?.aksesuar_vitrin_yetkisi)
  );

  const [tab, setTab] = useState(0);
  const aktifKategori = gorunenKategoriler[tab] || gorunenKategoriler[0] || KATEGORILER[0];
  const kategori = aktifKategori.key;
  const isMotor = kategori === 'motor';
  const isAksesuar = kategori === 'aksesuar';
  const isHizmet = HIZMET_KATEGORILER.includes(kategori);

  const [urunler, setUrunler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [segmentler, setSegmentler] = useState(SEGMENTLER); // dinamik segment listesi (adlar)
  const [iletisim, setIletisim] = useState({}); // { kategori: {personel_adi, telefon} }
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  // ürün dialog
  const [dlgOpen, setDlgOpen] = useState(false);
  const [form, setForm] = useState(bosUrun);
  const [editId, setEditId] = useState(null);
  const [gorseller, setGorseller] = useState([]); // base64 data URL dizisi
  const [saving, setSaving] = useState(false);
  const [stokMotorlar, setStokMotorlar] = useState([]); // stoktaki motorlar (vitrine aktarma için)
  const [stokAksesuarlar, setStokAksesuarlar] = useState([]); // aksesuar stok (vitrine aktarma için)

  // video: videoFile = yeni seçilen base64; videoVar = üründe zaten video var mı; videoSil = mevcudu kaldır
  const [videoFile, setVideoFile] = useState(null);
  const [videoAdi, setVideoAdi] = useState('');
  const [videoVar, setVideoVar] = useState(false);
  const [videoSil, setVideoSil] = useState(false);
  const [videoYukleniyor, setVideoYukleniyor] = useState(false);

  // iletişim dialog
  const [iletDlg, setIletDlg] = useState(false);
  const [iletForm, setIletForm] = useState({ personel_adi: '', telefon: '', aciklama: '', baslik: '' });
  const [iletGorsel, setIletGorsel] = useState(null); // yeni seçilen hizmet görseli (base64)
  const [iletGorselVar, setIletGorselVar] = useState(false);
  const [iletGorselSil, setIletGorselSil] = useState(false);

  const showSnack = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  const loadUrunler = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vitrinService.getAllAdmin({ kategori });
      setUrunler(res.data);
    } catch { showSnack('Ürünler yüklenemedi', 'error'); }
    setLoading(false);
  }, [kategori]);

  const loadIletisim = useCallback(async () => {
    try {
      const res = await vitrinService.getIletisim();
      const map = {};
      res.data.forEach(r => { map[r.kategori] = r; });
      setIletisim(map);
    } catch { /* sessiz */ }
  }, []);

  const loadSegmentler = useCallback(async () => {
    try {
      const res = await vitrinService.getSegmentler();
      if (res.data?.length) setSegmentler(res.data.map(s => s.ad));
    } catch { /* varsayılan listede kalır */ }
  }, []);

  useEffect(() => { loadUrunler(); }, [loadUrunler]);
  useEffect(() => { loadIletisim(); }, [loadIletisim]);
  useEffect(() => { loadSegmentler(); }, [loadSegmentler]);

  // Stoktaki (satılmamış) motorları yükle — vitrine aktarma için
  useEffect(() => {
    ikinciElMotorService.getAll()
      .then(res => setStokMotorlar((res.data || []).filter(m => m.durum !== 'tamamlandi' && m.durum !== 'perte')))
      .catch(() => { /* yetki yoksa boş kalır */ });
  }, []);

  // Aksesuar stoğunu yükle — aksesuar ilanını otomatik doldurmak için
  useEffect(() => {
    aksesuarStokService.getAll()
      .then(res => setStokAksesuarlar(res.data || []))
      .catch(() => { /* yetki yoksa boş kalır */ });
  }, []);

  // Stoktan aksesuar seçilince TÜM bilgileri otomatik doldur
  const secStokAksesuar = (urun) => {
    if (!urun) return;
    // Müşteriye gösterilecek detayları açıklamaya derle (kategori, beden, renk, marka)
    const detaylar = [
      urun.marka ? `Marka: ${urun.marka}` : null,
      urun.kategori ? `Kategori: ${urun.kategori}` : null,
      urun.beden ? `Beden: ${urun.beden}` : null,
      urun.renk ? `Renk: ${urun.renk}` : null,
    ].filter(Boolean).join('\n');
    setForm(f => ({
      ...f,
      baslik: urun.stok_adi || f.baslik,
      marka: urun.marka || f.marka,
      fiyat: urun.satis_fiyati || f.fiyat,
      aciklama: f.aciklama || detaylar,
    }));
  };

  // Stoktan motor seçilince temel bilgileri forma doldur (tekrar elle girilmesin)
  const secStokMotor = (motor) => {
    if (!motor) { setForm(f => ({ ...f, stok_motor_id: null })); return; }
    setForm(f => ({
      ...f,
      stok_motor_id: motor.id,
      marka: motor.marka || f.marka,
      model: motor.model || f.model,
      yil: motor.yil || f.yil,
      km: motor.km || f.km,
      // Stokta girilen vitrin taslağı varsa onu kullan; yoksa liste/satış fiyatı
      fiyat: motor.vitrin_fiyat || motor.liste_fiyati || motor.satis_fiyati || f.fiyat,
      baslik: motor.vitrin_baslik || f.baslik || [motor.marka, motor.model, motor.yil].filter(Boolean).join(' '),
      aciklama: motor.vitrin_aciklama || f.aciklama,
      segment: motor.vitrin_segment || f.segment,
      motor_cc: motor.vitrin_cc || f.motor_cc,
    }));
  };

  const resetVideo = () => { setVideoFile(null); setVideoAdi(''); setVideoVar(false); setVideoSil(false); };

  const openNew = () => { setForm(bosUrun); setGorseller([]); setEditId(null); resetVideo(); setDlgOpen(true); };

  const openEdit = async (urun) => {
    try {
      const res = await vitrinService.getById(urun.id);
      const d = res.data;
      setForm({
        baslik: d.baslik || '', aciklama: d.aciklama || '', fiyat: d.fiyat || '',
        video_url: d.video_url || '', marka: d.marka || '', model: d.model || '',
        yil: d.yil || '', segment: d.segment || '', motor_cc: d.motor_cc || '',
        km: d.km || '', yayinda: d.yayinda, siralama: d.siralama || 0,
        one_cikan: !!d.one_cikan, stok_motor_id: d.stok_motor_id || null, rubik_link: d.rubik_link || '',
      });
      // mevcut görselleri data URL olarak getir (endpoint'ten)
      const gorsellerData = await Promise.all(
        (d.gorsel_idler || []).map(async (gid) => {
          const r = await fetch(vitrinService.gorselUrl(gid));
          const blob = await r.blob();
          return await new Promise((resolve) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.readAsDataURL(blob);
          });
        })
      );
      setGorseller(gorsellerData);
      // Mevcut video base64'ünü forma çekmeyiz (büyük olabilir); sadece var/yok bilgisini tutarız
      setVideoFile(null); setVideoAdi(''); setVideoSil(false); setVideoVar(!!d.video_dosya_id);
      setEditId(urun.id);
      setDlgOpen(true);
    } catch { showSnack('Ürün yüklenemedi', 'error'); }
  };

  const handleVideoFile = (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    // 120 MB üstü videolar sunucu limitini aşar; kullanıcıyı uyar
    if (file.size > 110 * 1024 * 1024) { showSnack('Video çok büyük (en fazla ~110 MB). Lütfen sıkıştırın.', 'warning'); return; }
    setVideoYukleniyor(true);
    const reader = new FileReader();
    reader.onload = () => { setVideoFile(reader.result); setVideoAdi(file.name); setVideoSil(false); setVideoYukleniyor(false); };
    reader.onerror = () => { showSnack('Video okunamadı', 'error'); setVideoYukleniyor(false); };
    reader.readAsDataURL(file);
  };

  const removeVideo = () => {
    setVideoFile(null); setVideoAdi('');
    if (videoVar) setVideoSil(true); // kaydedince sunucudaki mevcut video silinsin
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    try {
      const resized = await Promise.all(files.map(f => resizeImage(f)));
      setGorseller(prev => [...prev, ...resized]);
    } catch { showSnack('Görsel işlenemedi', 'error'); }
    e.target.value = '';
  };

  const removeGorsel = (i) => setGorseller(prev => prev.filter((_, idx) => idx !== i));
  const makeKapak = (i) => setGorseller(prev => {
    const arr = [...prev]; const [g] = arr.splice(i, 1); arr.unshift(g); return arr;
  });

  const handleSave = async () => {
    if (!form.baslik.trim()) { showSnack('Başlık zorunlu', 'warning'); return; }
    if (isMotor && !(form.segment || '').trim()) { showSnack('Motor ilanı için segment seçin', 'warning'); return; }
    // Rubik linki girildiyse basit URL kontrolü (opsiyonel alan)
    const rubik = (form.rubik_link || '').trim();
    if (rubik && !/^https?:\/\/.+\..+/i.test(rubik)) {
      showSnack('Geçerli bir Rubik ödeme linki girin (https:// ile başlamalı)', 'warning'); return;
    }
    setSaving(true);
    const payload = { ...form, kategori, gorseller };
    if (videoFile) payload.video = videoFile;      // yeni video yüklendi
    else if (videoSil) payload.video_sil = true;   // mevcut video kaldırıldı
    try {
      if (editId) await vitrinService.update(editId, payload);
      else await vitrinService.create(payload);
      setDlgOpen(false);
      showSnack('Kaydedildi');
      loadUrunler();
    } catch { showSnack('Kaydedilemedi', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu ilanı silmek istediğinize emin misiniz?')) return;
    try {
      await vitrinService.delete(id);
      showSnack('Silindi');
      loadUrunler();
    } catch { showSnack('Silinemedi', 'error'); }
  };

  const openIletisim = () => {
    const cur = iletisim[kategori] || {};
    setIletForm({ personel_adi: cur.personel_adi || '', telefon: cur.telefon || '', aciklama: cur.aciklama || '', baslik: cur.baslik || '' });
    setIletGorsel(null); setIletGorselSil(false); setIletGorselVar(!!cur.gorsel_var);
    setIletDlg(true);
  };

  const handleIletGorsel = async (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    try { const data = await resizeImage(file, 1280, 0.75); setIletGorsel(data); setIletGorselSil(false); }
    catch { showSnack('Görsel işlenemedi', 'error'); }
  };

  const removeIletGorsel = () => { setIletGorsel(null); if (iletGorselVar) setIletGorselSil(true); };

  const handleSaveIletisim = async () => {
    try {
      const payload = { ...iletForm };
      if (iletGorsel) payload.gorsel = iletGorsel;
      else if (iletGorselSil) payload.gorsel_sil = true;
      await vitrinService.updateIletisim(kategori, payload);
      setIletDlg(false);
      showSnack('Kaydedildi');
      loadIletisim();
    } catch { showSnack('Kaydedilemedi', 'error'); }
  };

  const curIletisim = iletisim[kategori];

  return (
    <Box>
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {gorunenKategoriler.map(k => <Tab key={k.key} label={k.label} />)}
        </Tabs>
      </Paper>

      {isHizmet ? (
        /* ---- HİZMET SAYFASI AYAR PANELİ (bu kategoride ilan yok) ---- */
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#f0f0f0' }}>
            {curIletisim?.gorsel_var ? (
              <Box component="img" src={`${vitrinService.iletisimGorselUrl(kategori)}?t=${curIletisim.updated_at || ''}`} alt={aktifKategori.label}
                sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
            ) : (
              <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">Henüz görsel eklenmedi</Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold">{curIletisim?.baslik || aktifKategori.label}</Typography>
            {curIletisim?.aciklama && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{curIletisim.aciklama}</Typography>}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <PhoneIcon color="error" fontSize="small" />
              <Typography variant="body1" fontWeight="500">
                {curIletisim?.personel_adi || '—'}{curIletisim?.telefon ? ` • ${curIletisim.telefon}` : ''}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Bu sayfada ilan yoktur. Müşteriye yukarıdaki görsel, telefon ve WhatsApp butonu gösterilir.
            </Typography>
            <Button variant="contained" startIcon={<PhoneIcon />} onClick={openIletisim} sx={{ mt: 1.5 }}>Hizmet Sayfasını Düzenle</Button>
          </Box>
        </Paper>
      ) : (
      <>
      {/* Kategori iletişim kartı */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">Bu kategori için iletişim</Typography>
          {curIletisim && (curIletisim.personel_adi || curIletisim.telefon) ? (
            <Typography variant="body1" fontWeight="500">
              {curIletisim.personel_adi || '—'} {curIletisim.telefon ? `• ${curIletisim.telefon}` : ''}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">Henüz tanımlanmadı</Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" startIcon={<PhoneIcon />} onClick={openIletisim}>Personel / Telefon</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>İlan Ekle</Button>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : urunler.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          Bu kategoride henüz ilan yok. "İlan Ekle" ile başlayın.
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {urunler.map(u => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={u.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: u.yayinda ? 1 : 0.55 }}>
                <CardMedia
                  component="img"
                  height="170"
                  image={u.kapak_gorsel_id ? vitrinService.gorselUrl(u.kapak_gorsel_id) : '/KaynarMotor.png'}
                  alt={u.baslik}
                  loading="lazy"
                  decoding="async"
                  sx={{ objectFit: 'cover', bgcolor: '#f0f0f0' }}
                />
                <CardContent sx={{ flex: 1, pb: 1 }}>
                  {u.ilan_no != null && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      İlan No: ILN-{String(u.ilan_no).padStart(4, '0')}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
                    {!u.yayinda && <Chip size="small" label="Yayında değil" color="default" />}
                    {u.one_cikan ? <Chip size="small" label="★ Öne Çıkan" color="warning" /> : null}
                    {u.stok_motor_id ? <Chip size="small" label="Stok bağlı" color="success" variant="outlined" /> : null}
                    {u.segment && <Chip size="small" label={u.segment} color="error" variant="outlined" />}
                    {u.motor_cc ? <Chip size="small" label={`${u.motor_cc} cc`} variant="outlined" /> : null}
                  </Box>
                  <Typography variant="subtitle1" fontWeight="bold" noWrap>{u.baslik}</Typography>
                  {(u.marka || u.model) && <Typography variant="body2" color="text.secondary" noWrap>{[u.marka, u.model, u.yil].filter(Boolean).join(' ')}</Typography>}
                  {u.km ? <Typography variant="body2" color="text.secondary">{Number(u.km).toLocaleString('tr-TR')} km</Typography> : null}
                  <Typography variant="h6" color="error" fontWeight="bold" sx={{ mt: 0.5 }}>
                    {Number(u.fiyat).toLocaleString('tr-TR')} ₺
                  </Typography>
                </CardContent>
                <CardActions sx={{ pt: 0 }}>
                  <IconButton size="small" color="primary" onClick={() => openEdit(u)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(u.id)}><DeleteIcon /></IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      </>
      )}

      {/* Ürün Dialog */}
      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editId ? 'İlanı Düzenle' : 'Yeni İlan'} — {aktifKategori.label}
          <IconButton onClick={() => setDlgOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {/* Aksesuar: stoktan seçip bilgileri otomatik doldur */}
            {isAksesuar && (
              <Autocomplete
                options={stokAksesuarlar}
                getOptionLabel={(a) => `${a.stok_adi || ''}${a.marka ? ' • ' + a.marka : ''}${a.satis_fiyati ? ' — ₺' + Number(a.satis_fiyati).toLocaleString('tr-TR') : ''}`.trim()}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(e, val) => secStokAksesuar(val)}
                renderInput={(params) => (
                  <TextField {...params} label="Stoktan Aksesuar Seç (opsiyonel)"
                    helperText="Aksesuar stoğundan seçersen başlık ve fiyat otomatik gelir." />
                )}
              />
            )}
            <TextField label="Başlık" value={form.baslik} onChange={e => setForm({ ...form, baslik: e.target.value })} fullWidth required />
            <TextField label="Açıklama" value={form.aciklama} onChange={e => setForm({ ...form, aciklama: e.target.value })} fullWidth multiline minRows={2} />
            <TextField label="Fiyat (₺)" type="number" value={form.fiyat} onChange={e => setForm({ ...form, fiyat: e.target.value })} fullWidth />

            {isAksesuar && (
              <TextField label="Marka" value={form.marka} onChange={e => setForm({ ...form, marka: e.target.value })} fullWidth />
            )}

            {isMotor && (
              <>
                {/* Stoktan motor seç — temel bilgiler otomatik gelsin */}
                <Autocomplete
                  options={stokMotorlar}
                  getOptionLabel={(m) => `${m.plaka || '—'} • ${[m.marka, m.model, m.yil].filter(Boolean).join(' ')}`.trim()}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  value={stokMotorlar.find(m => m.id === form.stok_motor_id) || null}
                  onChange={(e, val) => secStokMotor(val)}
                  renderInput={(params) => (
                    <TextField {...params} label="Stoktan Motor Seç (opsiyonel)"
                      helperText="Seçersen marka, model, yıl, km ve liste fiyatı stoktan otomatik gelir; sen sadece site bilgilerini düzenlersin." />
                  )}
                />
                {form.stok_motor_id && (
                  <Chip label="Stoktan bağlandı — temel bilgiler stoktan geliyor" color="success" variant="outlined"
                    onDelete={() => setForm(f => ({ ...f, stok_motor_id: null }))} sx={{ alignSelf: 'flex-start' }} />
                )}
                <Stack direction="row" spacing={2}>
                  <TextField label="Marka" value={form.marka} onChange={e => setForm({ ...form, marka: e.target.value })} fullWidth />
                  <TextField label="Model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} fullWidth />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField label="Yıl" type="number" value={form.yil} onChange={e => setForm({ ...form, yil: e.target.value })} fullWidth />
                  <TextField label="Motor (cc)" type="number" value={form.motor_cc} onChange={e => setForm({ ...form, motor_cc: e.target.value })} fullWidth />
                  <TextField label="KM" type="number" value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} fullWidth />
                </Stack>
                <Autocomplete freeSolo options={segmentler} value={form.segment || null}
                  onChange={(e, val) => setForm({ ...form, segment: val || '' })}
                  onInputChange={(e, val) => setForm({ ...form, segment: val })}
                  renderInput={(params) => (
                    <TextField {...params} label="Segment" required
                      helperText="Listeden seçin veya yeni segment yazın" />
                  )}
                />
              </>
            )}

            {/* Video: kendi dosyanı yükle (DB'de tutulur, akıcı oynatılır) */}
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Tanıtım Videosu</Typography>
              {videoFile || (videoVar && !videoSil) ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <PlayCircleIcon color="error" />
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 120 }}>
                    {videoFile ? (videoAdi || 'Yeni video seçildi') : 'Yüklü video mevcut'}
                  </Typography>
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={removeVideo}>Kaldır</Button>
                  <Button size="small" variant="outlined" component="label" startIcon={<MovieIcon />}>
                    Değiştir
                    <input type="file" hidden accept="video/*" onChange={handleVideoFile} />
                  </Button>
                </Box>
              ) : (
                <Button variant="outlined" component="label" startIcon={videoYukleniyor ? <CircularProgress size={16} /> : <MovieIcon />} disabled={videoYukleniyor}>
                  {videoYukleniyor ? 'Okunuyor...' : 'Video Yükle'}
                  <input type="file" hidden accept="video/*" onChange={handleVideoFile} />
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                MP4/WebM önerilir, en fazla ~110 MB. Yüklenen video ilan detayında oynatılır.
              </Typography>
            </Box>

            <TextField label="veya YouTube / dış video linki (opsiyonel)" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} fullWidth placeholder="https://..." />

            <TextField label="Rubik Ödeme Linki (opsiyonel)" value={form.rubik_link} onChange={e => setForm({ ...form, rubik_link: e.target.value })} fullWidth placeholder="https://..."
              helperText='Rubik panelinden oluşturduğun ödeme linkini yapıştır. Girilirse ilan detayında müşteriye "Taksitli Ödeme Yap" butonu çıkar.' />

            {/* Görseller */}
            <Box>
              <Button variant="outlined" component="label" startIcon={<PhotoIcon />}>
                Görsel Ekle
                <input type="file" hidden accept="image/*" multiple onChange={handleFiles} />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>İlk görsel <strong>vitrin fotoğrafı</strong> olur (⭐ ile değiştir)</Typography>
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                {gorseller.map((g, i) => (
                  <Grid item xs={4} sm={3} key={i}>
                    <Box sx={{ position: 'relative', border: i === 0 ? '2px solid #C62828' : '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
                      <img src={g} alt={`gorsel-${i}`} style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }} />
                      {i === 0 && <Chip size="small" label="Vitrin" color="error" sx={{ position: 'absolute', top: 2, left: 2, height: 18, fontSize: 10 }} />}
                      <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex' }}>
                        {i !== 0 && <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.8)', p: 0.2 }} onClick={() => makeKapak(i)} title="Vitrin fotoğrafı yap">⭐</IconButton>}
                        <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.8)', p: 0.2 }} onClick={() => removeGorsel(i)}><CloseIcon fontSize="small" /></IconButton>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControlLabel
                control={<Switch checked={form.yayinda} onChange={e => setForm({ ...form, yayinda: e.target.checked })} />}
                label="Sitede yayınla"
              />
              <FormControlLabel
                control={<Switch color="warning" checked={!!form.one_cikan} onChange={e => setForm({ ...form, one_cikan: e.target.checked })} />}
                label="Öne çıkar"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlgOpen(false)}>İptal</Button>
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* İletişim / Hizmet Sayfası Dialog */}
      <Dialog open={iletDlg} onClose={() => setIletDlg(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{aktifKategori.label} — {isHizmet ? 'Hizmet Sayfası' : 'İletişim'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {isHizmet && (
              <>
                <TextField label="Başlık" value={iletForm.baslik} onChange={e => setIletForm({ ...iletForm, baslik: e.target.value })} fullWidth placeholder={aktifKategori.label} />
                {/* Hizmet görseli */}
                <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Sayfa Görseli</Typography>
                  {(iletGorsel || (iletGorselVar && !iletGorselSil)) ? (
                    <Box>
                      <Box component="img"
                        src={iletGorsel || `${vitrinService.iletisimGorselUrl(kategori)}?t=${(iletisim[kategori]?.updated_at) || ''}`}
                        alt="görsel" sx={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 1, display: 'block', mb: 1 }} />
                      <Stack direction="row" spacing={1}>
                        <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={removeIletGorsel}>Kaldır</Button>
                        <Button size="small" variant="outlined" component="label" startIcon={<PhotoIcon />}>Değiştir
                          <input type="file" hidden accept="image/*" onChange={handleIletGorsel} />
                        </Button>
                      </Stack>
                    </Box>
                  ) : (
                    <Button variant="outlined" component="label" startIcon={<PhotoIcon />}>Görsel Yükle
                      <input type="file" hidden accept="image/*" onChange={handleIletGorsel} />
                    </Button>
                  )}
                </Box>
              </>
            )}
            <TextField label="Personel Adı" value={iletForm.personel_adi} onChange={e => setIletForm({ ...iletForm, personel_adi: e.target.value })} fullWidth />
            <TextField label="Telefon" value={iletForm.telefon} onChange={e => setIletForm({ ...iletForm, telefon: e.target.value })} fullWidth placeholder="05XX XXX XX XX" helperText={isHizmet ? 'WhatsApp butonu bu numarayı kullanır' : ''} />
            <TextField label={isHizmet ? 'Açıklama (opsiyonel)' : 'Not (opsiyonel)'} value={iletForm.aciklama} onChange={e => setIletForm({ ...iletForm, aciklama: e.target.value })} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIletDlg(false)}>İptal</Button>
          <Button variant="contained" onClick={handleSaveIletisim}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Vitrin;
