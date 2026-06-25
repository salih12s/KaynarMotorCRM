import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Stack, InputAdornment, Snackbar, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  useTheme, useMediaQuery
} from '@mui/material';
import { Calculate as CalculateIcon, Clear as ClearIcon, Share as ShareIcon, WhatsApp as WhatsAppIcon } from '@mui/icons-material';

// Taksit oranları (nakit fiyat / oran = taksitli toplam)
export const ORANLAR = [
  { ay: 3, oran: 0.90 },
  { ay: 6, oran: 0.83 },
  { ay: 9, oran: 0.78 },
  { ay: 12, oran: 0.73 },
];

export const fmtTL = (v) => `${Math.round(v).toLocaleString('tr-TR')} ₺`;

// Para formatlı input yardımcıları: "50000" -> "50.000", girilen değerden sayı çıkarır
export const formatParaInput = (val) => {
  const digits = String(val ?? '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10).toLocaleString('tr-TR') : '';
};
export const paraToNumber = (val) => {
  const digits = String(val ?? '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

// Para formatlı (₺) giriş alanı — peşinat vb. için hem admin hem müşteri sayfasında kullanılır
export const ParaInput = ({ value, onChange, label, helperText, ...props }) => (
  <TextField
    fullWidth
    label={label}
    value={formatParaInput(value)}
    onChange={e => onChange(e.target.value)}
    helperText={helperText}
    inputMode="numeric"
    InputProps={{ endAdornment: <InputAdornment position="end">₺</InputAdornment> }}
    {...props}
  />
);

// Nakit fiyattan (peşinat düşülerek) taksit tablosunu hesaplar
export const hesaplaTaksit = (nakit, pesinat = 0) => {
  const n = parseFloat(nakit);
  const p = parseFloat(pesinat) || 0;
  if (!n || n <= 0) return null;
  const kalan = n - p;
  if (kalan <= 0) return null;
  return ORANLAR.map(o => { const toplam = kalan / o.oran; return { ay: o.ay, toplam, aylik: toplam / o.ay }; });
};

// Sonuç tablosu (hem admin sayfasında hem paylaşım sayfasında kullanılır)
export const TaksitTablo = ({ sonuc, isMobile }) => {
  if (!sonuc) return null;
  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {sonuc.map(r => (
          <Paper key={r.ay} sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #C62828' }}>
            <Typography fontWeight="bold" sx={{ mb: 0.5 }}>{r.ay} Ay</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Taksitli Toplam Fiyat</Typography>
              <Typography fontWeight={600}>{fmtTL(r.toplam)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Aylık Ödeme</Typography>
              <Typography fontWeight="bold" sx={{ color: '#C62828' }}>{fmtTL(r.aylik)}</Typography>
            </Box>
          </Paper>
        ))}
      </Stack>
    );
  }
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: '#C62828' }}>
            {['Taksit Süresi', 'Taksitli Toplam Fiyat', 'Aylık Ödeme'].map(h => (
              <TableCell key={h} sx={{ color: '#fff', fontWeight: 'bold' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sonuc.map(r => (
            <TableRow key={r.ay} hover>
              <TableCell sx={{ fontWeight: 600 }}>{r.ay} Ay</TableCell>
              <TableCell>{fmtTL(r.toplam)}</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#C62828' }}>{fmtTL(r.aylik)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const TaksitHesaplama = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [nakit, setNakit] = useState('');
  const [pesinat, setPesinat] = useState('');
  const [goster, setGoster] = useState(false);
  const [snack, setSnack] = useState(false);

  // Hesapla'ya basıldıktan sonra nakit/peşinat değiştikçe tablo anlık güncellenir
  const sonuc = useMemo(
    () => (goster ? hesaplaTaksit(nakit, paraToNumber(pesinat)) : null),
    [goster, nakit, pesinat]
  );
  const kalan = (parseFloat(nakit) || 0) - paraToNumber(pesinat);

  const hesapla = () => setGoster(true);
  const temizle = () => { setNakit(''); setPesinat(''); setGoster(false); };

  // Paylaşılabilir link: nakit fiyatı URL'e gömer; müşteri linki açınca aynı tabloyu görür
  const paylasimLinki = () => `${window.location.origin}/taksit/${Math.round(parseFloat(nakit) || 0)}`;

  const linkKopyala = async () => {
    try { await navigator.clipboard.writeText(paylasimLinki()); setSnack(true); }
    catch { window.prompt('Bağlantıyı kopyalayın:', paylasimLinki()); }
  };

  const whatsappPaylas = () => {
    const url = paylasimLinki();
    const metin = `Taksit ödeme seçenekleri: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(metin)}`, '_blank');
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>Taksit Hesaplama</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Nakit fiyat girerek 3, 6, 9 ve 12 ay taksitli ödeme seçeneklerini hesaplayabilirsiniz.
      </Typography>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, borderRadius: 3 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField fullWidth label="Nakit Fiyat" type="number" value={nakit}
              onChange={e => setNakit(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') hesapla(); }}
              InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
            <ParaInput label="Peşinat / Peşin Ödeme" value={pesinat}
              onChange={setPesinat}
              onKeyDown={e => { if (e.key === 'Enter') hesapla(); }}
              helperText={paraToNumber(pesinat) > 0 ? `Kalan tutar: ${fmtTL(Math.max(kalan, 0))}` : 'İsteğe bağlı — boş bırakılırsa nakit fiyat üzerinden hesaplanır'} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="contained" size="large" startIcon={<CalculateIcon />} onClick={hesapla}
              sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' }, whiteSpace: 'nowrap', px: 3 }}>
              Hesapla
            </Button>
            <Button variant="outlined" size="large" startIcon={<ClearIcon />} onClick={temizle} sx={{ whiteSpace: 'nowrap' }}>
              Temizle
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {goster && !sonuc && (parseFloat(nakit) || 0) > 0 && paraToNumber(pesinat) >= (parseFloat(nakit) || 0) && (
        <Alert severity="warning" sx={{ mb: 2 }}>Peşinat tutarı nakit fiyata eşit veya daha büyük. Taksitlendirilecek tutar kalmadı.</Alert>
      )}

      {sonuc && (
        <>
          {paraToNumber(pesinat) > 0 && (
            <Paper sx={{ p: 2, mb: 2, borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Nakit Fiyat <span style={{ textDecoration: 'line-through' }}>{fmtTL(parseFloat(nakit) || 0)}</span> − Peşinat {fmtTL(paraToNumber(pesinat))}
              </Typography>
              <Typography variant="h5" fontWeight="bold" sx={{ color: '#C62828' }}>{fmtTL(Math.max(kalan, 0))}</Typography>
              <Typography variant="caption" color="text.secondary">Taksitler bu tutar üzerinden hesaplanmaktadır</Typography>
            </Paper>
          )}
          <TaksitTablo sonuc={sonuc} isMobile={isMobile} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
            <Button variant="outlined" startIcon={<ShareIcon />} onClick={linkKopyala}>Müşteri Linkini Kopyala</Button>
            <Button variant="contained" startIcon={<WhatsAppIcon />} onClick={whatsappPaylas}
              sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1da851' } }}>WhatsApp ile Gönder</Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Müşteri linki açtığında aynı taksit tablosunu görür. Bu hesaplama satış/stok/rapor kayıtlarına etki etmez.
          </Typography>
        </>
      )}

      <Snackbar open={snack} autoHideDuration={2500} onClose={() => setSnack(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnack(false)}>Link kopyalandı</Alert>
      </Snackbar>
    </Box>
  );
};

export default TaksitHesaplama;
