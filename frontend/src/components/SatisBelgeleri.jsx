import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Alert, CircularProgress, Divider } from '@mui/material';
import ViewIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DescriptionIcon from '@mui/icons-material/Description';
import { satisBelgeService } from '../services/api';

const BELGE_UZANTILARI = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';
const MAX_BELGE_BOYUT = 10 * 1024 * 1024; // sunucu limitiyle aynı
const boyutYaz = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const BELGE_ACIKLAMA = 'PDF, Word, Excel, JPG veya PNG (dosya başına en fazla 10 MB).';

// Satışa sözleşme vb. dosya ekleme (PDF/Word/Excel/görsel). Zorunlu değil, etiket yok: ad + yüklenme tarihi.
// Kayıtlı bir satış için kullanılır: dosya seçildiği anda yüklenir.
export const BelgeBolumu = ({ motorId }) => {
  const [belgeler, setBelgeler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [islemId, setIslemId] = useState(null);
  const [mesaj, setMesaj] = useState(null); // { sev, text }

  const yukle = async () => {
    try { const res = await satisBelgeService.list(motorId); setBelgeler(res.data); }
    catch { setMesaj({ sev: 'error', text: 'Belgeler yüklenemedi' }); }
  };

  useEffect(() => {
    let aktif = true;
    satisBelgeService.list(motorId)
      .then(res => { if (aktif) setBelgeler(res.data); })
      .catch(() => { if (aktif) setMesaj({ sev: 'error', text: 'Belgeler yüklenemedi' }); });
    return () => { aktif = false; };
  }, [motorId]);

  const dosyaSec = async (e) => {
    const dosyalar = Array.from(e.target.files || []);
    e.target.value = '';
    if (dosyalar.length === 0) return;
    setYukleniyor(true); setMesaj(null);
    const hatalar = [];
    let basarili = 0;
    for (const f of dosyalar) {
      if (f.size > MAX_BELGE_BOYUT) { hatalar.push(`${f.name}: 10 MB'dan büyük`); continue; }
      try { await satisBelgeService.upload(motorId, f); basarili++; }
      catch (err) { hatalar.push(`${f.name}: ${err.response?.data?.message || 'yüklenemedi'}`); }
    }
    await yukle();
    setYukleniyor(false);
    if (hatalar.length) setMesaj({ sev: 'error', text: hatalar.join(' • ') + (basarili ? ` (${basarili} dosya yüklendi)` : '') });
    else setMesaj({ sev: 'success', text: `${basarili} dosya yüklendi` });
  };

  // PDF/görsel yeni sekmede açılır, diğerleri indirilir. Sekme tıklamayla eşzamanlı açılır (açılır pencere engeli olmasın).
  const ac = async (b, goster) => {
    setIslemId(b.id);
    const onizlenebilir = goster && (b.mime === 'application/pdf' || b.mime.startsWith('image/'));
    const sekme = onizlenebilir ? window.open('', '_blank') : null;
    try {
      const res = await satisBelgeService.download(b.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: b.mime }));
      if (sekme) sekme.location.href = url;
      else {
        const a = document.createElement('a');
        a.href = url; a.download = b.dosya_adi;
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (sekme) sekme.close();
      setMesaj({ sev: 'error', text: 'Belge açılamadı' });
    }
    setIslemId(null);
  };

  const sil = async (b) => {
    if (!window.confirm(`"${b.dosya_adi}" silinsin mi?`)) return;
    setIslemId(b.id);
    try { await satisBelgeService.delete(b.id); await yukle(); }
    catch (err) { setMesaj({ sev: 'error', text: err.response?.data?.message || 'Silinemedi' }); }
    setIslemId(null);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ flexGrow: 1 }}>📎 Belgeler ({belgeler.length})</Typography>
        <Button size="small" variant="outlined" component="label" disabled={yukleniyor}
          startIcon={yukleniyor ? <CircularProgress size={16} /> : <AttachFileIcon />}>
          {yukleniyor ? 'Yükleniyor…' : 'Belge Ekle'}
          <input type="file" hidden multiple accept={BELGE_UZANTILARI} onChange={dosyaSec} />
        </Button>
      </Box>
      <Divider sx={{ my: 1 }} />
      {mesaj && <Alert severity={mesaj.sev} onClose={() => setMesaj(null)} sx={{ mb: 1 }}>{mesaj.text}</Alert>}
      {belgeler.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Henüz belge eklenmedi. {BELGE_ACIKLAMA}</Typography>
      ) : belgeler.map(b => (
        <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
          <DescriptionIcon color="action" />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight="500" noWrap title={b.dosya_adi}>{b.dosya_adi}</Typography>
            <Typography variant="caption" color="text.secondary">
              {boyutYaz(b.boyut)} • {new Date(b.created_at).toLocaleDateString('tr-TR')}{b.yukleyen_adi ? ` • ${b.yukleyen_adi}` : ''}
            </Typography>
          </Box>
          {islemId === b.id ? <CircularProgress size={20} /> : (
            <>
              {(b.mime === 'application/pdf' || b.mime.startsWith('image/')) && (
                <IconButton size="small" onClick={() => ac(b, true)} title="Görüntüle"><ViewIcon fontSize="small" /></IconButton>
              )}
              <IconButton size="small" onClick={() => ac(b, false)} title="İndir"><FileDownloadIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => sil(b)} title="Sil"><DeleteIcon fontSize="small" /></IconButton>
            </>
          )}
        </Box>
      ))}
    </Box>
  );
};

// Henüz kaydedilmemiş bir satış için: dosyalar seçilir, satış kaydedilince yüklenir.
// (Belge bir satış kaydına bağlıdır; kayıt oluşmadan sunucuya gönderilemez.)
export const BekleyenBelgeler = ({ dosyalar, setDosyalar, disabled }) => {
  const [uyari, setUyari] = useState('');

  const dosyaSec = (e) => {
    const secilen = Array.from(e.target.files || []);
    e.target.value = '';
    const buyukler = secilen.filter(f => f.size > MAX_BELGE_BOYUT);
    setUyari(buyukler.length ? `10 MB'dan büyük olduğu için eklenmedi: ${buyukler.map(f => f.name).join(', ')}` : '');
    // Aynı dosya iki kez seçilirse tek sefer eklenir
    const yeni = secilen.filter(f => f.size <= MAX_BELGE_BOYUT && !dosyalar.some(d => d.name === f.name && d.size === f.size));
    if (yeni.length) setDosyalar([...dosyalar, ...yeni]);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ flexGrow: 1 }}>📎 Belgeler ({dosyalar.length})</Typography>
        <Button size="small" variant="outlined" component="label" disabled={disabled} startIcon={<AttachFileIcon />}>
          Belge Ekle
          <input type="file" hidden multiple accept={BELGE_UZANTILARI} onChange={dosyaSec} />
        </Button>
      </Box>
      <Divider sx={{ my: 1 }} />
      {uyari && <Alert severity="warning" onClose={() => setUyari('')} sx={{ mb: 1 }}>{uyari}</Alert>}
      {dosyalar.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Satış sözleşmesi gibi belgeleri buradan ekleyebilirsiniz. {BELGE_ACIKLAMA}</Typography>
      ) : (
        <>
          {dosyalar.map((f, i) => (
            <Box key={`${f.name}-${f.size}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
              <DescriptionIcon color="action" />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight="500" noWrap title={f.name}>{f.name}</Typography>
                <Typography variant="caption" color="text.secondary">{boyutYaz(f.size)}</Typography>
              </Box>
              <IconButton size="small" color="error" disabled={disabled} title="Listeden çıkar"
                onClick={() => setDosyalar(dosyalar.filter((_, idx) => idx !== i))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            Belgeler satış kaydedildiğinde yüklenir.
          </Typography>
        </>
      )}
    </Box>
  );
};

// Bekleyen dosyaları kaydedilen satışa yükler. Yüklenemeyenlerin açıklamalarını döndürür (boş dizi = hepsi yüklendi).
export const bekleyenBelgeleriYukle = async (motorId, dosyalar) => {
  const hatalar = [];
  for (const f of dosyalar) {
    try { await satisBelgeService.upload(motorId, f); }
    catch (err) { hatalar.push(`${f.name}: ${err.response?.data?.message || 'yüklenemedi'}`); }
  }
  return hatalar;
};
