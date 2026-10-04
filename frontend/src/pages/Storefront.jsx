import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Button, ButtonBase, Typography, TextField, Stack, Dialog, DialogContent,
  IconButton, Divider, useMediaQuery, useTheme, InputAdornment,
  List, ListItem, ListItemButton, ListItemText, ListItemIcon, Paper, Fade, Drawer, Collapse
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeIcon from '@mui/icons-material/Home';
import CalculateIcon from '@mui/icons-material/Calculate';
import FilterListIcon from '@mui/icons-material/FilterList';
import { vitrinService } from '../services/api';
import { KATEGORILER, SEGMENTLER, HIZMET_KATEGORILER, MOTOR_DURUMLARI, ilanAramaUygunMu } from './Vitrin';
import { hesaplaTaksit, TaksitTablo, ParaInput, paraToNumber, fmtTL } from './TaksitHesaplama';
import {
  VitrinTema, VitrinAcikTema, RENK, YAZI, ODAK, IlanKarti, IlanIskelet, ilanIzgarasi, iletisimKisileri, KisiDugmeleri, KisiSessiz
} from '../components/VitrinOrtak';

const RED = '#C62828';

// Motor Satışı'na girince gösterilen Sıfır / İkinci El seçim kartlarının açıklamaları
const MOTOR_DURUM_BASLIK = { sifir: 'Sıfır motorlar', ikinci_el: 'İkinci el motorlar' };
const MOTOR_DURUM_ACIKLAMA = {
  sifir: 'Kutusundan yeni, garantili motorlar.',
  ikinci_el: 'Kontrolden geçmiş, bakımlı ikinci el motorlar.',
};

// Her kategori için giriş ekranında ve mobil menüde gösterilecek ikon
const KATEGORI_ICON = {
  motor: <TwoWheelerIcon sx={{ fontSize: 30 }} />,
  aksesuar: <CheckroomIcon sx={{ fontSize: 30 }} />,
  yedek_parca: <BuildIcon sx={{ fontSize: 30 }} />,
  bakim_servis: <HandymanIcon sx={{ fontSize: 30 }} />,
  nakliye: <LocalShippingIcon sx={{ fontSize: 30 }} />,
  sigorta: <VerifiedUserIcon sx={{ fontSize: 30 }} />,
};

// Filtre grubunu kısa bir başlık ve yan yana seçeneklerle göster
const FiltreSatiri = ({ baslik, children, sx = {} }) => (
  <Box role="group" aria-label={baslik} sx={{
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1.25, rowGap: 0.75, minWidth: 0, ...sx,
  }}>
    <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'text.secondary', flexShrink: 0 }}>{baslik}</Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, minWidth: 0 }}>{children}</Box>
  </Box>
);

// Filtre seçeneği: seçiliyken kırmızı çerçeve ve hafif kırmızı zemin, değilken koyu yüzey
const Secim = ({ secili, children, ...props }) => (
  <ButtonBase aria-pressed={secili} {...props}
    sx={{
      px: 1.25, py: 0.6, minHeight: 34, borderRadius: 1.25, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, lineHeight: 1.2,
      border: '1px solid', borderColor: secili ? RENK.kirmiziAcik : RENK.cizgi,
      bgcolor: secili ? 'rgba(255,90,79,0.14)' : RENK.yuzey2, color: RENK.murekkep,
      '&:hover': { borderColor: secili ? RENK.kirmiziAcik : RENK.ikincil }, ...ODAK,
    }}>
    {children}
  </ButtonBase>
);

// Ana sayfa header'ından açılan, giriş gerektirmeyen taksit hesaplama penceresi.
// Müşteri nakit fiyat (ve isteğe bağlı peşinat) girip 3/6/9/12 ay taksit tablosunu görür.
const TaksitHesaplaDialogIc = ({ open, onClose, isMobile }) => {
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

// Pencere açık zeminli hazır bir ekran olduğu için sayfanın koyu temasından ayrı, açık temayla gösterilir
const TaksitHesaplaDialog = (props) => <VitrinAcikTema><TaksitHesaplaDialogIc {...props} /></VitrinAcikTema>;

const Storefront = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // Filtre sütunu md altında üste taşınır ve aç/kapa olur
  const darEkran = useMediaQuery(theme.breakpoints.down('md'));
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

  // filtreler (motor) — önce Sıfır / İkinci El seçilir, sonra marka/segment ile daraltılır
  const [motorDurumu, setMotorDurumu] = useState(geriDonus?.motorDurumu || '');
  const [marka, setMarka] = useState(geriDonus?.marka || '');
  const [markalar, setMarkalar] = useState([]);
  const [segment, setSegment] = useState(geriDonus?.segment || '');
  const [ccMax, setCcMax] = useState(geriDonus?.ccMax || '');
  const [kmMax, setKmMax] = useState(geriDonus?.kmMax || '');
  const [q, setQ] = useState(geriDonus?.q || '');

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
        params.durum = motorDurumu;
        if (marka) params.marka = marka;
        if (segment) params.segment = segment;
        if (ccMax) params.cc_max = ccMax;
        if (kmMax) params.km_max = kmMax;
      }
      // İsimle arama (q) sunucuya gitmez: yüklenen liste üzerinde anında, Türkçe karakter farkı gözetmeden süzülür
      const res = await vitrinService.getAll(params);
      setUrunler(res.data);
    } catch { setUrunler([]); }
    setLoading(false);
  }, [kategori, isMotor, motorDurumu, marka, segment, ccMax, kmMax]);

  const gorunenUrunler = useMemo(() => urunler.filter(u => ilanAramaUygunMu(u, q)), [urunler, q]);
  const aramaVar = q.trim() !== '';

  useEffect(() => { loadIletisim(); }, [loadIletisim]);

  // dinamik segmentleri yükle
  useEffect(() => {
    vitrinService.getSegmentler()
      .then(res => { if (res.data?.length) setSegmentler(res.data.map(s => s.ad)); })
      .catch(() => { /* varsayılan listede kalır */ });
  }, []);

  // Seçilen durumdaki (sıfır / ikinci el) yayındaki ilanların markaları — admin ne marka girdiyse o listelenir
  useEffect(() => {
    if (!isMotor || !motorDurumu) { setMarkalar([]); return; }
    let active = true;
    vitrinService.getMarkalar(motorDurumu)
      .then(res => { if (active) setMarkalar(res.data.map(m => m.marka)); })
      .catch(() => { if (active) setMarkalar([]); });
    return () => { active = false; };
  }, [isMotor, motorDurumu]);

  // Dar ekranda filtre paneli aç/kapa; masaüstünde hep açık
  const [filtreAcik, setFiltreAcik] = useState(false);
  const aktifFiltreSayisi = [marka, segment, ccMax, kmMax].filter(Boolean).length;
  const filtreleriTemizle = () => { setMarka(''); setSegment(''); setCcMax(''); setKmMax(''); };

  // Sıfır / İkinci El seçilmeden motor listesi gösterilmez
  const durumSecimi = isMotor && !motorDurumu;

  // Seçim ekranındaki iki karo için: o türde kaç ilan var ve arka plana hangi fotoğraf konacak
  const [durumOzet, setDurumOzet] = useState({});
  useEffect(() => {
    if (intro || !durumSecimi) return undefined;
    let active = true;
    Promise.all(MOTOR_DURUMLARI.map(d =>
      vitrinService.getAll({ kategori: 'motor', durum: d.key }).then(res => [d.key, res.data]).catch(() => [d.key, []])
    )).then(sonuclar => {
      if (!active) return;
      const ozet = {};
      sonuclar.forEach(([key, liste]) => {
        ozet[key] = { adet: liste.length, kapak: liste.find(u => u.kapak_gorsel_id)?.kapak_gorsel_id || null };
      });
      setDurumOzet(ozet);
    });
    return () => { active = false; };
  }, [intro, durumSecimi]);

  // filtre değişince (kısa debounce ile) yükle — giriş ekranındayken yükleme yapma
  useEffect(() => {
    if (intro || durumSecimi) return;
    const t = setTimeout(loadUrunler, 250);
    return () => clearTimeout(t);
  }, [loadUrunler, intro, durumSecimi]);

  // sekme değişince filtreleri sıfırla + eski listeyi anında temizle (yumuşak geçiş)
  const handleTab = (v) => {
    setTab(v);
    setMotorDurumu(''); setMarka('');
    setSegment(''); setCcMax(''); setKmMax(''); setQ('');
    setUrunler([]); setLoading(true);
  };

  // Sıfır / İkinci El değişince marka ve km filtreleri o türe ait olmayabilir → sıfırla
  const secMotorDurumu = (d) => {
    if (d === motorDurumu) return;
    setMotorDurumu(d); setMarka(''); setKmMax('');
    setUrunler([]); setLoading(true);
    window.scrollTo(0, 0);
  };

  // Giriş ekranından bir kategoriye gir
  const enterKategori = (i) => { handleTab(i); setIntro(false); window.scrollTo(0, 0); };
  const goHome = () => { setIntro(true); setUrunler([]); };

  const openDetay = (u) => {
    navigate(`/ilan/${u.id}`, { state: { storefront: { tab, motorDurumu, marka, segment, ccMax, kmMax, q } } });
  };

  const curIletisim = iletisim[kategori];
  const kisiler = iletisimKisileri(curIletisim);
  const sayfaBasligi = isMotor ? MOTOR_DURUM_BASLIK[motorDurumu] : KATEGORILER[tab].label;

  // ---- GİRİŞ (VIDEO) EKRANI ----
  // Masaüstünde video tüm ekranı kaplar; videonun kendi logosu ortada olduğu için yazılar üst ve alt kenara dizilir.
  // Telefonda dikey ekran videoyu kırpacağı (kanatlar kesilir) için video 16:9 olarak kendi bandında gösterilir.
  if (intro) {
    return (
      <Box sx={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', bgcolor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: YAZI.govde }}>
        {/* Üst bar: logo + Taksit Hesapla + Servise Git */}
        <Box sx={{
          position: { xs: 'relative', md: 'absolute' }, top: 0, left: 0, right: 0, zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: { xs: 2, md: 5 }, py: { xs: 1.5, md: 3 },
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span className="kmt-logo-wrap" style={{ width: 36, height: 40, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              <img className="kmt-logo" src="/KaynarMotor.png" alt="Kaynar Motor" width="36" height="40"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }} />
            </span>
            <Typography sx={{ fontWeight: 700, letterSpacing: 1, fontSize: { xs: 14, md: 22 }, whiteSpace: 'nowrap' }}>
              KAYNAR <span style={{ color: RED }}>MOTOR</span>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.5 } }}>
            <Button variant="outlined" startIcon={!isMobile && <CalculateIcon />} onClick={() => setTaksitOpen(true)}
              sx={{ whiteSpace: 'nowrap', color: '#fff', borderColor: 'rgba(255,255,255,0.6)', fontSize: { xs: 12, md: 14 }, px: { xs: 1.25, md: 2 },
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
              Taksit Hesapla
            </Button>
            <Button variant="contained" color="error" startIcon={!isMobile && <LoginIcon />} onClick={() => navigate('/login')}
              sx={{ whiteSpace: 'nowrap', fontSize: { xs: 12, md: 14 }, px: { xs: 1.5, md: 2.5 }, boxShadow: '0 4px 20px rgba(198,40,40,0.5)' }}>
              Servise Git
            </Button>
          </Box>
        </Box>

        {/* Arka plan videosu */}
        <Box sx={{
          position: { xs: 'relative', md: 'absolute' }, inset: { md: 0 }, width: '100%', height: { md: '100%' },
          aspectRatio: { xs: '16 / 9', md: 'auto' }, zIndex: 0, bgcolor: '#000',
        }}>
          <video
            autoPlay muted loop playsInline preload="auto"
            // Hareketi azaltma tercihi açıksa video oynatılmaz, ilk karede durur
            ref={(v) => { if (v && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('autoplay'); v.pause(); } }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center bottom', background: '#000' }}
          >
            <source src="/KaynarMotorYeniVideo.mp4" type="video/mp4" />
          </video>
          {/* Yazıların okunması için üst ve alt kenarda hafif karartma; videonun ortası açık kalır */}
          <Box sx={{ position: 'absolute', inset: 0, display: { xs: 'none', md: 'block' },
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.18) 24%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.78) 100%)' }} />
        </Box>

        {/* İçerik: masaüstünde başlık üstte, kategori şeridi altta; telefonda videonun altında alt alta */}
        <Box sx={{
          position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: { md: 'space-between' }, alignItems: 'center', textAlign: 'center',
          px: { xs: 2, md: 5 }, pt: { xs: 2.5, md: 12 }, pb: { xs: 2, md: 2.5 },
        }}>
          <Fade in timeout={800}>
            <Box sx={{ maxWidth: 900, width: '100%' }}>
              <Typography component="h1" sx={{
                fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 34, sm: 44, md: 58 }, lineHeight: 1.02,
                textShadow: '0 2px 24px rgba(0,0,0,0.7)',
              }}>
                İhtiyacınız olan her şey <span style={{ color: RENK.kirmiziAcik }}>tek çatı altında</span>
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: { xs: 15, md: 18 }, mt: 1.25, textShadow: '0 1px 12px rgba(0,0,0,0.7)' }}>
                Aşağıdan bir hizmet seçin, sizi ilgili sayfaya götürelim.
              </Typography>
            </Box>
          </Fade>

          <Box sx={{ width: '100%', maxWidth: 1400, mt: { xs: 3, md: 0 } }}>
            {/* Kategori kartları */}
            <Box sx={{ display: 'grid', gap: { xs: 1, md: 1.25 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(6, minmax(0, 1fr))' } }}>
              {KATEGORILER.map((k, i) => (
                <ButtonBase key={k.key} onClick={() => enterKategori(i)}
                  sx={{
                    display: 'flex', alignItems: 'center', textAlign: 'left', gap: { xs: 1, md: 1.25 },
                    minWidth: 0, minHeight: { xs: 72, md: 78 }, p: { xs: 1.25, md: 1.5 }, borderRadius: 2, color: '#fff', fontFamily: 'inherit',
                    bgcolor: 'rgba(14,14,16,0.66)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.26)', ...ODAK,
                    transition: 'background-color .2s ease, border-color .2s ease, transform .2s ease',
                    '&:hover': { bgcolor: 'rgba(34,21,23,0.88)', borderColor: RENK.kirmiziAcik, transform: 'translateY(-2px)' },
                  }}>
                  <Box sx={{ width: { xs: 32, md: 36 }, height: { xs: 32, md: 36 }, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.25,
                    bgcolor: 'rgba(198,40,40,0.22)', color: RENK.kirmiziAcik,
                    '& .MuiSvgIcon-root': { fontSize: { xs: 20, md: 22 } } }}>
                    {KATEGORI_ICON[k.key]}
                  </Box>
                  <Typography sx={{ flex: 1, minWidth: 0, fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 17, md: 19 }, lineHeight: 1.05 }}>{k.label}</Typography>
                  <ArrowForwardIcon sx={{ flexShrink: 0, fontSize: 16, color: 'rgba(255,255,255,0.72)' }} />
                </ButtonBase>
              ))}
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mt: { xs: 2.5, md: 2 }, color: 'rgba(255,255,255,0.6)' }}>
              © {new Date().getFullYear()} Kaynar Motor
            </Typography>
          </Box>
        </Box>

        <TaksitHesaplaDialog open={taksitOpen} onClose={() => setTaksitOpen(false)} isMobile={isMobile} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: RENK.zemin, color: RENK.murekkep, display: 'flex', flexDirection: 'column', fontFamily: YAZI.govde }}>
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

      {isHizmet ? (
        /* ---- HİZMET SAYFASI: resim + telefon + WhatsApp (ilan yok) ---- */
        <Box sx={{ flex: 1, width: '100%', maxWidth: 900, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
          <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: 3, border: `1px solid ${RENK.cizgi}` }}>
            {curIletisim?.gorsel_var ? (
              <Box component="img" src={`${vitrinService.iletisimGorselUrl(kategori)}?t=${curIletisim.updated_at || ''}`}
                alt={KATEGORILER[tab].label} loading="lazy"
                sx={{ width: '100%', maxHeight: 440, objectFit: 'cover', display: 'block' }} />
            ) : (
              <Box sx={{ height: 220, bgcolor: RENK.asfalt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                <Typography variant="h6">{KATEGORILER[tab].label}</Typography>
              </Box>
            )}
            <Box sx={{ p: { xs: 2.5, md: 4 } }}>
              <Typography component="h1" sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 30, md: 42 }, lineHeight: 1.05 }}>
                {curIletisim?.baslik || KATEGORILER[tab].label}
              </Typography>
              {curIletisim?.aciklama && (
                <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap', maxWidth: '62ch', mt: 1.5, lineHeight: 1.6 }}>{curIletisim.aciklama}</Typography>
              )}
              {kisiler.length > 0 ? (
                <Stack spacing={2} sx={{ mt: 3 }}>
                  {kisiler.map(k => (
                    <Box key={`${k.ad}-${k.tel}`} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 2, rowGap: 1 }}>
                      {k.ad && <Typography fontWeight={600} sx={{ minWidth: 140 }}>{k.ad}</Typography>}
                      <KisiDugmeleri kisi={k} boyut="large" />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary" sx={{ mt: 3 }}>İletişim bilgisi yakında eklenecek.</Typography>
              )}
            </Box>
          </Paper>
        </Box>
      ) : durumSecimi ? (
        /* ---- MOTOR: önce Sıfır / İkinci El seçimi ---- */
        <Box sx={{ flex: 1, width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 3, md: 8 } }}>
          <Typography component="h1" sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 34, md: 52 }, lineHeight: 1 }}>
            Nasıl bir motor arıyorsunuz?
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: { xs: 3, md: 4 } }}>
            Seçiminize göre yalnızca o motorları listeleyelim.
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {MOTOR_DURUMLARI.map(d => {
              const ozet = durumOzet[d.key];
              return (
                <ButtonBase key={d.key} onClick={() => secMotorDurumu(d.key)}
                  sx={{
                    position: 'relative', overflow: 'hidden', display: 'block', textAlign: 'left',
                    minHeight: { xs: 190, md: 300 }, borderRadius: 3,
                    bgcolor: RENK.asfalt, color: '#fff', fontFamily: 'inherit', fontSize: 16, ...ODAK,
                    '@media (prefers-reduced-motion: no-preference)': {
                      '& .secim-gorsel': { transition: 'transform .6s cubic-bezier(.2,.7,.2,1)' },
                      '&:hover .secim-gorsel': { transform: 'scale(1.05)' },
                      '& .secim-ok': { transition: 'transform .2s ease' },
                      '&:hover .secim-ok': { transform: 'translateX(6px)' },
                    },
                  }}>
                  {/* Arka planda o türden bir ilanın fotoğrafı; yazı okunabilsin diye soldan koyulaştırılır */}
                  {ozet?.kapak && (
                    <Box component="img" className="secim-gorsel" src={vitrinService.gorselUrl(ozet.kapak)} alt=""
                      sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(20,20,20,.95) 0%, rgba(20,20,20,.78) 50%, rgba(20,20,20,.3) 100%)' }} />
                  <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', height: '100%', minHeight: 'inherit', p: { xs: 3, md: 4 } }}>
                    <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 32, md: 44 }, lineHeight: 1 }}>{MOTOR_DURUM_BASLIK[d.key]}</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.78)', mt: 1, maxWidth: '26ch' }}>{MOTOR_DURUM_ACIKLAMA[d.key]}</Typography>
                    <Box sx={{ mt: 'auto', pt: 3, display: 'inline-flex', alignItems: 'center', gap: 1, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      <span>{ozet?.adet ? `${ozet.adet} ilanı gör` : 'İlanları gör'}</span>
                      <ArrowForwardIcon className="secim-ok" sx={{ fontSize: 20, color: RENK.kirmizi }} />
                    </Box>
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
        </Box>
      ) : (
        <>
          {/* Sayfa başı: başlık, ilan sayısı, arama; masaüstünde altında iletişim kişileri */}
          <Box sx={{ maxWidth: 1400, width: '100%', mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'flex-end' }, gap: { xs: 2, md: 4 } }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography component="h1" sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 38, md: 48 }, lineHeight: 1 }}>
                  {sayfaBasligi}
                </Typography>
                <Typography color="text.secondary" aria-live="polite" sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                  {loading ? 'İlanlar yükleniyor…' : aramaVar ? `"${q.trim()}" için ${gorunenUrunler.length} ilan` : `${gorunenUrunler.length} ilan`}
                </Typography>
              </Box>
              <TextField size="small" value={q} onChange={e => setQ(e.target.value)}
                placeholder={isMotor ? 'Marka, model veya ilan no ara' : 'Ürün adı veya ilan no ara'}
                inputProps={{ 'aria-label': 'İlan ara', enterKeyHint: 'search' }}
                sx={{ width: { xs: '100%', md: 380 }, '& .MuiOutlinedInput-root': { bgcolor: RENK.yuzey, borderRadius: 2 } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                  endAdornment: q ? (
                    <InputAdornment position="end">
                      <IconButton size="small" edge="end" onClick={() => setQ('')} aria-label="Aramayı temizle"><CloseIcon fontSize="small" /></IconButton>
                    </InputAdornment>
                  ) : null,
                }} />
            </Box>

            {/* Telefonda iletişim kişileri listenin altında gösterilir; ilk ilan ekranın üstünde kalsın */}
            {kisiler.length > 0 && (
              <Box sx={{ mt: 1.5, display: { xs: 'none', md: 'flex' }, flexWrap: 'wrap', alignItems: 'center', columnGap: 2.5, rowGap: 0.75 }}>
                <Typography color="text.secondary" sx={{ fontSize: 14.5 }}>Sorularınız için arayın</Typography>
                {kisiler.map(k => <KisiSessiz key={`${k.ad}-${k.tel}`} kisi={k} />)}
              </Box>
            )}
          </Box>

          {/* Motor filtreleri: masaüstünde iki kısa satır, dar ekranda açılır panel */}
          {isMotor && (
            <Box component="section" aria-label="Filtreler" sx={{ maxWidth: 1400, width: '100%', mx: 'auto', px: { xs: 2, md: 3 }, mt: { xs: 2, md: 2 } }}>
              {darEkran && (
                <Button fullWidth variant="outlined" color="inherit" startIcon={<FilterListIcon />} onClick={() => setFiltreAcik(v => !v)}
                  aria-expanded={filtreAcik}
                  sx={{ bgcolor: RENK.yuzey, borderColor: RENK.cizgi, justifyContent: 'flex-start', py: 1 }}>
                  {aktifFiltreSayisi > 0 ? `Filtrele (${aktifFiltreSayisi} seçili)` : 'Filtrele'}
                </Button>
              )}
              <Collapse in={!darEkran || filtreAcik} timeout="auto">
                <Box sx={{ mt: darEkran ? 1 : 0, p: { xs: 1.5, md: 1.75 }, bgcolor: RENK.yuzey,
                  border: `1px solid ${RENK.cizgi}`, borderRadius: 2.5,
                  display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto' }, columnGap: 2, rowGap: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 2.5, rowGap: 1.25, minWidth: 0 }}>
                    <FiltreSatiri baslik="Durum">
                      {MOTOR_DURUMLARI.map(d => (
                        <Secim key={d.key} secili={motorDurumu === d.key} onClick={() => secMotorDurumu(d.key)}>{d.label}</Secim>
                      ))}
                    </FiltreSatiri>
                    {markalar.length > 0 && (
                      <FiltreSatiri baslik="Marka">
                        <Secim secili={marka === ''} onClick={() => setMarka('')}>Tümü</Secim>
                        {markalar.map(m => <Secim key={m} secili={marka === m} onClick={() => setMarka(marka === m ? '' : m)}>{m}</Secim>)}
                      </FiltreSatiri>
                    )}
                  </Box>
                  <FiltreSatiri baslik="Sınır" sx={{ gridRow: { xs: 3, lg: '1 / 3' }, gridColumn: { lg: 2 }, alignSelf: 'start' }}>
                    <TextField size="small" label="En fazla cc" type="number" value={ccMax} onChange={e => setCcMax(e.target.value)}
                      sx={{ width: 132, '& .MuiOutlinedInput-root': { bgcolor: RENK.zemin } }} />
                    {motorDurumu !== 'sifir' && (
                      <TextField size="small" label="En fazla km" type="number" value={kmMax} onChange={e => setKmMax(e.target.value)}
                        sx={{ width: 132, '& .MuiOutlinedInput-root': { bgcolor: RENK.zemin } }} />
                    )}
                    {aktifFiltreSayisi > 0 && (
                      <Button onClick={filtreleriTemizle} size="small" sx={{ p: 0.5, minWidth: 0, fontWeight: 600, color: RENK.kirmiziAcik }}>
                        Temizle
                      </Button>
                    )}
                  </FiltreSatiri>
                  <Box sx={{ gridRow: 2, gridColumn: { lg: 1 }, pt: 1.25, borderTop: `1px solid ${RENK.cizgi}` }}>
                    <FiltreSatiri baslik="Segment">
                      <Secim secili={segment === ''} onClick={() => setSegment('')}>Tümü</Secim>
                      {segmentler.map(s => <Secim key={s} secili={segment === s} onClick={() => setSegment(segment === s ? '' : s)}>{s}</Secim>)}
                    </FiltreSatiri>
                  </Box>
                </Box>
              </Collapse>
            </Box>
          )}

          {/* İlan ızgarası */}
          <Box sx={{ flex: 1, width: '100%', maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2.5, md: 2.5 } }}>
            {loading ? (
              <Box sx={ilanIzgarasi(isMotor)} role="status" aria-label="İlanlar yükleniyor">
                {Array.from({ length: isMotor ? 6 : 8 }, (_, i) => <IlanIskelet key={i} buyuk={isMotor} />)}
              </Box>
            ) : gorunenUrunler.length === 0 ? (
              <Box sx={{ py: { xs: 5, md: 9 }, maxWidth: '46ch' }}>
                {aramaVar && urunler.length > 0 ? (
                  <>
                    <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: 28, lineHeight: 1.1 }}>"{q.trim()}" ile eşleşen ilan yok</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>Marka ya da model adını daha kısa yazmayı deneyin.</Typography>
                    <Button variant="outlined" color="inherit" onClick={() => setQ('')} sx={{ mt: 2 }}>Aramayı temizle</Button>
                  </>
                ) : isMotor && aktifFiltreSayisi > 0 ? (
                  <>
                    <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: 28, lineHeight: 1.1 }}>Bu filtrelere uyan motor yok</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>Bir filtreyi kaldırırsanız daha fazla ilan görürsünüz.</Typography>
                    <Button variant="outlined" color="inherit" onClick={filtreleriTemizle} sx={{ mt: 2 }}>Filtreleri temizle</Button>
                  </>
                ) : (
                  <>
                    <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: 28, lineHeight: 1.1 }}>
                      {isMotor ? `Şu an ${motorDurumu === 'sifir' ? 'sıfır' : 'ikinci el'} motor ilanı yok` : 'Bu kategoride şu an ilan yok'}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>Yeni gelenleri öğrenmek için bizi arayabilirsiniz.</Typography>
                  </>
                )}
              </Box>
            ) : (
              <Fade in timeout={300} key={`${kategori}-${motorDurumu}`}>
                <Box sx={ilanIzgarasi(isMotor)}>
                  {gorunenUrunler.map(u => <IlanKarti key={u.id} u={u} kucuk={!isMotor} onClick={() => openDetay(u)} />)}
                </Box>
              </Fade>
            )}

            {kisiler.length > 0 && (
              <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 4, pt: 2.5, borderTop: `1px solid ${RENK.cizgi}` }}>
                <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: 24, lineHeight: 1.1, mb: 1.5 }}>Sorularınız için arayın</Typography>
                <Stack spacing={1.5}>
                  {kisiler.map(k => (
                    <Box key={`${k.ad}-${k.tel}`}>
                      {k.ad && <Typography fontWeight={600} sx={{ mb: 0.5 }}>{k.ad}</Typography>}
                      <KisiDugmeleri kisi={k} tamGenislik />
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </>
      )}

      {/* Taksit hesaplama penceresi (header'dan açılır, giriş gerektirmez) */}
      <TaksitHesaplaDialog open={taksitOpen} onClose={() => setTaksitOpen(false)} isMobile={isMobile} />

      {/* Footer */}
      <Box sx={{ bgcolor: RENK.asfalt, color: 'rgba(255,255,255,0.7)', py: 3, mt: 6, textAlign: 'center' }}>
        <Typography variant="body2">© {new Date().getFullYear()} Kaynar Motor</Typography>
      </Box>
    </Box>
  );
};

// Vitrin teması (yazı tipi, renkler) yalnızca müşteri sayfalarını sarar; yönetim paneli etkilenmez
const StorefrontSayfa = () => <VitrinTema><Storefront /></VitrinTema>;

export default StorefrontSayfa;
