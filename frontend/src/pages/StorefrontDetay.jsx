import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AppBar, Alert, Box, Button, Chip, CircularProgress, Container, Divider,
  IconButton, Paper, Stack, Toolbar, Typography
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, ArrowBackIosNew as PrevIcon,
  ArrowForwardIos as NextIcon, Calculate as CalculateIcon,
  CreditCard as CreditCardIcon, Login as LoginIcon, Phone as PhoneIcon,
  PlayCircleOutline as PlayIcon, WhatsApp as WhatsAppIcon
} from '@mui/icons-material';
import { vitrinService } from '../services/api';

const RED = '#C62828';

const videoKaynak = (url) => {
  if (!url) return null;
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { tip: 'embed', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = u.match(/vimeo\.com\/(\d+)/);
  if (vm) return { tip: 'embed', src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) return { tip: 'file', src: u };
  return { tip: 'link', src: u };
};

const waLink = (tel) => {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = `90${d.slice(1)}`;
  else if (!d.startsWith('90') && d.length === 10) d = `90${d}`;
  return `https://wa.me/${d}`;
};

const StorefrontDetay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [detay, setDetay] = useState(null);
  const [iletisim, setIletisim] = useState(null);
  const [gorselIdx, setGorselIdx] = useState(0);
  const [yuklenenGorsel, setYuklenenGorsel] = useState(null);
  const [hataliGorsel, setHataliGorsel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([vitrinService.getById(id), vitrinService.getIletisim()])
      .then(([detayRes, iletisimRes]) => {
        if (!active) return;
        if (detayRes.status !== 'fulfilled') throw new Error('İlan bulunamadı');
        const urun = detayRes.value.data;
        setDetay(urun);
        if (iletisimRes.status === 'fulfilled') {
          setIletisim(iletisimRes.value.data.find((r) => r.kategori === urun.kategori) || null);
        }
      })
      .catch(() => active && setError('İlan bilgileri yüklenemedi veya ilan artık yayında değil.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const gorseller = useMemo(() => {
    if (detay?.gorsel_idler?.length) return detay.gorsel_idler;
    return detay?.kapak_gorsel_id ? [detay.kapak_gorsel_id] : [];
  }, [detay]);
  const aktifGorsel = gorseller[gorselIdx];
  const video = useMemo(() => videoKaynak(detay?.video_url), [detay]);

  // İlan özellikleri (sahibinden tarzı liste) — görselin yanında gösterilir
  const ozellikler = useMemo(() => (detay ? [
    detay.ilan_no != null && { label: 'İlan No', value: `ILN-${String(detay.ilan_no).padStart(4, '0')}` },
    detay.segment && { label: 'Tip', value: detay.segment },
    detay.marka && { label: 'Marka', value: detay.marka },
    detay.model && { label: 'Model', value: detay.model },
    detay.yil && { label: 'Yıl', value: String(detay.yil) },
    detay.motor_cc && { label: 'Motor Hacmi', value: `${detay.motor_cc} cc` },
    (detay.km !== null && detay.km !== undefined && detay.km !== '') && { label: 'KM', value: `${Number(detay.km).toLocaleString('tr-TR')} km` },
    detay.hasar_kaydi && { label: 'Hasar Kaydı', value: detay.hasar_kaydi },
  ].filter(Boolean) : []), [detay]);
  const aktifGorselYuklendi = yuklenenGorsel === aktifGorsel;
  const aktifGorselHatali = hataliGorsel === aktifGorsel;

  const geriDon = () => {
    if (location.state?.storefront) navigate('/site', { state: location.state });
    else if (window.history.length > 1) navigate(-1);
    else navigate('/site');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f3f4f6', overflowX: 'hidden' }}>
      <AppBar position="sticky" sx={{ bgcolor: '#111', borderRadius: 0 }} elevation={2}>
        <Toolbar variant="dense" sx={{ px: { xs: 1.5, md: 3 }, gap: 1.5, minHeight: 54 }}>
          <Box onClick={() => navigate('/site')} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
            <img src="/KaynarMotor.png" alt="Kaynar Motor" width="28" height="31"
              style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <Typography fontWeight={800} sx={{ letterSpacing: 1, whiteSpace: 'nowrap' }}>
              KAYNAR <span style={{ color: RED }}>MOTOR</span>
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Button color="inherit" startIcon={<LoginIcon />} onClick={() => navigate('/login')}>Servise Git</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, md: 2.5 } }}>
        <Button startIcon={<ArrowBackIcon />} onClick={geriDon}
          size="small" sx={{ mb: 1.5, color: '#333', fontWeight: 700 }}>
          Geri Dön
        </Button>

        {loading ? (
          <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center' }}><CircularProgress color="error" /></Box>
        ) : error ? (
          <Alert severity="error" action={<Button onClick={() => navigate('/site')}>Vitrine Dön</Button>}>{error}</Alert>
        ) : detay && (
          <Stack spacing={2}>
            <Paper sx={{ p: { xs: 1.25, md: 2 }, borderRadius: 2.5 }}>
              <Box sx={{ textAlign: 'center', mb: { xs: 1.5, md: 2 } }}>
                <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: 22, md: 28 }, lineHeight: 1.25 }}>{detay.baslik}</Typography>
                {(detay.marka || detay.model) && <Typography variant="body1" color="text.secondary" sx={{ mt: .5 }}>{[detay.marka, detay.model].filter(Boolean).join(' ')}</Typography>}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.1fr) minmax(320px, .9fr)' }, gap: { xs: 2, md: 3 } }}>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{
                    position: 'relative', bgcolor: '#111', borderRadius: 2, overflow: 'hidden',
                    width: '100%', height: { xs: 300, sm: 380, md: 430 },
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {aktifGorsel && !aktifGorselHatali ? (
                      <>
                        {!aktifGorselYuklendi && <CircularProgress size={34} sx={{ position: 'absolute', color: '#fff' }} />}
                        <img
                          key={aktifGorsel}
                          src={vitrinService.gorselUrl(aktifGorsel)}
                          alt={detay.baslik}
                          onLoad={() => { setYuklenenGorsel(aktifGorsel); setHataliGorsel(null); }}
                          onError={() => setHataliGorsel(aktifGorsel)}
                          style={{
                            display: 'block', opacity: aktifGorselYuklendi ? 1 : 0,
                            maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto',
                            objectFit: 'contain', objectPosition: 'center', transition: 'opacity .15s ease'
                          }}
                        />
                      </>
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'rgba(255,255,255,.7)', px: 2 }}>
                        <Box component="img" src="/KaynarMotor.png" alt="Kaynar Motor" sx={{ width: 90, opacity: .45, filter: 'brightness(0) invert(1)' }} />
                        <Typography variant="body2" sx={{ mt: 1 }}>{aktifGorselHatali ? 'Görsel yüklenemedi' : 'Bu ilan için görsel bulunmuyor'}</Typography>
                      </Box>
                    )}
                    {gorseller.length > 1 && <>
                      <IconButton aria-label="Önceki görsel" onClick={() => setGorselIdx((gorselIdx - 1 + gorseller.length) % gorseller.length)}
                        sx={{ position: 'absolute', left: 10, color: '#fff', bgcolor: 'rgba(0,0,0,.48)', '&:hover': { bgcolor: 'rgba(0,0,0,.72)' } }}><PrevIcon /></IconButton>
                      <IconButton aria-label="Sonraki görsel" onClick={() => setGorselIdx((gorselIdx + 1) % gorseller.length)}
                        sx={{ position: 'absolute', right: 10, color: '#fff', bgcolor: 'rgba(0,0,0,.48)', '&:hover': { bgcolor: 'rgba(0,0,0,.72)' } }}><NextIcon /></IconButton>
                      <Chip size="small" label={`${gorselIdx + 1} / ${gorseller.length}`}
                        sx={{ position: 'absolute', right: 10, bottom: 10, bgcolor: 'rgba(0,0,0,.65)', color: '#fff', fontWeight: 700 }} />
                    </>}
                  </Box>
                  {gorseller.length > 1 && (
                    <Box sx={{ display: 'flex', gap: .75, mt: 1, overflowX: 'auto', pb: .25, minWidth: 0, maxWidth: '100%' }}>
                      {gorseller.map((g, i) => (
                        <Box key={g} component="button" onClick={() => setGorselIdx(i)} aria-label={`${i + 1}. görsel`}
                          sx={{ p: 0, border: i === gorselIdx ? `2px solid ${RED}` : '1px solid #ddd', borderRadius: 1, overflow: 'hidden', bgcolor: '#111', minWidth: 72, width: 72, height: 52, cursor: 'pointer' }}>
                          <Box component="img" src={vitrinService.gorselUrl(g)} alt={`${detay.baslik} - ${i + 1}. görsel`}
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/KaynarMotor.png'; }}
                            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', bgcolor: '#111' }} />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>

                <Box sx={{ py: { md: 1 }, minWidth: 0 }}>
                  {ozellikler.length > 0 && (
                    <Box sx={{ mb: 1.5, border: '1px solid #ececec', borderRadius: 2, overflow: 'hidden' }}>
                      <Typography sx={{ px: 1.5, py: 1, bgcolor: '#C62828', color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: .4 }}>
                        ÖZELLİKLER
                      </Typography>
                      {ozellikler.map((o, i) => (
                        <Box key={o.label} sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
                          px: 1.5, py: 1.1, borderTop: i ? '1px solid #f3f3f3' : 'none',
                          bgcolor: i % 2 ? '#fafafa' : '#fff',
                        }}>
                          <Typography sx={{ color: 'text.secondary', fontSize: 13.5, fontWeight: 600 }}>{o.label}</Typography>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, textAlign: 'right' }}>{o.value}</Typography>
                        </Box>
                      ))}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, px: 1.5, py: 1.25, borderTop: '2px solid #f0f0f0', bgcolor: '#fff' }}>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13.5, fontWeight: 700 }}>Fiyat</Typography>
                        <Typography sx={{ color: '#C62828', fontWeight: 900, fontSize: { xs: 22, md: 24 } }}>{Number(detay.fiyat).toLocaleString('tr-TR')} ₺</Typography>
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ mb: 1.25 }} />
                  <Typography variant="overline" color="text.secondary" fontWeight={800}>Açıklama</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{detay.aciklama || 'Bu ilan için henüz açıklama eklenmemiş.'}</Typography>
                </Box>
              </Box>
            </Paper>

            {(detay.video_dosya_id || video) && (
              <Paper sx={{ p: { xs: 1.25, md: 2 }, borderRadius: 2.5 }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1.25 }}>Tanıtım Videosu</Typography>
                {detay.video_dosya_id ? (
                  <Box component="video" controls preload="metadata" playsInline poster={detay.kapak_gorsel_id ? vitrinService.gorselUrl(detay.kapak_gorsel_id) : undefined}
                    sx={{ width: '100%', maxWidth: 880, maxHeight: 480, mx: 'auto', display: 'block', bgcolor: '#000', borderRadius: 2 }}>
                    <source src={vitrinService.videoUrl(detay.video_dosya_id)} />
                  </Box>
                ) : video.tip === 'embed' ? (
                  <Box sx={{ position: 'relative', width: '100%', maxWidth: 880, aspectRatio: '16 / 9', mx: 'auto', borderRadius: 2, overflow: 'hidden', bgcolor: '#000' }}>
                    <iframe src={video.src} title="Tanıtım videosu" loading="lazy" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                  </Box>
                ) : video.tip === 'file' ? (
                  <Box component="video" controls preload="metadata" playsInline sx={{ width: '100%', maxWidth: 880, maxHeight: 480, mx: 'auto', display: 'block', bgcolor: '#000', borderRadius: 2 }}><source src={video.src} /></Box>
                ) : (
                  <Button fullWidth size="large" variant="outlined" startIcon={<PlayIcon />} href={video.src} target="_blank" rel="noopener noreferrer">Videoyu / Gönderiyi Görüntüle</Button>
                )}
              </Paper>
            )}

            <Paper sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 2.5 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1.25 }}>İşlemler ve İletişim</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                {Number(detay.fiyat) > 0 && <Button fullWidth size="medium" variant="outlined" color="inherit" startIcon={<CalculateIcon />} onClick={() => window.open(`/taksit/${Math.round(Number(detay.fiyat))}`, '_blank')} sx={{ borderColor: '#aaa' }}>Nakit / Taksit Hesapla</Button>}
                {detay.rubik_link && <Button fullWidth size="medium" variant="contained" startIcon={<CreditCardIcon />} href={detay.rubik_link} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>Taksitli Ödeme Yap</Button>}
                {iletisim?.telefon && <Button fullWidth size="medium" variant="contained" color="error" startIcon={<PhoneIcon />} href={`tel:${iletisim.telefon}`}>{iletisim.telefon}</Button>}
                {waLink(iletisim?.telefon) && <Button fullWidth size="medium" variant="contained" startIcon={<WhatsAppIcon />} href={waLink(iletisim.telefon)} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1da851' } }}>WhatsApp</Button>}
              </Stack>
              {iletisim?.personel_adi && <Typography color="text.secondary" sx={{ mt: 1.5 }}>İletişim: <strong>{iletisim.personel_adi}</strong></Typography>}
            </Paper>
          </Stack>
        )}
      </Container>
    </Box>
  );
};

export default StorefrontDetay;
