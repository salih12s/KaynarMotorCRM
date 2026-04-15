import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  Grid, MenuItem, Tabs, Tab, Chip, Divider, useTheme, useMediaQuery
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon, Close as CloseIcon } from '@mui/icons-material';
import { eticaretService, aksesuarStokService } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Platform tipi algılama
const detectPlatform = (platformAdi) => {
  if (!platformAdi) return 'trendyol';
  const name = platformAdi.toLowerCase();
  if (name.includes('hepsiburada') || name.includes('hepsi burada') || name.includes('hb')) return 'hepsiburada';
  if (name.includes('n11')) return 'n11';
  return 'trendyol';
};

// Komisyon hesaplama fonksiyonu (Trendyol / HepsiBurada / N11)
const hesaplaKomisyon = (satisFiyati, alisFiyati, komisyonOrani, kdvOrani, kargoUcreti, adet, platformTipi = 'trendyol') => {
  const satis = Number(satisFiyati) || 0;
  const alis = Number(alisFiyati) || 0;
  const komisyon = Number(komisyonOrani) || 0;
  const kdv = Number(kdvOrani) || 20;
  const kargo = Number(kargoUcreti) || 0;
  const miktar = Number(adet) || 1;

  // KDV hariç fiyatlar
  const kdvHaricSatis = satis / (1 + kdv / 100);
  const kdvHaricAlis = alis / (1 + kdv / 100);
  const kdvHaricKargo = kargo / (1 + kdv / 100);

  // KDV tutarları
  const satistanKDV = satis - kdvHaricSatis;
  const alisKDV = alis - kdvHaricAlis;
  const kargoKDV = kargo - kdvHaricKargo;

  let komisyonTutari, komisyonKDV, hizmetBedeli, hizmetKDV, stopaj;
  let odemeBedeli = 0, islemBedeli = 0, odemIslemKDV = 0;
  let pazarlamaHizmet = 0, pazarlamaHizmetKDV = 0;

  if (platformTipi === 'hepsiburada') {
    // HepsiBurada: Komisyon = satış * komisyon% sonra KDV eklenir
    const netKomisyon = satis * komisyon / 100;
    komisyonTutari = netKomisyon * (1 + kdv / 100);
    komisyonKDV = komisyonTutari - komisyonTutari / (1 + kdv / 100);

    // Ödeme Bedeli: satış * %0.96 (KDV dahil)
    odemeBedeli = satis * 0.0096;
    // İşlem Bedeli: satış * %0.315 (KDV dahil)
    islemBedeli = satis * 0.00315;
    odemIslemKDV = (odemeBedeli + islemBedeli) - (odemeBedeli + islemBedeli) / (1 + kdv / 100);

    hizmetBedeli = odemeBedeli + islemBedeli;
    hizmetKDV = odemIslemKDV;

    // Stopaj: KDV hariç satış * %1
    stopaj = kdvHaricSatis * 0.01;

  } else if (platformTipi === 'n11') {
    // N11: Komisyon = satış * komisyon% (KDV dahil, gömülü)
    komisyonTutari = satis * komisyon / 100;
    komisyonKDV = komisyonTutari - komisyonTutari / (1 + kdv / 100);

    // S. Pazarlama ve Hizmet Gideri: satış * %1.258 (KDV dahil)
    pazarlamaHizmet = satis * 0.01258;
    pazarlamaHizmetKDV = pazarlamaHizmet - pazarlamaHizmet / (1 + kdv / 100);

    hizmetBedeli = pazarlamaHizmet;
    hizmetKDV = pazarlamaHizmetKDV;

    // Stopaj: KDV hariç satış * %1
    stopaj = kdvHaricSatis * 0.01;

  } else {
    // Trendyol (varsayılan)
    komisyonTutari = satis * komisyon / 100;
    komisyonKDV = komisyonTutari - komisyonTutari / (1 + kdv / 100);

    // Hizmet bedeli: satış * %0.347
    hizmetBedeli = satis * 0.00347;
    hizmetKDV = hizmetBedeli - hizmetBedeli / (1 + kdv / 100);

    // Stopaj: KDV hariç komisyon * %7.7
    const kdvHaricKomisyon = komisyonTutari / (1 + kdv / 100);
    stopaj = kdvHaricKomisyon * 0.077;
  }

  // Toplam kesinti
  const toplamKomisyon = komisyonTutari + hizmetBedeli + stopaj;

  // Ödenecek KDV
  const odenecekKDV = satistanKDV - alisKDV - kargoKDV - komisyonKDV - hizmetKDV;

  // Net kâr
  const netKar = satis - alis - kargo - komisyonTutari - hizmetBedeli - stopaj - odenecekKDV;

  // Kâr oranı (KDV dahil alış fiyatına göre)
  const karOrani = alis > 0 ? (netKar / alis * 100) : 0;

  // Yatırım Geri Dönüş Oranı (KDV hariç alış fiyatına göre)
  const yatirimGeriDonus = kdvHaricAlis > 0 ? (netKar / kdvHaricAlis * 100) : 0;

  const r = (v) => Math.round(v * 100) / 100;
  return {
    platformTipi, satis, alis, komisyon, kdv, kargo, miktar,
    kdvHaricSatis: r(kdvHaricSatis),
    komisyonTutari: r(komisyonTutari * miktar), toplamKomisyon: r(toplamKomisyon * miktar),
    komisyonKDV: r(komisyonKDV * miktar),
    hizmetBedeli: r(hizmetBedeli * miktar), hizmetKDV: r(hizmetKDV * miktar), stopaj: r(stopaj * miktar),
    odemeBedeli: r(odemeBedeli * miktar), islemBedeli: r(islemBedeli * miktar), odemIslemKDV: r(odemIslemKDV * miktar),
    pazarlamaHizmet: r(pazarlamaHizmet * miktar), pazarlamaHizmetKDV: r(pazarlamaHizmetKDV * miktar),
    satistanKDV: r(satistanKDV * miktar), alisKDV: r(alisKDV * miktar), kargoKDV: r(kargoKDV * miktar),
    odenecekKDV: r(odenecekKDV * miktar),
    netKar: r(netKar * miktar), karOrani: r(karOrani), yatirimGeriDonus: r(yatirimGeriDonus),
  };
};

const ETicaret = () => {
  const { user } = useAuth();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const isAdmin = user?.rol === 'admin';
  const [tab, setTab] = useState(0);
  const [satislar, setSatislar] = useState([]);
  const [platformlar, setPlatformlar] = useState([]);
  const [stokOptions, setStokOptions] = useState([]);
  const [stats, setStats] = useState({});
  const [error, setError] = useState('');

  // Satış dialog
  const [satisDialog, setSatisDialog] = useState({ open: false, data: null });
  const [satisForm, setSatisForm] = useState({ stok_id: '', platform_id: '', urun_adi: '', alis_fiyati: '', satis_fiyati: '', komisyon_orani: '', kdv_orani: '20', kargo_ucreti: '0', adet: 1, tarih: '' });

  // Platform dialog
  const [platformDialog, setPlatformDialog] = useState({ open: false, data: null });
  const [platformForm, setPlatformForm] = useState({ platform_adi: '', komisyon_orani: '', kdv_orani: '20', kargo_ucreti: '0' });

  // Detay dialog
  const [detayDialog, setDetayDialog] = useState({ open: false, data: null });

  // Platform filtre
  const [platformFiltre, setPlatformFiltre] = useState('');

  const loadData = async () => {
    try {
      const [satisRes, platformRes, statsRes, stokRes] = await Promise.all([
        eticaretService.getSales(), eticaretService.getPlatforms(),
        eticaretService.getStats(), aksesuarStokService.getAll()
      ]);
      setSatislar(satisRes.data);
      setPlatformlar(platformRes.data);
      setStats(statsRes.data);
      setStokOptions(stokRes.data);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  // ===== Satış İşlemleri =====
  const openSatisDialog = (satis = null) => {
    setError('');
    if (satis) {
      setSatisForm({
        stok_id: satis.stok_id || '', platform_id: satis.platform_id || '',
        urun_adi: satis.urun_adi || '', alis_fiyati: satis.alis_fiyati || '',
        satis_fiyati: satis.satis_fiyati || '', komisyon_orani: satis.komisyon_orani || '',
        kdv_orani: satis.kdv_orani || '20', kargo_ucreti: satis.kargo_ucreti || '0',
        adet: satis.adet || 1, tarih: satis.tarih ? satis.tarih.split('T')[0] : ''
      });
    } else {
      setSatisForm({ stok_id: '', platform_id: '', urun_adi: '', alis_fiyati: '', satis_fiyati: '', komisyon_orani: '', kdv_orani: '20', kargo_ucreti: '0', adet: 1, tarih: new Date().toISOString().split('T')[0] });
    }
    setSatisDialog({ open: true, data: satis });
  };

  const handleStokSelect = (stokId) => {
    const found = stokOptions.find(s => s.id === Number(stokId));
    if (found) {
      setSatisForm(prev => ({ ...prev, stok_id: stokId, urun_adi: found.stok_adi, alis_fiyati: parseFloat(found.alis_fiyati || 0) }));
    } else {
      setSatisForm(prev => ({ ...prev, stok_id: stokId }));
    }
  };

  const handlePlatformSelect = (platformId) => {
    const found = platformlar.find(p => p.id === Number(platformId));
    if (found) {
      setSatisForm(prev => ({
        ...prev, platform_id: platformId,
        komisyon_orani: parseFloat(found.komisyon_orani || 0),
        kdv_orani: parseFloat(found.kdv_orani || 20),
        kargo_ucreti: parseFloat(found.kargo_ucreti || 0)
      }));
    } else {
      setSatisForm(prev => ({ ...prev, platform_id: platformId }));
    }
  };

  const sf = satisForm;
  const selectedPlatformObj = platformlar.find(p => p.id === Number(sf.platform_id));
  const canliPlatformTipi = detectPlatform(selectedPlatformObj?.platform_adi);
  const canliHesap = hesaplaKomisyon(sf.satis_fiyati, sf.alis_fiyati, sf.komisyon_orani, sf.kdv_orani, sf.kargo_ucreti, sf.adet, canliPlatformTipi);

  const handleSatisSave = async () => {
    setError('');
    try {
      if (satisDialog.data) {
        await eticaretService.updateSale(satisDialog.data.id, satisForm);
      } else {
        await eticaretService.createSale(satisForm);
      }
      setSatisDialog({ open: false, data: null });
      loadData();
    } catch (err) { setError(err.response?.data?.message || 'Hata'); }
  };

  const handleSatisDelete = async (id) => {
    if (!window.confirm('Bu satışı silmek istediğinizden emin misiniz?')) return;
    try { await eticaretService.deleteSale(id); loadData(); } catch (err) { alert(err.response?.data?.message || 'Hata'); }
  };

  // ===== Platform İşlemleri =====
  const openPlatformDialog = (p = null) => {
    setError('');
    setPlatformForm(p ? {
      platform_adi: p.platform_adi, komisyon_orani: p.komisyon_orani,
      kdv_orani: p.kdv_orani || '20', kargo_ucreti: p.kargo_ucreti || '0'
    } : { platform_adi: '', komisyon_orani: '', kdv_orani: '20', kargo_ucreti: '0' });
    setPlatformDialog({ open: true, data: p });
  };

  const handlePlatformSave = async () => {
    setError('');
    try {
      if (platformDialog.data) {
        await eticaretService.updatePlatform(platformDialog.data.id, platformForm);
      } else {
        await eticaretService.createPlatform(platformForm);
      }
      setPlatformDialog({ open: false, data: null });
      loadData();
    } catch (err) { setError(err.response?.data?.message || 'Hata'); }
  };

  const handlePlatformDelete = async (id) => {
    if (!window.confirm('Bu platformu silmek istediğinizden emin misiniz?')) return;
    try { await eticaretService.deletePlatform(id); loadData(); } catch (err) { alert(err.response?.data?.message || 'Hata'); }
  };

  const formatTL = (v) => parseFloat(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        {[
          { label: `Satış: ${stats.toplam_satis || 0}`, color: '#C62828', bg: '#ffebee' },
          { label: `Gelir: ₺${parseFloat(stats.toplam_gelir || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
          { label: `Komisyon: ₺${parseFloat(stats.toplam_komisyon || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
          { label: `Kâr: ₺${parseFloat(stats.toplam_kar || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
        ].map((c, i) => (
          <Chip key={i} label={c.label} sx={{ bgcolor: c.bg, color: c.color, fontWeight: 'bold', fontSize: '0.8rem', borderLeft: `4px solid ${c.color}` }} />
        ))}
        <Box sx={{ flexGrow: 1 }} />
        {tab === 0 && <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => openSatisDialog()} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>Yeni Satış</Button>}
        {tab === 1 && isAdmin && <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => openPlatformDialog()} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>Yeni Platform</Button>}
      </Box>

      <Paper sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flexGrow: 1 }}>
          <Tab label="Satışlar" />
          <Tab label="Platformlar" />
        </Tabs>
        {tab === 0 && (
          <TextField select size="small" value={platformFiltre} onChange={e => setPlatformFiltre(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 160 }, mr: { xs: 0, sm: 2 }, mb: { xs: 1, sm: 0 }, mx: { xs: 1, sm: 0 } }} label="Platform Filtre">
            <MenuItem value="">Tümü</MenuItem>
            {platformlar.map(p => <MenuItem key={p.id} value={p.id}>{p.platform_adi}</MenuItem>)}
          </TextField>
        )}
      </Paper>

      {/* Satışlar Tab */}
      {tab === 0 && (() => {
        const filtered = platformFiltre ? satislar.filter(s => s.platform_id === Number(platformFiltre)) : satislar;
        return isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
          {filtered.map(s => (
            <Paper key={s.id} sx={{ p: 1.5 }} onClick={() => setDetayDialog({ open: true, data: s })}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">{s.urun_adi}</Typography>
                <Chip label={s.platform_adi || '-'} size="small" sx={{ bgcolor: '#ffebee', color: '#C62828', fontWeight: 'bold', fontSize: '0.7rem' }} />
              </Box>
              <Typography variant="body2" color="text.secondary">Adet: {s.adet} • {s.tarih ? new Date(s.tarih).toLocaleDateString('tr-TR') : '-'}</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                <Typography variant="body2">Alış: <strong>{formatTL(s.alis_fiyati)} ₺</strong></Typography>
                <Typography variant="body2">Satış: <strong>{formatTL(s.satis_fiyati)} ₺</strong></Typography>
                <Typography variant="body2" sx={{ color: parseFloat(s.kar || 0) >= 0 ? 'green' : 'red' }}>Kâr: <strong>{formatTL(s.kar)} ₺</strong></Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={e => e.stopPropagation()}>
                <IconButton size="small" color="info" onClick={() => openSatisDialog(s)}><EditIcon /></IconButton>
                <IconButton size="small" color="error" onClick={() => handleSatisDelete(s.id)}><DeleteIcon /></IconButton>
              </Box>
            </Paper>
          ))}
        </Box>
        ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#C62828' }}>
                {['Ürün', 'Platform', 'Adet', 'Alış (₺)', 'Satış (₺)', 'Komisyon (%)', 'KDV (%)', 'Komisyon (₺)', 'Kâr (₺)', 'Tarih', 'İşlemler'].map(h => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.urun_adi}</TableCell>
                  <TableCell>{s.platform_adi || '-'}</TableCell>
                  <TableCell>{s.adet}</TableCell>
                  <TableCell>{formatTL(s.alis_fiyati)}</TableCell>
                  <TableCell>{formatTL(s.satis_fiyati)}</TableCell>
                  <TableCell>%{parseFloat(s.komisyon_orani || 0).toFixed(2)}</TableCell>
                  <TableCell>%{parseFloat(s.kdv_orani || 20).toFixed(0)}</TableCell>
                  <TableCell>{formatTL(s.komisyon_tutari)}</TableCell>
                  <TableCell sx={{ color: parseFloat(s.kar || 0) >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>{formatTL(s.kar)}</TableCell>
                  <TableCell>{s.tarih ? new Date(s.tarih).toLocaleDateString('tr-TR') : '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" color="primary" onClick={() => setDetayDialog({ open: true, data: s })}><ViewIcon /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openSatisDialog(s)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleSatisDelete(s.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={11} align="center">Kayıt yok</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        );
      })()}

      {/* Platformlar Tab */}
      {tab === 1 && (isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {platformlar.length === 0 && <Alert severity="info">Platform yok</Alert>}
          {platformlar.map(p => (
            <Paper key={p.id} sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>{p.platform_adi}</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">Komisyon: <strong>%{parseFloat(p.komisyon_orani || 0).toFixed(2)}</strong></Typography>
                <Typography variant="body2">KDV: <strong>%{parseFloat(p.kdv_orani || 20).toFixed(2)}</strong></Typography>
                <Typography variant="body2">Kargo: <strong>{formatTL(p.kargo_ucreti)} ₺</strong></Typography>
              </Box>
              {isAdmin && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                  <IconButton size="small" color="info" onClick={() => openPlatformDialog(p)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handlePlatformDelete(p.id)}><DeleteIcon /></IconButton>
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#C62828' }}>
                {['Platform Adı', 'Komisyon (%)', 'KDV (%)', 'Kargo (₺)', ...(isAdmin ? ['İşlemler'] : [])].map(h => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {platformlar.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{p.platform_adi}</TableCell>
                  <TableCell>%{parseFloat(p.komisyon_orani || 0).toFixed(2)}</TableCell>
                  <TableCell>%{parseFloat(p.kdv_orani || 20).toFixed(2)}</TableCell>
                  <TableCell>{formatTL(p.kargo_ucreti)} ₺</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <IconButton size="small" color="info" onClick={() => openPlatformDialog(p)}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handlePlatformDelete(p.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {platformlar.length === 0 && <TableRow><TableCell colSpan={isAdmin ? 5 : 4} align="center">Platform yok</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      ))}

      {/* Satış Dialog */}
      <Dialog open={satisDialog.open} onClose={() => setSatisDialog({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{satisDialog.data ? 'Satış Düzenle' : 'Yeni E-Ticaret Satışı'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth label="Ürün (Stoktan)" value={sf.stok_id} onChange={e => handleStokSelect(e.target.value)}>
                <MenuItem value="">Manuel Giriş</MenuItem>
                {stokOptions.map(s => <MenuItem key={s.id} value={s.id}>{s.stok_adi} (Stok: {s.mevcut})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Ürün Adı" value={sf.urun_adi} onChange={e => setSatisForm({ ...sf, urun_adi: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Platform" value={sf.platform_id} onChange={e => handlePlatformSelect(e.target.value)}>
                <MenuItem value="">Seçiniz</MenuItem>
                {platformlar.map(p => <MenuItem key={p.id} value={p.id}>{p.platform_adi} (%{parseFloat(p.komisyon_orani).toFixed(2)})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Tarih" type="date" value={sf.tarih} onChange={e => setSatisForm({ ...sf, tarih: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Adet" type="number" value={sf.adet} onChange={e => setSatisForm({ ...sf, adet: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Ürün Satış Fiyatı (₺)" type="number" value={sf.satis_fiyati} onChange={e => setSatisForm({ ...sf, satis_fiyati: e.target.value })}
                helperText="KDV dahil" />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Ürün Alış Fiyatı (₺)" type="number" value={sf.alis_fiyati} onChange={e => setSatisForm({ ...sf, alis_fiyati: e.target.value })}
                helperText="KDV dahil" />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField fullWidth label="Komisyon (%)" type="number" value={sf.komisyon_orani} onChange={e => setSatisForm({ ...sf, komisyon_orani: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField fullWidth label="KDV (%)" type="number" value={sf.kdv_orani} onChange={e => setSatisForm({ ...sf, kdv_orani: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField fullWidth label="Kargo (₺)" type="number" value={sf.kargo_ucreti} onChange={e => setSatisForm({ ...sf, kargo_ucreti: e.target.value })} />
            </Grid>
          </Grid>

          {/* Komisyon Hesaplama Sonuçları */}
          {(Number(sf.satis_fiyati) > 0) && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" fontWeight="bold" color="#C62828" gutterBottom>
                Komisyon Hesaplama {canliPlatformTipi === 'hepsiburada' ? '(HepsiBurada)' : canliPlatformTipi === 'n11' ? '(N11)' : '(Trendyol)'}
              </Typography>

              {/* Ana sonuçlar - Platform bazlı */}
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                {(() => {
                  let cards = [];
                  if (canliPlatformTipi === 'hepsiburada') {
                    cards = [
                      { label: 'Komisyon', value: `${formatTL(canliHesap.komisyonTutari)} ₺`, color: '#e65100', bg: '#fff3e0' },
                      { label: 'Yat. Geri Dönüş Oranı', value: `%${canliHesap.yatirimGeriDonus}`, color: '#1565c0', bg: '#e3f2fd' },
                      { label: 'Ödeme Bedeli', value: `${formatTL(canliHesap.odemeBedeli)} ₺`, color: '#555', bg: '#f5f5f5' },
                      { label: 'İşlem Bedeli', value: `${formatTL(canliHesap.islemBedeli)} ₺`, color: '#555', bg: '#f5f5f5' },
                      { label: 'Stopaj Bedeli', value: `${formatTL(canliHesap.stopaj)} ₺`, color: '#555', bg: '#f5f5f5' },
                      { label: 'Kâr Oranı', value: `%${canliHesap.karOrani}`, color: '#2e7d32', bg: '#e8f5e9' },
                      { label: 'KDV', value: `${formatTL(canliHesap.odenecekKDV)} ₺`, color: '#f57f17', bg: '#fff8e1' },
                    ];
                  } else if (canliPlatformTipi === 'n11') {
                    cards = [
                      { label: 'Komisyon', value: `${formatTL(canliHesap.komisyonTutari)} ₺`, color: '#e65100', bg: '#fff3e0' },
                      { label: 'Yat. Geri Dönüş Oranı', value: `%${canliHesap.yatirimGeriDonus}`, color: '#1565c0', bg: '#e3f2fd' },
                      { label: 'S. Pazarlama ve Hizmet', value: `${formatTL(canliHesap.pazarlamaHizmet)} ₺`, color: '#555', bg: '#f5f5f5' },
                      { label: 'Stopaj Bedeli', value: `${formatTL(canliHesap.stopaj)} ₺`, color: '#555', bg: '#f5f5f5' },
                      { label: 'Kâr Oranı', value: `%${canliHesap.karOrani}`, color: '#2e7d32', bg: '#e8f5e9' },
                      { label: 'KDV', value: `${formatTL(canliHesap.odenecekKDV)} ₺`, color: '#f57f17', bg: '#fff8e1' },
                    ];
                  } else {
                    cards = [
                      { label: 'Komisyon (Toplam)', value: `${formatTL(canliHesap.toplamKomisyon)} ₺`, color: '#e65100', bg: '#fff3e0', sub: `Komisyon: ${formatTL(canliHesap.komisyonTutari)}₺ + Hizmet: ${formatTL(canliHesap.hizmetBedeli)}₺ + Stopaj: ${formatTL(canliHesap.stopaj)}₺` },
                      { label: 'Yat. Geri Dönüş Oranı', value: `%${canliHesap.yatirimGeriDonus}`, color: '#1565c0', bg: '#e3f2fd' },
                      { label: 'Kâr Oranı', value: `%${canliHesap.karOrani}`, color: '#2e7d32', bg: '#e8f5e9' },
                      { label: 'KDV', value: `${formatTL(canliHesap.odenecekKDV)} ₺`, color: '#f57f17', bg: '#fff8e1' },
                    ];
                  }
                  return cards.map((c, i) => (
                    <Paper key={i} sx={{ p: 1.5, flex: 1, minWidth: 100, textAlign: 'center', bgcolor: c.bg, borderTop: `3px solid ${c.color}` }}>
                      <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                      <Typography fontWeight="bold" color={c.color}>{c.value}</Typography>
                      {c.sub && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>{c.sub}</Typography>}
                    </Paper>
                  ));
                })()}
              </Box>

              {/* KDV detayları - Platform bazlı */}
              <Paper sx={{ p: 1.5, bgcolor: '#fafafa', mb: 2 }}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary" gutterBottom>KDV Detayları</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                  {(() => {
                    let kdvItems = [
                      { label: 'Satıştan Oluşan KDV', value: canliHesap.satistanKDV },
                      { label: 'Alıştan Oluşan KDV', value: canliHesap.alisKDV },
                      { label: 'Kargodan Oluşan KDV', value: canliHesap.kargoKDV },
                      { label: 'Komisyondan Oluşan KDV', value: canliHesap.komisyonKDV },
                    ];
                    if (canliPlatformTipi === 'hepsiburada') {
                      kdvItems.push({ label: 'Ödeme ve İşlem Bedeli KDV', value: canliHesap.odemIslemKDV });
                    } else if (canliPlatformTipi === 'n11') {
                      kdvItems.push({ label: 'Pazarlama ve Hizmet KDV', value: canliHesap.pazarlamaHizmetKDV });
                    } else {
                      kdvItems.push({ label: 'Hizmet Bedeli KDV', value: canliHesap.hizmetKDV });
                    }
                    kdvItems.push({ label: 'Ödenecek KDV', value: canliHesap.odenecekKDV });
                    return kdvItems.map((item, i) => (
                      <Box key={i} sx={{ textAlign: 'center', minWidth: 130, flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{item.label}</Typography>
                        <Typography variant="body2" fontWeight="bold">{formatTL(item.value)} ₺</Typography>
                      </Box>
                    ));
                  })()}
                </Box>
              </Paper>

              {/* Net Kâr büyük gösterim */}
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: canliHesap.netKar >= 0 ? '#e8f5e9' : '#ffebee', borderRadius: 2, border: `2px solid ${canliHesap.netKar >= 0 ? '#2e7d32' : '#c62828'}` }}>
                <Typography variant="body2" color="text.secondary">Net Kâr ({canliHesap.miktar} adet)</Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ color: canliHesap.netKar >= 0 ? '#2e7d32' : '#c62828' }}>
                  {formatTL(canliHesap.netKar)} ₺
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSatisDialog({ open: false, data: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSatisSave} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>
            {satisDialog.data ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Platform Dialog */}
      <Dialog open={platformDialog.open} onClose={() => setPlatformDialog({ open: false, data: null })} maxWidth="xs" fullWidth fullScreen={isMobile}>
        <DialogTitle>{platformDialog.data ? 'Platform Düzenle' : 'Yeni Platform'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Platform Adı" value={platformForm.platform_adi} onChange={e => setPlatformForm({ ...platformForm, platform_adi: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Komisyon Oranı (%)" type="number" value={platformForm.komisyon_orani} onChange={e => setPlatformForm({ ...platformForm, komisyon_orani: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="KDV Oranı (%)" type="number" value={platformForm.kdv_orani} onChange={e => setPlatformForm({ ...platformForm, kdv_orani: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Kargo Ücreti (₺)" type="number" value={platformForm.kargo_ucreti} onChange={e => setPlatformForm({ ...platformForm, kargo_ucreti: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlatformDialog({ open: false, data: null })}>İptal</Button>
          <Button variant="contained" onClick={handlePlatformSave} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>
            {platformDialog.data ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detay Dialog */}
      <Dialog open={detayDialog.open} onClose={() => setDetayDialog({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        {detayDialog.data && (() => {
          const s = detayDialog.data;
          const detayPlatformTipi = detectPlatform(s.platform_adi);
          const h = hesaplaKomisyon(s.satis_fiyati, s.alis_fiyati, s.komisyon_orani, s.kdv_orani || 20, s.kargo_ucreti || 0, s.adet, detayPlatformTipi);
          const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
          return (
            <>
              <DialogTitle sx={{ bgcolor: '#C62828', color: 'white', py: 1.5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>E-Ticaret Satış Detayı</Typography>
                <IconButton onClick={() => setDetayDialog({ open: false, data: null })} sx={{ color: 'white' }}><CloseIcon /></IconButton>
              </DialogTitle>
              <DialogContent dividers>
                {/* Ürün Bilgileri */}
                <Grid container spacing={2} sx={{ mb: 3, mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Ürün Bilgileri</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <Typography variant="body2"><strong>Ürün:</strong> {s.urun_adi}</Typography>
                      <Typography variant="body2"><strong>Platform:</strong> {s.platform_adi || '-'}</Typography>
                      <Typography variant="body2"><strong>Adet:</strong> {s.adet}</Typography>
                      <Typography variant="body2"><strong>Tarih:</strong> {formatDate(s.tarih)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Fiyat Bilgileri</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <Typography variant="body2"><strong>Satış Fiyatı:</strong> {formatTL(s.satis_fiyati)} ₺</Typography>
                      <Typography variant="body2"><strong>Alış Fiyatı:</strong> {formatTL(s.alis_fiyati)} ₺</Typography>
                      <Typography variant="body2"><strong>Komisyon:</strong> %{parseFloat(s.komisyon_orani || 0).toFixed(2)}</Typography>
                      <Typography variant="body2"><strong>KDV:</strong> %{parseFloat(s.kdv_orani || 20).toFixed(2)}</Typography>
                      <Typography variant="body2"><strong>Kargo:</strong> {formatTL(s.kargo_ucreti)} ₺</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2, bgcolor: h.netKar >= 0 ? '#e8f5e9' : '#ffebee', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Net Kâr</Typography>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: h.netKar >= 0 ? '#2e7d32' : '#c62828' }}>
                        {formatTL(h.netKar)} ₺
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Komisyon Detayları - Platform bazlı */}
                <Typography variant="subtitle1" fontWeight="bold" color="#C62828" gutterBottom>
                  Komisyon Hesaplama Detayları {detayPlatformTipi === 'hepsiburada' ? '(HepsiBurada)' : detayPlatformTipi === 'n11' ? '(N11)' : '(Trendyol)'}
                </Typography>
                <Paper sx={{ p: 2, bgcolor: '#fff8e1', mb: 2, borderTop: '3px solid #f57f17' }}>
                  <Grid container spacing={2} textAlign="center">
                    {(() => {
                      let items = [];
                      if (detayPlatformTipi === 'hepsiburada') {
                        items = [
                          { label: 'Komisyon', value: `${formatTL(h.komisyonTutari)} ₺` },
                          { label: 'Yat. Geri Dönüş', value: `%${h.yatirimGeriDonus}` },
                          { label: 'Ödeme Bedeli', value: `${formatTL(h.odemeBedeli)} ₺` },
                          { label: 'İşlem Bedeli', value: `${formatTL(h.islemBedeli)} ₺` },
                          { label: 'Stopaj', value: `${formatTL(h.stopaj)} ₺` },
                          { label: 'Kâr Oranı', value: `%${h.karOrani}` },
                          { label: 'KDV', value: `${formatTL(h.odenecekKDV)} ₺` },
                        ];
                      } else if (detayPlatformTipi === 'n11') {
                        items = [
                          { label: 'Komisyon', value: `${formatTL(h.komisyonTutari)} ₺` },
                          { label: 'Yat. Geri Dönüş', value: `%${h.yatirimGeriDonus}` },
                          { label: 'S. Pazarlama ve Hizmet', value: `${formatTL(h.pazarlamaHizmet)} ₺` },
                          { label: 'Stopaj', value: `${formatTL(h.stopaj)} ₺` },
                          { label: 'Kâr Oranı', value: `%${h.karOrani}` },
                          { label: 'KDV', value: `${formatTL(h.odenecekKDV)} ₺` },
                        ];
                      } else {
                        items = [
                          { label: 'Komisyon (Toplam)', value: `${formatTL(h.toplamKomisyon)} ₺` },
                          { label: 'Komisyon', value: `${formatTL(h.komisyonTutari)} ₺` },
                          { label: 'Hizmet Bedeli', value: `${formatTL(h.hizmetBedeli)} ₺` },
                          { label: 'Stopaj', value: `${formatTL(h.stopaj)} ₺` },
                          { label: 'Kâr Oranı', value: `%${h.karOrani}` },
                          { label: 'KDV', value: `${formatTL(h.odenecekKDV)} ₺` },
                        ];
                      }
                      return items.map((item, i) => (
                        <Grid size={{ xs: 4, md: 2 }} key={i}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{item.label}</Typography>
                          <Typography variant="body1" fontWeight="bold">{item.value}</Typography>
                        </Grid>
                      ));
                    })()}
                  </Grid>
                </Paper>

                {/* KDV Detayları - Platform bazlı */}
                <Typography variant="subtitle1" fontWeight="bold" color="#C62828" gutterBottom>KDV Detayları</Typography>
                <Paper sx={{ p: 2, bgcolor: '#fafafa', borderTop: '3px solid #C62828' }}>
                  <Grid container spacing={2} textAlign="center">
                    {(() => {
                      let kdvItems = [
                        { label: 'Satıştan Oluşan KDV', value: `${formatTL(h.satistanKDV)} ₺` },
                        { label: 'Alıştan Oluşan KDV', value: `${formatTL(h.alisKDV)} ₺` },
                        { label: 'Kargodan Oluşan KDV', value: `${formatTL(h.kargoKDV)} ₺` },
                        { label: 'Komisyondan Oluşan KDV', value: `${formatTL(h.komisyonKDV)} ₺` },
                      ];
                      if (detayPlatformTipi === 'hepsiburada') {
                        kdvItems.push({ label: 'Ödeme ve İşlem Bedeli KDV', value: `${formatTL(h.odemIslemKDV)} ₺` });
                      } else if (detayPlatformTipi === 'n11') {
                        kdvItems.push({ label: 'Pazarlama ve Hizmet KDV', value: `${formatTL(h.pazarlamaHizmetKDV)} ₺` });
                      } else {
                        kdvItems.push({ label: 'Hizmet Bedeli KDV', value: `${formatTL(h.hizmetKDV)} ₺` });
                      }
                      kdvItems.push({ label: 'Ödenecek KDV', value: `${formatTL(h.odenecekKDV)} ₺` });
                      return kdvItems.map((item, i) => (
                        <Grid size={{ xs: 4, md: 2 }} key={i}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{item.label}</Typography>
                          <Typography variant="body1" fontWeight="bold">{item.value}</Typography>
                        </Grid>
                      ));
                    })()}
                  </Grid>
                </Paper>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => { setDetayDialog({ open: false, data: null }); openSatisDialog(s); }} variant="outlined" startIcon={<EditIcon />}>Düzenle</Button>
                <Button onClick={() => setDetayDialog({ open: false, data: null })}>Kapat</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
};

export default ETicaret;
