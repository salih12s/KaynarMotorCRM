import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Button, Typography, Grid, Card, CardMedia,
  CardContent, CardActionArea, Chip, TextField, Stack, Dialog, DialogContent,
  IconButton, Divider, CircularProgress, useMediaQuery, useTheme, InputAdornment,
  List, ListItem, ListItemButton, ListItemText, ListItemIcon, Paper, Fade, Drawer
} from '@mui/material';
import {
  Login as LoginIcon, Close as CloseIcon, Phone as PhoneIcon, Search as SearchIcon,
  ArrowBackIosNew as PrevIcon, ArrowForwardIos as NextIcon, Menu as MenuIcon,
  TwoWheeler as TwoWheelerIcon, Checkroom as CheckroomIcon, Build as BuildIcon,
  Handyman as HandymanIcon, LocalShipping as LocalShippingIcon, VerifiedUser as VerifiedUserIcon,
  ArrowForward as ArrowForwardIcon, Home as HomeIcon,
  Calculate as CalculateIcon, CreditCard as CreditCardIcon
} from '@mui/icons-material';
import { vitrinService } from '../services/api';
import { KATEGORILER, SEGMENTLER } from './Vitrin';

const RED = '#C62828';

// Her kategori için giriş ekranında gösterilecek ikon
const KATEGORI_ICON = {
  motor: <TwoWheelerIcon sx={{ fontSize: 30 }} />,
  aksesuar: <CheckroomIcon sx={{ fontSize: 30 }} />,
  yedek_parca: <BuildIcon sx={{ fontSize: 30 }} />,
  bakim_servis: <HandymanIcon sx={{ fontSize: 30 }} />,
  nakliye: <LocalShippingIcon sx={{ fontSize: 30 }} />,
  sigorta: <VerifiedUserIcon sx={{ fontSize: 30 }} />,
};

// YouTube/diğer video linkini embed URL'ine çevirir
const toEmbedUrl = (url) => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
};

const Storefront = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Giriş (video) ekranı mı yoksa kategori listesi mi gösteriliyor
  const [intro, setIntro] = useState(true);

  const [tab, setTab] = useState(0);
  const kategori = KATEGORILER[tab].key;
  const isMotor = kategori === 'motor';

  const [urunler, setUrunler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [iletisim, setIletisim] = useState({});
  const [segmentler, setSegmentler] = useState(SEGMENTLER);

  // filtreler (motor)
  const [segment, setSegment] = useState('');
  const [ccMax, setCcMax] = useState('');
  const [kmMax, setKmMax] = useState('');
  const [q, setQ] = useState('');

  // detay modalı
  const [detay, setDetay] = useState(null);
  const [gorselIdx, setGorselIdx] = useState(0);

  // mobil menü (hamburger) aç/kapa
  const [mobilMenu, setMobilMenu] = useState(false);

  const loadIletisim = useCallback(async () => {
    try {
      const res = await vitrinService.getIletisim();
      const map = {};
      res.data.forEach(r => { map[r.kategori] = r; });
      setIletisim(map);
    } catch { /* sessiz */ }
  }, []);

  const loadUrunler = useCallback(async () => {
    setLoading(true);
    try {
      const params = { kategori };
      if (isMotor) {
        if (segment) params.segment = segment;
        if (ccMax) params.cc_max = ccMax;
        if (kmMax) params.km_max = kmMax;
      }
      if (q) params.q = q;
      const res = await vitrinService.getAll(params);
      setUrunler(res.data);
    } catch { setUrunler([]); }
    setLoading(false);
  }, [kategori, isMotor, segment, ccMax, kmMax, q]);

  useEffect(() => { loadIletisim(); }, [loadIletisim]);

  // dinamik segmentleri yükle
  useEffect(() => {
    vitrinService.getSegmentler()
      .then(res => { if (res.data?.length) setSegmentler(res.data.map(s => s.ad)); })
      .catch(() => { /* varsayılan listede kalır */ });
  }, []);

  // filtre değişince (kısa debounce ile) yükle — giriş ekranındayken yükleme yapma
  useEffect(() => {
    if (intro) return;
    const t = setTimeout(loadUrunler, 250);
    return () => clearTimeout(t);
  }, [loadUrunler, intro]);

  // sekme değişince filtreleri sıfırla + eski listeyi anında temizle (yumuşak geçiş)
  const handleTab = (v) => {
    setTab(v);
    setSegment(''); setCcMax(''); setKmMax(''); setQ('');
    setUrunler([]); setLoading(true);
  };

  // Giriş ekranından bir kategoriye gir
  const enterKategori = (i) => { handleTab(i); setIntro(false); window.scrollTo(0, 0); };
  const goHome = () => { setIntro(true); setUrunler([]); };

  const openDetay = async (u) => {
    setGorselIdx(0);
    try {
      const res = await vitrinService.getById(u.id);
      setDetay(res.data);
    } catch { setDetay({ ...u, gorsel_idler: u.kapak_gorsel_id ? [u.kapak_gorsel_id] : [] }); }
  };

  const curIletisim = iletisim[kategori];
  const detayIletisim = detay ? iletisim[detay.kategori] : null;
  const embedUrl = detay ? toEmbedUrl(detay.video_url) : null;

  // ---- GİRİŞ (VIDEO) EKRANI ----
  if (intro) {
    return (
      <Box sx={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', bgcolor: '#000', display: 'flex', flexDirection: 'column' }}>
        {/* Arka plan videosu */}
        <Box
          component="video"
          autoPlay muted loop playsInline
          poster="/KaynarMotor.jpeg"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        >
          <source src="/KaynarMotor.mp4" type="video/mp4" />
        </Box>
        {/* Karartma katmanı */}
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.1) 22%, rgba(0,0,0,0) 45%)' }} />
        {/* Sağ alt köşedeki video filigranını gizleyen karartma */}
        <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 230, height: 180, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at bottom right, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0) 92%)' }} />

        {/* Üst bar: logo + Servise Git */}
        <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 2, md: 5 }, py: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/KaynarMotor.png" alt="Kaynar Motor" style={{ height: 40, filter: 'brightness(0) invert(1)' }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff', letterSpacing: 1, fontSize: { xs: 16, md: 22 } }}>
              KAYNAR <span style={{ color: RED }}>MOTOR</span>
            </Typography>
          </Box>
          <Button variant="contained" color="error" startIcon={!isMobile && <LoginIcon />} onClick={() => navigate('/login')}
            sx={{ fontSize: { xs: 12, md: 14 }, px: { xs: 1.5, md: 2.5 }, boxShadow: '0 4px 20px rgba(198,40,40,0.5)' }}>
            Servise Git
          </Button>
        </Box>

        {/* Orta içerik — üst kısma yaslı ki videonun altındaki KAYNAR MOTOR yazısı görünebilsin */}
        <Box sx={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', textAlign: 'center', px: 2, pt: { xs: 3, md: 5 } }}>
          <Fade in timeout={800}>
            <Box sx={{ maxWidth: 1180, width: '100%' }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', letterSpacing: 3, fontWeight: 600, fontSize: { xs: 12, md: 15 }, mb: 1 }}>
                KAYNAR MOTOR'A HOŞ GELDİNİZ
              </Typography>
              <Typography variant="h2" sx={{ color: '#fff', fontWeight: 800, fontSize: { xs: 30, sm: 42, md: 56 }, lineHeight: 1.1, mb: 1.5, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
                İhtiyacınız olan her şey <span style={{ color: RED }}>tek çatı altında</span>
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: 14, md: 18 }, mb: { xs: 3, md: 5 }, maxWidth: 620, mx: 'auto' }}>
                Aşağıdan bir hizmet seçin, sizi ilgili sayfaya götürelim.
              </Typography>

              {/* Kategori kartları */}
              <Grid container spacing={1.5} justifyContent="center">
                {KATEGORILER.map((k, i) => (
                  <Grid item xs={6} sm={4} md={2} key={k.key}>
                    <Box
                      onClick={() => enterKategori(i)}
                      sx={{
                        cursor: 'pointer', height: '100%',
                        p: { xs: 1.5, md: 1.75 }, borderRadius: 2.5,
                        bgcolor: 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: '#fff',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
                        transition: 'all 0.25s ease',
                        '&:hover': {
                          bgcolor: 'rgba(198,40,40,0.85)',
                          transform: 'translateY(-5px)',
                          borderColor: RED,
                          boxShadow: '0 10px 24px rgba(198,40,40,0.45)',
                        },
                      }}
                    >
                      <Box sx={{ color: '#fff' }}>{KATEGORI_ICON[k.key]}</Box>
                      <Typography sx={{ fontWeight: 700, fontSize: { xs: 13, md: 14 }, textAlign: 'center', lineHeight: 1.2 }}>{k.label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, opacity: 0.85, fontSize: 11 }}>
                        <span>İncele</span><ArrowForwardIcon sx={{ fontSize: 13 }} />
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Fade>
        </Box>

        {/* Alt iletişim şeridi */}
        <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', pb: 2, color: 'rgba(255,255,255,0.6)' }}>
          <Typography variant="caption">© {new Date().getFullYear()} Kaynar Motor</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      {/* Tek parça siyah header — logo + menüler + Servise Git */}
      <AppBar position="sticky" sx={{ bgcolor: '#1a1a1a', borderRadius: 0 }} elevation={3}>
        <Toolbar sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 56, md: 64 }, px: { xs: 1.5, md: 3 } }}>
          <Box onClick={goHome} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, cursor: 'pointer' }}>
            <img src="/KaynarMotor.png" alt="Kaynar Motor" style={{ height: 36, filter: 'brightness(0) invert(1)' }} />
            <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: 1, fontSize: { xs: 15, md: 20 }, whiteSpace: 'nowrap' }}>
              KAYNAR <span style={{ color: RED }}>MOTOR</span>
            </Typography>
          </Box>

          {/* Masaüstü menüler — eşit aralıklı (space-evenly) dağılır */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'space-evenly', mx: 2 }}>
              <Button disableRipple onClick={goHome} startIcon={<HomeIcon />}
                sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', borderRadius: 0, px: 1,
                  '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}>
                Ana Sayfa
              </Button>
              {KATEGORILER.map((k, i) => (
                <Button key={k.key} disableRipple onClick={() => handleTab(i)}
                  sx={{
                    color: tab === i ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 13,
                    whiteSpace: 'nowrap', borderRadius: 0, px: 1,
                    borderBottom: tab === i ? `3px solid ${RED}` : '3px solid transparent',
                    '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
                  }}>
                  {k.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Mobilde hamburger menü butonu */}
          {isMobile && (
            <>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton onClick={() => setMobilMenu(true)} sx={{ color: '#fff' }} aria-label="Menü">
                <MenuIcon />
              </IconButton>
            </>
          )}

          <Button variant="contained" color="error" startIcon={!isMobile && <LoginIcon />} onClick={() => navigate('/login')}
            sx={{ flexShrink: 0, fontSize: { xs: 12, md: 14 }, px: { xs: 1.5, md: 2 } }}>
            Servise Git
          </Button>
        </Toolbar>
      </AppBar>

      {/* Mobil menü çekmecesi */}
      <Drawer anchor="right" open={mobilMenu} onClose={() => setMobilMenu(false)}
        PaperProps={{ sx: { width: 260, bgcolor: '#1a1a1a', color: '#fff' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Typography fontWeight="bold" sx={{ letterSpacing: 1 }}>KAYNAR <span style={{ color: RED }}>MOTOR</span></Typography>
          <IconButton onClick={() => setMobilMenu(false)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => { goHome(); setMobilMenu(false); }}>
              <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 38 }}><HomeIcon /></ListItemIcon>
              <ListItemText primary="Ana Sayfa" />
            </ListItemButton>
          </ListItem>
          {KATEGORILER.map((k, i) => (
            <ListItem disablePadding key={k.key}>
              <ListItemButton selected={tab === i} onClick={() => { handleTab(i); setMobilMenu(false); }}
                sx={{ '&.Mui-selected': { bgcolor: 'rgba(198,40,40,0.25)', borderLeft: `4px solid ${RED}` } }}>
                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 38 }}>{KATEGORI_ICON[k.key]}</ListItemIcon>
                <ListItemText primary={k.label} primaryTypographyProps={{ fontWeight: tab === i ? 700 : 500 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Gövde: tek sütun — üstte yatay filtre, altında 4'lü kart ızgarası */}
      <Box sx={{ flex: 1, width: '100%', maxWidth: 1400, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
        {/* Kategori iletişim şeridi */}
        {curIletisim && (curIletisim.personel_adi || curIletisim.telefon) && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'white', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <PhoneIcon color="error" />
            <Typography variant="body2">
              <strong>{KATEGORILER[tab].label}</strong> için iletişim: {curIletisim.personel_adi}
            </Typography>
            {curIletisim.telefon && (
              <Button size="small" variant="contained" color="error" href={`tel:${curIletisim.telefon}`} sx={{ ml: 'auto' }}>
                {curIletisim.telefon}
              </Button>
            )}
          </Box>
        )}

        {/* Yatay filtre çubuğu (kartların üstünde) */}
        <Paper sx={{ p: { xs: 1.5, md: 2 }, mb: 2, borderRadius: 2 }}>
          {isMotor && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="overline" color="text.secondary" sx={{ mr: 0.5 }}>Segment</Typography>
              <Chip label="Tümü" clickable onClick={() => setSegment('')}
                sx={{ fontWeight: 700, bgcolor: segment === '' ? RED : '#f0f0f0', color: segment === '' ? '#fff' : 'inherit', '&:hover': { bgcolor: segment === '' ? '#b71c1c' : '#e0e0e0' } }} />
              {segmentler.map(s => (
                <Chip key={s} label={s} clickable onClick={() => setSegment(segment === s ? '' : s)}
                  sx={{ fontWeight: 600, bgcolor: segment === s ? RED : '#f0f0f0', color: segment === s ? '#fff' : 'inherit', '&:hover': { bgcolor: segment === s ? '#b71c1c' : '#e0e0e0' } }} />
              ))}
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {isMotor && <TextField size="small" label="Maks. cc" type="number" value={ccMax} onChange={e => setCcMax(e.target.value)} sx={{ width: { xs: '47%', sm: 140 } }} />}
            {isMotor && <TextField size="small" label="Maks. km" type="number" value={kmMax} onChange={e => setKmMax(e.target.value)} sx={{ width: { xs: '47%', sm: 140 } }} />}
            <TextField size="small" label="Ara" value={q} onChange={e => setQ(e.target.value)} sx={{ flex: 1, minWidth: { xs: '100%', sm: 220 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          </Box>
        </Paper>

        {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress color="error" /></Box>
          ) : urunler.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320, color: 'text.secondary' }}>
              <Typography variant="h6">Bu kategoride şu an ilan bulunmuyor.</Typography>
            </Box>
          ) : (
            <Fade in timeout={350} key={kategori}>
              <Grid container spacing={2}>
                {urunler.map(u => (
                  <Grid item xs={6} sm={4} md={3} lg={3} key={u.id}>
                    <Card sx={{
                      height: '100%', borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                      '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 14px 30px rgba(0,0,0,0.18)' },
                      '&:hover .urun-gorsel': { transform: 'scale(1.07)' },
                    }}>
                      <CardActionArea onClick={() => openDetay(u)} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                        {/* Görsel + üzerinde etiketler */}
                        <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#e8e8e8' }}>
                          <CardMedia component="img" height={isMobile ? 180 : 250}
                            className="urun-gorsel"
                            image={u.kapak_gorsel_id ? vitrinService.gorselUrl(u.kapak_gorsel_id) : '/KaynarMotor.png'}
                            alt={u.baslik}
                            loading="lazy"
                            decoding="async"
                            sx={{ objectFit: 'cover', transition: 'transform 0.4s ease' }} />
                          {/* alt gradient */}
                          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 45%)' }} />
                          {/* etiketler sol üst */}
                          <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {u.segment && <Chip size="small" label={u.segment} sx={{ bgcolor: RED, color: '#fff', fontWeight: 700, height: 22 }} />}
                            {u.motor_cc ? <Chip size="small" label={`${u.motor_cc}cc`} sx={{ bgcolor: 'rgba(0,0,0,0.65)', color: '#fff', height: 22 }} /> : null}
                          </Box>
                          {u.one_cikan ? (
                            <Chip size="small" label="★ ÖNE ÇIKAN" sx={{ position: 'absolute', top: 8, right: 8, bgcolor: '#F9A825', color: '#1a1a1a', fontWeight: 800, height: 22, fontSize: 11 }} />
                          ) : null}
                        </Box>
                        <CardContent sx={{ flex: 1, width: '100%', p: 1.5 }}>
                          <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ fontSize: 15 }}>{u.baslik}</Typography>
                          {(u.marka || u.km) ? (
                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ mb: 0.5 }}>
                              {[u.marka, u.model, u.yil].filter(Boolean).join(' ')}{u.km ? ` • ${Number(u.km).toLocaleString('tr-TR')} km` : ''}
                            </Typography>
                          ) : null}
                          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="h6" color="error" fontWeight={800} sx={{ fontSize: 19 }}>
                              {Number(u.fiyat).toLocaleString('tr-TR')} ₺
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: RED, fontSize: 12, fontWeight: 600 }}>
                              <span>Detay</span><ArrowForwardIcon sx={{ fontSize: 14 }} />
                            </Box>
                          </Box>
                        </CardContent>
                      </CardActionArea>
                      {Number(u.fiyat) > 0 && (
                        <Box sx={{ px: 1.5, pb: 1.5 }}>
                          <Button
                            fullWidth
                            size="small"
                            variant="outlined"
                            color="inherit"
                            startIcon={<CalculateIcon />}
                            onClick={() => window.open(`/taksit/${Math.round(Number(u.fiyat))}`, '_blank')}
                            sx={{ borderColor: '#bbb', fontWeight: 700 }}
                          >
                            Nakit / Taksit Hesapla
                          </Button>
                        </Box>
                      )}
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Fade>
          )}
      </Box>

      {/* Detay Modalı */}
      <Dialog open={!!detay} onClose={() => setDetay(null)} maxWidth="md" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { maxHeight: isMobile ? '100%' : '92vh', overflow: 'hidden', borderRadius: isMobile ? 0 : 2 } }}>
        {detay && (
          <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
            <Box sx={{ position: 'relative', bgcolor: '#000' }}>
              <IconButton onClick={() => setDetay(null)} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 3, color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}>
                <CloseIcon />
              </IconButton>
              {detay.gorsel_idler && detay.gorsel_idler.length > 0 ? (
                <Box sx={{ position: 'relative' }}>
                  <img src={vitrinService.gorselUrl(detay.gorsel_idler[gorselIdx])} alt={detay.baslik}
                    decoding="async"
                    style={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }} />
                  {detay.gorsel_idler.length > 1 && (
                    <>
                      <IconButton onClick={() => setGorselIdx((gorselIdx - 1 + detay.gorsel_idler.length) % detay.gorsel_idler.length)}
                        sx={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}><PrevIcon /></IconButton>
                      <IconButton onClick={() => setGorselIdx((gorselIdx + 1) % detay.gorsel_idler.length)}
                        sx={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}><NextIcon /></IconButton>
                      <Box sx={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        {detay.gorsel_idler.map((_, i) => (
                          <Box key={i} onClick={() => setGorselIdx(i)} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: i === gorselIdx ? RED : 'rgba(255,255,255,0.6)', cursor: 'pointer' }} />
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              ) : (
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/KaynarMotor.png" alt="Kaynar Motor" style={{ height: 80, filter: 'brightness(0) invert(1)', opacity: 0.5 }} />
                </Box>
              )}
            </Box>

            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                {detay.segment && <Chip size="small" label={detay.segment} color="error" />}
                {detay.motor_cc ? <Chip size="small" label={`${detay.motor_cc} cc`} variant="outlined" /> : null}
                {detay.km ? <Chip size="small" label={`${Number(detay.km).toLocaleString('tr-TR')} km`} variant="outlined" /> : null}
                {detay.yil ? <Chip size="small" label={detay.yil} variant="outlined" /> : null}
              </Box>
              {detay.ilan_no != null && (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>İlan No: ILN-{String(detay.ilan_no).padStart(4, '0')}</Typography>
              )}
              <Typography variant="h5" fontWeight="bold">{detay.baslik}</Typography>
              {(detay.marka || detay.model) && (
                <Typography variant="subtitle1" color="text.secondary">{[detay.marka, detay.model].filter(Boolean).join(' ')}</Typography>
              )}
              <Typography variant="h4" color="error" fontWeight="bold" sx={{ my: 1 }}>
                {Number(detay.fiyat).toLocaleString('tr-TR')} ₺
              </Typography>
              {detay.aciklama && (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{detay.aciklama}</Typography>
              )}

              {detay.video_dosya_id ? (
                <Box sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', bgcolor: '#000' }}>
                  <video controls preload="none" playsInline
                    poster={detay.kapak_gorsel_id ? vitrinService.gorselUrl(detay.kapak_gorsel_id) : undefined}
                    style={{ width: '100%', maxHeight: 420, display: 'block' }}>
                    <source src={vitrinService.videoUrl(detay.video_dosya_id)} />
                  </video>
                </Box>
              ) : embedUrl ? (
                <Box sx={{ position: 'relative', pt: '56.25%', mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                  <iframe src={embedUrl} title="video" loading="lazy" allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} />
                </Box>
              ) : null}

              {/* Taksit hesaplama + (varsa) Rubik taksitli ödeme aksiyonları */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1 }}>
                {Number(detay.fiyat) > 0 && (
                  <Button fullWidth variant="outlined" color="inherit" startIcon={<CalculateIcon />}
                    onClick={() => window.open(`/taksit/${Math.round(Number(detay.fiyat))}`, '_blank')}
                    sx={{ borderColor: '#bbb' }}>
                    Nakit / Taksit Hesapla
                  </Button>
                )}
                {detay.rubik_link && (
                  <Button fullWidth variant="contained" startIcon={<CreditCardIcon />}
                    onClick={() => window.open(detay.rubik_link, '_blank', 'noopener,noreferrer')}
                    sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>
                    Taksitli Ödeme Yap
                  </Button>
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />
              {detayIletisim && (detayIletisim.personel_adi || detayIletisim.telefon) ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary">İletişim</Typography>
                    <Typography variant="subtitle1" fontWeight="500">{detayIletisim.personel_adi}</Typography>
                  </Box>
                  {detayIletisim.telefon && (
                    <Button variant="contained" color="error" size="large" startIcon={<PhoneIcon />} href={`tel:${detayIletisim.telefon}`}>
                      {detayIletisim.telefon}
                    </Button>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">İletişim için "Servise Git" üzerinden bize ulaşın.</Typography>
              )}
            </Box>
          </DialogContent>
        )}
      </Dialog>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1a1a1a', color: 'rgba(255,255,255,0.7)', py: 3, mt: 4, textAlign: 'center' }}>
        <Typography variant="body2">© {new Date().getFullYear()} Kaynar Motor</Typography>
      </Box>
    </Box>
  );
};

export default Storefront;
