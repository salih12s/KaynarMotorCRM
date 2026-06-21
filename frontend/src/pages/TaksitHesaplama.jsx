import React, { useState } from 'react';
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

// Nakit fiyattan taksit tablosunu hesaplar
export const hesaplaTaksit = (nakit) => {
  const n = parseFloat(nakit);
  if (!n || n <= 0) return null;
  return ORANLAR.map(o => { const toplam = n / o.oran; return { ay: o.ay, toplam, aylik: toplam / o.ay }; });
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
  const [sonuc, setSonuc] = useState(null);
  const [snack, setSnack] = useState(false);

  const hesapla = () => setSonuc(hesaplaTaksit(nakit));
  const temizle = () => { setNakit(''); setSonuc(null); };

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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField fullWidth label="Nakit Fiyat" type="number" value={nakit}
            onChange={e => setNakit(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') hesapla(); }}
            InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
          <Button variant="contained" size="large" startIcon={<CalculateIcon />} onClick={hesapla}
            sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' }, whiteSpace: 'nowrap', px: 3 }}>
            Hesapla
          </Button>
          <Button variant="outlined" size="large" startIcon={<ClearIcon />} onClick={temizle} sx={{ whiteSpace: 'nowrap' }}>
            Temizle
          </Button>
        </Stack>
      </Paper>

      {sonuc && (
        <>
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
