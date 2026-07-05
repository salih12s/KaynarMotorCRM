import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Button, Typography, Grid, Card, CardMedia,
  CardActionArea, Chip, TextField, Stack, Dialog, DialogContent,
  IconButton, Divider, CircularProgress, useMediaQuery, useTheme, InputAdornment,
  List, ListItem, ListItemButton, ListItemText, ListItemIcon, Paper, Fade, Drawer
} from '@mui/material';
import {
  Login as LoginIcon, Close as CloseIcon, Phone as PhoneIcon, Search as SearchIcon,
  ArrowBackIosNew as PrevIcon, ArrowForwardIos as NextIcon, Menu as MenuIcon,
  TwoWheeler as TwoWheelerIcon, Checkroom as CheckroomIcon, Build as BuildIcon,
  Handyman as HandymanIcon, LocalShipping as LocalShippingIcon, VerifiedUser as VerifiedUserIcon,
  ArrowForward as ArrowForwardIcon, Home as HomeIcon,
  Calculate as CalculateIcon, CreditCard as CreditCardIcon,
  WhatsApp as WhatsAppIcon, PlayCircleOutline as PlayCircleOutlineIcon
} from '@mui/icons-material';
import { vitrinService } from '../services/api';
import { KATEGORILER, SEGMENTLER, HIZMET_KATEGORILER } from './Vitrin';
import { hesaplaTaksit, TaksitTablo, ParaInput, paraToNumber, fmtTL } from './TaksitHesaplama';

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

// Video linkini nasıl göstereceğimizi belirler: { tip: 'embed'|'file'|'link', src }
const videoKaynak = (url) => {
  if (!url) return null;
  const u = url.trim();
  // YouTube (normal + shorts)
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { tip: 'embed', src: `https://www.youtube.com/embed/${yt[1]}` };
  // Vimeo
  const vm = u.match(/vimeo\.com\/(\d+)/);
  if (vm) return { tip: 'embed', src: `https://player.vimeo.com/video/${vm[1]}` };
  // Doğrudan video dosyası linki
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) return { tip: 'file', src: u };
  // Instagram / TikTok / diğer — sayfada gömülemez, buton ile yeni sekmede aç
  return { tip: 'link', src: u };
};

// WhatsApp linki üret (TR numarası, baştaki 0 -> 90)
const waLink = (tel) => {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = '90' + d.slice(1);
  else if (!d.startsWith('90') && d.length === 10) d = '90' + d;
  return `https://wa.me/${d}`;
};

// Ana sayfa header'ından açılan, giriş gerektirmeyen taksit hesaplama penceresi.
// Müşteri nakit fiyat (ve isteğe bağlı peşinat) girip 3/6/9/12 ay taksit tablosunu görür.
const TaksitHesaplaDialog = ({ open, onClose, isMobile }) => {
  const [nakit, setNakit] = useState('');
  const [pesinat, setPesinat] = useState('');
  const nakitNum = paraToNumber(nakit);
  const pesinatNum = paraToNumber(pesinat);
  const kalan = nakitNum - pesinatNum;
  const sonuc = hesaplaTaksit(nakitNum, pesinatNum);

  const temizle = () => { setNakit(''); setPesinat(''); };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
      <Box sx={{ bgcolor: '#1a1a1a', color: '#fff', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalculateIcon />
          <Typography variant="h6" fontWeight="bold">Taksit Hesaplama</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
      </Box>
      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Nakit fiyatı girin, 3 / 6 / 9 / 12 ay taksitli ödeme seçeneklerini anında görün.
        </Typography>
        <Stack spacing={1.5}>
          <ParaInput label="Nakit Fiyat" value={nakit} onChange={setNakit} autoFocus />
          <ParaInput label="Peşinat / Peşin Ödeme" value={pesinat} onChange={setPesinat}
            helperText={pesinatNum > 0 ? `Kalan tutar: ${fmtTL(Math.max(kalan, 0))}` : 'İsteğe bağlı — boş bırakılırsa nakit fiyat üzerinden hesaplanır'} />
        </Stack>

        {nakitNum > 0 && !sonuc && (
          <Typography variant="body2" sx={{ mt: 2, color: RED }}>
            Peşinat tutarı nakit fiyata eşit veya daha büyük. Taksitlendirilecek tutar kalmadı.
          </Typography>
        )}

        {sonuc && (
          <Box sx={{ mt: 2 }}>
            {pesinatNum > 0 && (
              <Paper sx={{ p: 1.5, mb: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                <Typography variant="body2" color="text.secondary">
                  Nakit <span style={{ textDecoration: 'line-through' }}>{fmtTL(nakitNum)}</span> − Peşinat {fmtTL(pesinatNum)}
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: RED }}>{fmtTL(Math.max(kalan, 0))}</Typography>
                <Typography variant="caption" color="text.secondary">Taksitler bu tutar üzerinden hesaplanır</Typography>
              </Paper>
            )}
            <TaksitTablo sonuc={sonuc} isMobile={isMobile} />
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={temizle} sx={{ color: '#666' }}>Temizle</Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const Storefront = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const geriDonus = location.state?.storefront;

  // Giriş (video) ekranı mı yoksa kategori listesi mi gösteriliyor
  const [intro, setIntro] = useState(!geriDonus);

  const [tab, setTab] = useState(geriDonus?.tab ?? 0);
  const kategori = KATEGORILER[tab].key;
  const isMotor = kategori === 'motor';
  const isHizmet = HIZMET_KATEGORILER.includes(kategori);

  const [urunler, setUrunler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [iletisim, setIletisim] = useState({});
  const [segmentler, setSegmentler] = useState(SEGMENTLER);

  // filtreler (motor)
  const [segment, setSegment] = useState(geriDonus?.segment || '');
  const [ccMax, setCcMax] = useState(geriDonus?.ccMax || '');
  const [kmMax, setKmMax] = useState(geriDonus?.kmMax || '');
  const [q, setQ] = useState(geriDonus?.q || '');

  // detay modalı
  const [detay, setDetay] = useState(null);
  const [gorselIdx, setGorselIdx] = useState(0);

  // mobil menü (hamburger) aç/kapa
  const [mobilMenu, setMobilMenu] = useState(false);

  // Taksit hesaplama penceresi (giriş gerektirmez)
  const [taksitOpen, setTaksitOpen] = useState(false);

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

  const openDetay = (u) => {
    navigate(`/ilan/${u.id}`, { state: { storefront: { tab, segment, ccMax, kmMax, q } } });
  };

  const curIletisim = iletisim[kategori];
  const detayIletisim = detay ? iletisim[detay.kategori] : null;
  const videoBilgi = detay ? videoKaynak(detay.video_url) : null;

  // ---- GİRİŞ (VIDEO) EKRANI ----
  if (intro) {
    return (
      <Box sx={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', bgcolor: '#000', display: 'flex', flexDirection: 'column' }}>
        {/* Arka plan videosu — poster KALDIRILDI: poster (KaynarMotor.jpeg) logonun büyük hâliydi ve
            video oynayana kadar tüm ekranı kaplıyordu. Artık video yüklenene kadar arkaplan siyah kalır. */}
        <video
          autoPlay muted loop playsInline preload="auto"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, background: '#000' }}
        >
          <source src="/KaynarMotor.mp4" type="video/mp4" />
        </video>
        {/* Karartma katmanı */}
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.1) 22%, rgba(0,0,0,0) 45%)' }} />

        {/* Üst bar: logo + Servise Git */}
        <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 2, md: 5 }, py: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span className="kmt-logo-wrap" style={{ width: 36, height: 40, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              <img className="kmt-logo" src="/KaynarMotor.png" alt="Kaynar Motor" width="36" height="40"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }} />
            </span>
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff', letterSpacing: 1, fontSize: { xs: 16, md: 22 } }}>
              KAYNAR <span style={{ color: RED }}>MOTOR</span>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.5 } }}>
            <Button variant="outlined" startIcon={!isMobile && <CalculateIcon />} onClick={() => setTaksitOpen(true)}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)', fontSize: { xs: 12, md: 14 }, px: { xs: 1.25, md: 2 },
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
              Taksit Hesapla
            </Button>
            <Button variant="contained" color="error" startIcon={!isMobile && <LoginIcon />} onClick={() => navigate('/login')}
              sx={{ fontSize: { xs: 12, md: 14 }, px: { xs: 1.5, md: 2.5 }, boxShadow: '0 4px 20px rgba(198,40,40,0.5)' }}>
              Servise Git
            </Button>
          </Box>
        </Box>

        <TaksitHesaplaDialog open={taksitOpen} onClose={() => setTaksitOpen(false)} isMobile={isMobile} />

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
            <span className="kmt-logo-wrap" style={{ width: 32, height: 36, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              <img className="kmt-logo" src="/KaynarMotor.png" alt="Kaynar Motor" width="32" height="36"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }} />
            </span>
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

          {!isMobile && (
            <Button variant="outlined" startIcon={<CalculateIcon />} onClick={() => setTaksitOpen(true)}
              sx={{ flexShrink: 0, color: '#fff', borderColor: 'rgba(255,255,255,0.5)', fontSize: 14, px: 2, whiteSpace: 'nowrap',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}>
              Taksit Hesapla
            </Button>
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
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 0.5 }} />
          <ListItem disablePadding>
            <ListItemButton onClick={() => { setTaksitOpen(true); setMobilMenu(false); }}>
              <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 38 }}><CalculateIcon /></ListItemIcon>
              <ListItemText primary="Taksit Hesapla" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {/* Gövde: tek sütun — üstte yatay filtre, altında 4'lü kart ızgarası */}
      <Box sx={{ flex: 1, width: '100%', maxWidth: 1400, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
        {isHizmet ? (
          /* ---- HİZMET SAYFASI: resim + telefon + WhatsApp (ilan yok) ---- */
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Paper sx={{ overflow: 'hidden', borderRadius: 3 }}>
              {curIletisim?.gorsel_var ? (
                <Box component="img" src={`${vitrinService.iletisimGorselUrl(kategori)}?t=${curIletisim.updated_at || ''}`}
                  alt={KATEGORILER[tab].label} loading="lazy"
                  sx={{ width: '100%', maxHeight: 440, objectFit: 'cover', display: 'block' }} />
              ) : (
                <Box sx={{ height: 220, bgcolor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  <Typography variant="h6">{KATEGORILER[tab].label}</Typography>
                </Box>
              )}
              <Box sx={{ p: { xs: 2.5, md: 4 }, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>{curIletisim?.baslik || KATEGORILER[tab].label}</Typography>
                {curIletisim?.aciklama && (
                  <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap', maxWidth: 620, mx: 'auto', mb: 2 }}>{curIletisim.aciklama}</Typography>
                )}
                {curIletisim?.personel_adi && (
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>{curIletisim.personel_adi}</Typography>
                )}
                {curIletisim?.telefon ? (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ maxWidth: 460, mx: 'auto' }}>
                    <Button fullWidth size="large" variant="contained" color="error" startIcon={<PhoneIcon />} href={`tel:${curIletisim.telefon}`}>
                      {curIletisim.telefon}
                    </Button>
                    {waLink(curIletisim.telefon) && (
                      <Button fullWidth size="large" variant="contained" startIcon={<WhatsAppIcon />}
                        href={waLink(curIletisim.telefon)} target="_blank" rel="noopener noreferrer"
                        sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1da851' } }}>
                        WhatsApp
                      </Button>
                    )}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">İletişim bilgisi yakında eklenecek.</Typography>
                )}
              </Box>
            </Paper>
          </Box>
        ) : (
        <>
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
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={u.id} sx={{ display: 'flex' }}>
                    <Card sx={{
                      width: '100%', borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                      '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 14px 30px rgba(0,0,0,0.18)' },
                      '&:hover .urun-gorsel': { transform: 'scale(1.07)' },
                    }}>
                      {/* Görsel — sabit 4/3 oran (tüm kartlarda aynı yükseklik) */}
                      <CardActionArea onClick={() => openDetay(u)} sx={{ display: 'block' }}>
                        <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden', bgcolor: '#e8e8e8' }}>
                          <CardMedia component="img" className="urun-gorsel"
                            image={u.kapak_gorsel_id ? vitrinService.gorselUrl(u.kapak_gorsel_id) : '/KaynarMotor.png'}
                            alt={u.baslik} loading="lazy" decoding="async"
                            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }} />
                          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 45%)' }} />
                          <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {u.segment && <Chip size="small" label={u.segment} sx={{ bgcolor: RED, color: '#fff', fontWeight: 700, height: 22 }} />}
                            {u.motor_cc ? <Chip size="small" label={`${u.motor_cc}cc`} sx={{ bgcolor: 'rgba(0,0,0,0.65)', color: '#fff', height: 22 }} /> : null}
                          </Box>
                          {u.one_cikan ? (
                            <Chip size="small" label="★ ÖNE ÇIKAN" sx={{ position: 'absolute', top: 8, right: 8, bgcolor: '#F9A825', color: '#1a1a1a', fontWeight: 800, height: 22, fontSize: 11 }} />
                          ) : null}
                        </Box>
                      </CardActionArea>

                      {/* İçerik — dikey akış; fiyat + buton kartın dibinde sabit */}
                      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <Box onClick={() => openDetay(u)} sx={{ cursor: 'pointer' }}>
                          <Typography fontWeight="bold" sx={{ fontSize: 15, lineHeight: 1.3, minHeight: '2.6em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {u.baslik}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', minHeight: '1.3em' }}>
                            {[u.marka, u.model, u.yil].filter(Boolean).join(' ')}{u.km ? ` • ${Number(u.km).toLocaleString('tr-TR')} km` : ''}
                          </Typography>
                        </Box>

                        <Box sx={{ mt: 'auto', pt: 1 }}>
                          <Box onClick={() => openDetay(u)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6" color="error" fontWeight={800} sx={{ fontSize: 19 }}>
                              {Number(u.fiyat).toLocaleString('tr-TR')} ₺
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: RED, fontSize: 12, fontWeight: 600 }}>
                              <span>Detay</span><ArrowForwardIcon sx={{ fontSize: 14 }} />
                            </Box>
                          </Box>
                          {Number(u.fiyat) > 0 && (
                            <Button fullWidth size="small" variant="outlined" color="inherit" startIcon={<CalculateIcon />}
                              onClick={() => window.open(`/taksit/${Math.round(Number(u.fiyat))}`, '_blank')}
                              sx={{ borderColor: '#bbb', fontWeight: 700 }}>
                              Nakit / Taksit Hesapla
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Fade>
          )}
        </>
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
                  <img src="/KaynarMotor.png" alt="Kaynar Motor" width="72" height="80"
                    style={{ width: 72, height: 80, objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)', opacity: 0.5 }} />
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
              ) : videoBilgi?.tip === 'embed' ? (
                <Box sx={{ position: 'relative', pt: '56.25%', mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                  <iframe src={videoBilgi.src} title="video" loading="lazy" allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} />
                </Box>
              ) : videoBilgi?.tip === 'file' ? (
                <Box sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', bgcolor: '#000' }}>
                  <video controls preload="none" playsInline style={{ width: '100%', maxHeight: 420, display: 'block' }}>
                    <source src={videoBilgi.src} />
                  </video>
                </Box>
              ) : videoBilgi?.tip === 'link' ? (
                <Button variant="outlined" fullWidth startIcon={<PlayCircleOutlineIcon />}
                  href={videoBilgi.src} target="_blank" rel="noopener noreferrer" sx={{ mb: 2, borderColor: '#bbb', color: '#333' }}>
                  Videoyu / Gönderiyi Görüntüle
                </Button>
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

      {/* Taksit hesaplama penceresi (header'dan açılır, giriş gerektirmez) */}
      <TaksitHesaplaDialog open={taksitOpen} onClose={() => setTaksitOpen(false)} isMobile={isMobile} />

      {/* Footer */}
      <Box sx={{ bgcolor: '#1a1a1a', color: 'rgba(255,255,255,0.7)', py: 3, mt: 4, textAlign: 'center' }}>
        <Typography variant="body2">© {new Date().getFullYear()} Kaynar Motor</Typography>
      </Box>
    </Box>
  );
};

export default Storefront;
