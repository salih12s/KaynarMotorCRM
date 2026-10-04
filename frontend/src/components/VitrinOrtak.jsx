import React from 'react';
import { Box, Button, ButtonBase, IconButton, Skeleton, Typography } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { vitrinService } from '../services/api';
import { hesaplaTaksit } from '../pages/TaksitHesaplama';

// Müşteriye açık vitrin sayfalarının (ilan listesi + ilan detayı) ortak görsel dili.
// Yönetim panelinin temasından bağımsızdır; yalnızca bu sayfaları sarar.

export const RENK = {
  asfalt: '#161618',      // üst bar, görsel sahnesi
  zemin: '#0E0E10',       // sayfa zemini (karanlık showroom)
  yuzey: '#18181B',       // kart ve panel yüzeyi
  yuzey2: '#222226',      // seçilmemiş düğme, içe gömülü alanlar
  murekkep: '#F3F3F4',    // ana yazı (koyu zeminde açık)
  ikincil: '#A3A7AE',
  cizgi: '#2B2C31',
  kirmizi: '#C62828',     // marka rengi: dolu düğmeler (üstüne beyaz yazı gelir)
  kirmiziAcik: '#FF5A4F', // koyu zeminde kırmızı yazı (fiyat) için daha parlak ton
  sari: '#F4C20D',        // öne çıkan etiketi
  whatsapp: '#1FA855',
};

// Barlow: plaka ve yol tabelası yazısından türetilmiş bir aile. Başlık ve rakamlarda dar kesimi kullanılır.
export const YAZI = {
  govde: '"Barlow", "Segoe UI", system-ui, sans-serif',
  baslik: '"Barlow Condensed", "Barlow", "Segoe UI", sans-serif',
};

const ortakTipografi = {
  fontFamily: YAZI.govde,
  fontSize: 15,
  button: { textTransform: 'none', fontWeight: 600 },
};

// Müşteri sayfalarının ana teması: koyu showroom. Yönetim panelinden bağımsızdır.
const vitrinTema = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: RENK.kirmizi },
    error: { main: RENK.kirmizi },
    secondary: { main: RENK.murekkep, contrastText: '#111111' },
    text: { primary: RENK.murekkep, secondary: RENK.ikincil },
    background: { default: RENK.zemin, paper: RENK.yuzey },
    divider: RENK.cizgi,
  },
  shape: { borderRadius: 8 },
  typography: ortakTipografi,
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } } },
    // Koyu temada MUI yüzeylere otomatik açık bir ton bindirir; kartların rengi aynı kalsın
    MuiPaper: { styleOverrides: { root: { borderRadius: 12, backgroundImage: 'none' } } },
  },
});

// Açık tema: taksit hesaplama penceresi gibi açık zeminli hazır ekranlar bu temayla sarılır
const acikTema = createTheme({
  palette: { primary: { main: '#C62828' }, error: { main: '#C62828' } },
  typography: ortakTipografi,
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
  },
});

export const VitrinTema = ({ children }) => <ThemeProvider theme={vitrinTema}>{children}</ThemeProvider>;
export const VitrinAcikTema = ({ children }) => <ThemeProvider theme={acikTema}>{children}</ThemeProvider>;

// Klavye ile gezinenler için belirgin odak çerçevesi
export const ODAK = { '&:focus-visible': { outline: `3px solid ${RENK.kirmiziAcik}`, outlineOffset: 3 } };

export const tlYaz = (v) => `${Math.round(Number(v) || 0).toLocaleString('tr-TR')} ₺`;

// WhatsApp linki üret (TR numarası, baştaki 0 -> 90)
export const waLink = (tel) => {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = `90${d.slice(1)}`;
  else if (!d.startsWith('90') && d.length === 10) d = `90${d}`;
  return `https://wa.me/${d}`;
};

// Video linkini nasıl göstereceğimizi belirler: { tip: 'embed'|'file'|'link', src }
export const videoKaynak = (url) => {
  if (!url) return null;
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { tip: 'embed', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = u.match(/vimeo\.com\/(\d+)/);
  if (vm) return { tip: 'embed', src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) return { tip: 'file', src: u };
  // Instagram / TikTok / diğer — sayfada gömülemez, buton ile yeni sekmede aç
  return { tip: 'link', src: u };
};

// En uzun vadedeki aylık taksit (taksit hesaplama sayfasıyla aynı oranlar). Fiyat yoksa null.
export const enUzunTaksit = (fiyat) => {
  const sonuc = hesaplaTaksit(fiyat);
  return sonuc ? sonuc[sonuc.length - 1] : null;
};

// Kategori iletişim kaydından kişi listesi (ikinci personel isteğe bağlıdır)
export const iletisimKisileri = (iletisim) => (iletisim ? [
  { ad: iletisim.personel_adi, tel: iletisim.telefon },
  { ad: iletisim.personel_adi_2, tel: iletisim.telefon_2 },
].filter(k => k.ad || k.tel) : []);

// Bir kişi için "Ara" ve "WhatsApp" düğmeleri
export const KisiDugmeleri = ({ kisi, boyut = 'medium', tamGenislik = false }) => (
  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
    {kisi.tel && (
      <Button size={boyut} variant="contained" color="error" disableElevation startIcon={<PhoneIcon />}
        href={`tel:${kisi.tel}`} sx={{ flex: tamGenislik ? 1 : 'none', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {kisi.tel}
      </Button>
    )}
    {waLink(kisi.tel) && (
      <Button size={boyut} variant="outlined" startIcon={<WhatsAppIcon />}
        href={waLink(kisi.tel)} target="_blank" rel="noopener noreferrer"
        sx={{ flex: tamGenislik ? 1 : 'none', whiteSpace: 'nowrap', color: RENK.whatsapp, borderColor: RENK.whatsapp,
          '&:hover': { borderColor: RENK.whatsapp, bgcolor: 'rgba(31,168,85,0.12)' } }}>
        WhatsApp
      </Button>
    )}
  </Box>
);

// İlanın kısa künyesi: yıl, km, motor hacmi, segment. Aksesuar/yedek parçada marka.
const kunyeParcalari = (u) => {
  if (u.kategori !== 'motor') return [u.marka].filter(Boolean);
  const sifir = u.motor_durumu === 'sifir';
  return [
    u.yil,
    sifir ? 'Sıfır km' : (u.km ? `${Number(u.km).toLocaleString('tr-TR')} km` : null),
    u.motor_cc ? `${u.motor_cc} cc` : null,
    u.segment,
  ].filter(Boolean);
};

// İlan kartı. Fotoğrafın üzerine hiçbir şey konmaz: etiketler, başlık, ölçüler ve fiyat kartın içinde, fotoğrafın altındadır.
// Motor kartında ayrıca üç ölçü (yıl, km, hacim) satırı vardır. Kartın tamamı tek bir düğmedir.
export const IlanKarti = ({ u, onClick, kucuk = false }) => {
  const motor = u.kategori === 'motor';
  const sifir = u.motor_durumu === 'sifir';
  const fiyat = Number(u.fiyat) || 0;
  const taksit = enUzunTaksit(fiyat);
  const buyuk = motor && !kucuk;
  const olculer = buyuk ? [
    u.yil ? { deger: String(u.yil), etiket: 'Model yılı' } : null,
    sifir
      ? { deger: 'Sıfır', etiket: 'Kilometre' }
      : (u.km ? { deger: Number(u.km).toLocaleString('tr-TR'), etiket: 'Kilometre' } : null),
    u.motor_cc ? { deger: String(u.motor_cc), etiket: 'Hacim (cc)' } : null,
  ].filter(Boolean) : [];
  const etiketler = [
    sifir && { metin: 'Sıfır', zemin: '#FFFFFF', renk: '#111111' },
    buyuk && u.segment && { metin: u.segment, zemin: RENK.yuzey2, renk: RENK.murekkep },
    u.one_cikan && { metin: 'Öne çıkan', zemin: RENK.sari, renk: '#111111' },
  ].filter(Boolean);
  const kunye = kunyeParcalari(u);
  const gorsel = u.kapak_gorsel_id ? vitrinService.gorselUrl(u.kapak_gorsel_id) : null;

  return (
    <ButtonBase component="div" onClick={onClick}
      aria-label={`${u.baslik}${fiyat > 0 ? `, ${tlYaz(fiyat)}` : ''}`}
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', width: '100%', textAlign: 'left',
        bgcolor: RENK.yuzey, border: `1px solid ${RENK.cizgi}`, borderRadius: 3, overflow: 'hidden', ...ODAK,
        '&:hover': { borderColor: RENK.kirmizi },
        '@media (prefers-reduced-motion: no-preference)': {
          transition: 'border-color .2s ease',
          '& .ilan-gorsel': { transition: 'transform .6s cubic-bezier(.2,.7,.2,1)' },
          '&:hover .ilan-gorsel': { transform: 'scale(1.04)' },
        },
      }}>
      {/* Fotoğraf: üstünde yazı, etiket ya da karartma yok */}
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden', bgcolor: RENK.yuzey2 }}>
        <Box component="img" className="ilan-gorsel" src={gorsel || '/KaynarMotor.png'} alt="" loading="lazy" decoding="async"
          sx={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: gorsel ? 'cover' : 'contain',
            p: gorsel ? 0 : 6, opacity: gorsel ? 1 : 0.25, filter: gorsel ? 'none' : 'brightness(0) invert(1)',
          }} />
      </Box>

      <Box sx={{ px: 2, pt: 1.5, pb: olculer.length ? 1.5 : 1.25, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {etiketler.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
            {etiketler.map(e => <Etiket key={e.metin} zemin={e.zemin} renk={e.renk}>{e.metin}</Etiket>)}
          </Box>
        )}
        <Typography component="h3" sx={{
          fontFamily: YAZI.baslik, fontWeight: 700, fontSize: buyuk ? 23 : 19, lineHeight: 1.15,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {u.baslik}
        </Typography>
        {!buyuk && kunye.length > 0 && (
          <Box sx={{
            mt: 0.5, display: 'flex', flexWrap: 'wrap', rowGap: 0.25, color: 'text.secondary', fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums',
            '& > span + span': { ml: 1, pl: 1, borderLeft: `1px solid ${RENK.cizgi}` },
            // Küçük kartlar telefonda dar kalır: künye tek satıra sığsın diye yalnızca ilk iki bilgi gösterilir
            '& > span:nth-of-type(n+3)': { display: { xs: 'none', sm: 'inline' } },
          }}>
            {kunye.map(k => <span key={k}>{k}</span>)}
          </Box>
        )}
        {!buyuk && <Box sx={{ mt: 'auto', pt: 1 }}><FiyatSatiri fiyat={fiyat} taksit={null} buyuk={false} /></Box>}
      </Box>

      {buyuk && (
        <>
          {olculer.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${olculer.length}, minmax(0, 1fr))`, borderTop: `1px solid ${RENK.cizgi}` }}>
              {olculer.map((o, i) => (
                <Box key={o.etiket} sx={{ px: 2, py: 1.25, borderLeft: i ? `1px solid ${RENK.cizgi}` : 'none' }}>
                  <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: 24, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{o.deger}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.3 }}>{o.etiket}</Typography>
                </Box>
              ))}
            </Box>
          )}
          <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${RENK.cizgi}` }}>
            <FiyatSatiri fiyat={fiyat} taksit={taksit} buyuk />
          </Box>
        </>
      )}
    </ButtonBase>
  );
};

// Fiyat + (varsa) taksit özeti
const FiyatSatiri = ({ fiyat, taksit, buyuk }) => (
  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 1.5 }}>
    <Typography sx={{
      fontFamily: YAZI.baslik, fontWeight: 700, fontSize: buyuk ? 32 : 24, lineHeight: 1.1,
      color: fiyat > 0 ? RENK.kirmiziAcik : 'text.primary', fontVariantNumeric: 'tabular-nums',
    }}>
      {fiyat > 0 ? tlYaz(fiyat) : 'Fiyat için arayın'}
    </Typography>
    {taksit && (
      <Typography sx={{ fontSize: 13.5, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
        {taksit.ay} taksitle ayda {tlYaz(taksit.aylik)}
      </Typography>
    )}
  </Box>
);

const Etiket = ({ zemin, renk, children }) => (
  <Box component="span" sx={{ bgcolor: zemin, color: renk, fontSize: 12.5, fontWeight: 700, lineHeight: 1, px: 1, py: 0.75, borderRadius: 1 }}>
    {children}
  </Box>
);

// Başlıktaki iletişim satırı için sessiz görünüm: ad + numara düz yazı, yanında küçük WhatsApp simgesi.
// (Dolu kırmızı/yeşil düğmeler başlıkta göze batıyordu; tam düğmeler ilan detayında kalır.)
export const KisiSessiz = ({ kisi }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
    {kisi.ad && <Typography component="span" sx={{ color: 'text.secondary' }}>{kisi.ad}</Typography>}
    {kisi.tel && (
      <Box component="a" href={`tel:${kisi.tel}`} sx={{
        color: 'text.primary', fontWeight: 600, textDecoration: 'none', fontVariantNumeric: 'tabular-nums', borderRadius: 0.5, ...ODAK,
        '&:hover': { textDecoration: 'underline', textUnderlineOffset: 3 },
      }}>
        {kisi.tel}
      </Box>
    )}
    {waLink(kisi.tel) && (
      <IconButton size="small" href={waLink(kisi.tel)} target="_blank" rel="noopener noreferrer"
        aria-label={`${kisi.ad || kisi.tel} ile WhatsApp'ta yaz`} sx={{ color: RENK.whatsapp, ...ODAK }}>
        <WhatsAppIcon fontSize="small" />
      </IconButton>
    )}
  </Box>
);

// İlanlar yüklenirken kartların yerini tutan iskelet
export const IlanIskelet = ({ buyuk = false }) => (
  <Box aria-hidden sx={{ border: `1px solid ${RENK.cizgi}`, borderRadius: 3, overflow: 'hidden', bgcolor: RENK.yuzey }}>
    <Skeleton variant="rectangular" sx={{ aspectRatio: '4 / 3', height: 'auto', bgcolor: 'rgba(255,255,255,0.06)' }} />
    <Box sx={{ p: 2 }}>
      <Skeleton sx={{ width: '80%', height: 26, bgcolor: 'rgba(255,255,255,0.06)' }} />
      <Skeleton sx={{ width: '45%', height: 32, bgcolor: 'rgba(255,255,255,0.06)' }} />
    </Box>
  </Box>
);

// İlan ızgarası: motor ilanları geniş, aksesuar/yedek parça daha küçük karolarla dizilir
export const ilanIzgarasi = (motor) => ({
  display: 'grid',
  gap: { xs: 1.5, sm: 2.5 },
  gridTemplateColumns: motor
    ? { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }
    : { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
});
