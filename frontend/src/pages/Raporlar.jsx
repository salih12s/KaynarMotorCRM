import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, Tab, CircularProgress, Alert, Chip,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, useTheme, useMediaQuery
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { raporService, aksesuarStokService } from '../services/api';

const Raporlar = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [tab, setTab] = useState(0);
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const [baslangic, setBaslangic] = useState(firstDay);
  const [bitis, setBitis] = useState(today.toISOString().split('T')[0]);
  const [rapor, setRapor] = useState(null);
  const [fisKar, setFisKar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [personeller, setPersoneller] = useState([]);
  const [seciliPersonel, setSeciliPersonel] = useState('');
  const [detayModal, setDetayModal] = useState({ open: false, data: null });
  const [aksDetayModal, setAksDetayModal] = useState({ open: false, data: null });
  const [eticaretDetayModal, setEticaretDetayModal] = useState({ open: false, data: null });
  const [motorDetayModal, setMotorDetayModal] = useState({ open: false, data: null });
  const [stokOptions, setStokOptions] = useState([]);

  const loadRapor = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await raporService.getAralik(baslangic, bitis);
      setRapor(res.data);
    } catch (err) {
      setError('Rapor yüklenirken hata oluştu');
      console.error(err);
    }
    setLoading(false);
  };

  const loadFisKar = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await raporService.getFisKar(baslangic, bitis);
      setFisKar(res.data);
    } catch (err) {
      setError('Fiş kâr verileri yüklenirken hata oluştu');
      console.error(err);
    }
    setLoading(false);
  };

  const handleTabChange = (_, v) => { setTab(v); };

  useEffect(() => {
    loadRapor();
    loadFisKar();
    raporService.getPersoneller().then(r => setPersoneller(r.data)).catch(() => {});
    aksesuarStokService.getAll().then(r => setStokOptions(r.data)).catch(() => {});
  }, [baslangic, bitis]);

  const formatTL = (v) => parseFloat(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

  const KartItem = ({ label, value, color = '#C62828', prefix = '' }) => (
    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee', borderLeft: `4px solid ${color}` }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight="bold" sx={{ color }}>{prefix}{value}</Typography>
    </Paper>
  );

  const headerSx = { color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' };
  const karColor = (v) => parseFloat(v || 0) >= 0 ? '#2e7d32' : '#C62828';
  const durumChip = (durum) => {
    const map = {
      'stokta': { label: 'Stokta', color: '#666', bg: '#f5f5f5' },
      'beklemede': { label: 'Beklemede', color: '#ed6c02', bg: '#fff3e0' },
      'kapora': { label: 'Kapora', color: '#e65100', bg: '#fff3e0' },
      'devam_ediyor': { label: 'İşlemde', color: '#1565C0', bg: '#e3f2fd' },
      'odeme_bekliyor': { label: 'Ödeme Bekl.', color: '#9c27b0', bg: '#f3e5f5' },
      'devir_bekliyor': { label: 'Devir Bekliyor', color: '#9c27b0', bg: '#f3e5f5' },
      'tamamlandi': { label: 'Tamamlandı', color: '#2e7d32', bg: '#e8f5e9' },
      'iptal': { label: 'İptal', color: '#d32f2f', bg: '#ffebee' },
      'perte': { label: 'Perte', color: '#d32f2f', bg: '#ffebee' },
    };
    const d = map[durum] || { label: durum || '-', color: '#666', bg: '#f5f5f5' };
    return <Chip size="small" label={d.label} sx={{ bgcolor: d.bg, color: d.color, fontWeight: 'bold', fontSize: '0.7rem' }} />;
  };

  return (
    <Box>
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={handleTabChange} variant="scrollable"
          TabIndicatorProps={{ sx: { bgcolor: '#C62828' } }}
          sx={{ '& .MuiTab-root': { fontWeight: 'bold' }, '& .Mui-selected': { color: '#C62828 !important' } }}>
          <Tab label="Genel Özet" />
          <Tab label="Motor Satışları" />
          <Tab label="İş Emirleri" />
          <Tab label="Aksesuar Satışları" />
          <Tab label="E-Ticaret" />
          <Tab label="Yedek Parça" />
          <Tab label="Fiş Kâr Analizi" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField size="small" type="date" label="Başlangıç" value={baslangic} onChange={e => setBaslangic(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="Bitiş" value={bitis} onChange={e => setBitis(e.target.value)} InputLabelProps={{ shrink: true }} />
          {tab === 2 && (
            <TextField size="small" select label="Personel" value={seciliPersonel} onChange={e => setSeciliPersonel(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 180 } }}>
              <MenuItem value="">Tümü</MenuItem>
              {personeller.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
          )}
        </Box>
      </Paper>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#C62828' }} /></Box>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Genel Özet Tab */}
      {tab === 0 && rapor && !loading && (
        <>
          {/* Toplam Kartları */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#C62828', color: 'white', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Toplam Gelir</Typography>
                <Typography variant="h4" fontWeight="bold">₺{formatTL(rapor.toplam?.gelir)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#1565C0', color: 'white', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Toplam Maliyet</Typography>
                <Typography variant="h4" fontWeight="bold">₺{formatTL(rapor.toplam?.maliyet)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: parseFloat(rapor.toplam?.kar || 0) >= 0 ? '#2e7d32' : '#C62828', color: 'white', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Toplam Kâr</Typography>
                <Typography variant="h4" fontWeight="bold">₺{formatTL(rapor.toplam?.kar)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#E65100', color: 'white', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Toplam İşlem</Typography>
                <Typography variant="h4" fontWeight="bold">{(rapor.motorlar?.length || 0) + (rapor.isEmirleri?.length || 0) + (rapor.aksesuarlar?.length || 0) + (rapor.eticaret?.length || 0)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#4A148C', color: 'white', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Motor Stok Değeri</Typography>
                <Typography variant="h4" fontWeight="bold">₺{formatTL(rapor.motorStokToplam)}</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Kategori Detay */}
          {isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
            {[
              { label: 'Motor Satışları', count: rapor.motorlar?.length || 0, gelir: rapor.motorGelir, maliyet: rapor.motorMaliyet, kar: rapor.motorKar },
              { label: 'İş Emirleri (Servis)', count: rapor.isEmirleri?.length || 0, gelir: rapor.isEmriGelir, maliyet: rapor.isEmriMaliyet, kar: rapor.isEmriKar },
              { label: 'Aksesuar Satışları', count: rapor.aksesuarlar?.length || 0, gelir: rapor.aksesuarGelir, maliyet: rapor.aksesuarMaliyet, kar: rapor.aksesuarKar },
              { label: 'E-Ticaret', count: rapor.eticaret?.length || 0, gelir: rapor.eticaretGelir, maliyet: rapor.eticaretMaliyet, kar: rapor.eticaretKar },
              { label: 'Yedek Parça (Envanter)', count: rapor.yedekParcalar?.length || 0, gelir: rapor.yedekParcaToplamDeger, maliyet: rapor.yedekParcaToplamMaliyet, kar: (rapor.yedekParcaToplamDeger || 0) - (rapor.yedekParcaToplamMaliyet || 0) },
            ].map((row, i) => {
              const oran = parseFloat(row.gelir || 0) > 0 ? ((parseFloat(row.kar || 0) / parseFloat(row.gelir || 1)) * 100).toFixed(1) : '0.0';
              const tabMap = { 'Motor Satışları': 1, 'İş Emirleri (Servis)': 2, 'Aksesuar Satışları': 3, 'E-Ticaret': 4, 'Yedek Parça (Envanter)': 5 };
              return (
                <Paper key={i} sx={{ p: 1.5, cursor: 'pointer' }} onClick={() => setTab(tabMap[row.label] || 0)}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">{row.label}</Typography>
                    <Typography variant="body2">{row.count} işlem</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2">Gelir: <strong>{formatTL(row.gelir)} ₺</strong></Typography>
                    <Typography variant="body2">Maliyet: <strong>{formatTL(row.maliyet)} ₺</strong></Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ color: karColor(row.kar) }}>Kâr: <strong>{formatTL(row.kar)} ₺</strong></Typography>
                    <Typography variant="body2" sx={{ color: karColor(row.kar) }}>Oran: <strong>%{oran}</strong></Typography>
                  </Box>
                </Paper>
              );
            })}
            <Paper sx={{ p: 1.5, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>TOPLAM</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">Gelir: <strong>{formatTL(rapor.toplam?.gelir)} ₺</strong></Typography>
                <Typography variant="body2">Maliyet: <strong>{formatTL(rapor.toplam?.maliyet)} ₺</strong></Typography>
                <Typography variant="body2" sx={{ color: karColor(rapor.toplam?.kar) }}>Kâr: <strong>{formatTL(rapor.toplam?.kar)} ₺</strong></Typography>
              </Box>
            </Paper>
          </Box>
          ) : (
          <TableContainer component={Paper} sx={{ mb: 2, overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#C62828' }}>
                  {['Kategori', 'İşlem Sayısı', 'Gelir', 'Maliyet', 'Kâr', 'Kâr Oranı'].map(h => (
                    <TableCell key={h} sx={headerSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { label: 'Motor Satışları', count: rapor.motorlar?.length || 0, gelir: rapor.motorGelir, maliyet: rapor.motorMaliyet, kar: rapor.motorKar },
                  { label: 'İş Emirleri (Servis)', count: rapor.isEmirleri?.length || 0, gelir: rapor.isEmriGelir, maliyet: rapor.isEmriMaliyet, kar: rapor.isEmriKar },
                  { label: 'Aksesuar Satışları', count: rapor.aksesuarlar?.length || 0, gelir: rapor.aksesuarGelir, maliyet: rapor.aksesuarMaliyet, kar: rapor.aksesuarKar },
                  { label: 'E-Ticaret', count: rapor.eticaret?.length || 0, gelir: rapor.eticaretGelir, maliyet: rapor.eticaretMaliyet, kar: rapor.eticaretKar },
                  { label: 'Yedek Parça (Envanter)', count: rapor.yedekParcalar?.length || 0, gelir: rapor.yedekParcaToplamDeger, maliyet: rapor.yedekParcaToplamMaliyet, kar: (rapor.yedekParcaToplamDeger || 0) - (rapor.yedekParcaToplamMaliyet || 0) },
                ].map((row, i) => {
                  const oran = parseFloat(row.gelir || 0) > 0 ? ((parseFloat(row.kar || 0) / parseFloat(row.gelir || 1)) * 100).toFixed(1) : '0.0';
                  const tabMap = { 'Motor Satışları': 1, 'İş Emirleri (Servis)': 2, 'Aksesuar Satışları': 3, 'E-Ticaret': 4, 'Yedek Parça (Envanter)': 5 };
                  return (
                    <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => setTab(tabMap[row.label] || 0)}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{row.label}</TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>{formatTL(row.gelir)} ₺</TableCell>
                      <TableCell>{formatTL(row.maliyet)} ₺</TableCell>
                      <TableCell sx={{ color: karColor(row.kar), fontWeight: 'bold' }}>{formatTL(row.kar)} ₺</TableCell>
                      <TableCell sx={{ color: karColor(row.kar), fontWeight: 'bold' }}>%{oran}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>TOPLAM</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{(rapor.motorlar?.length || 0) + (rapor.isEmirleri?.length || 0) + (rapor.aksesuarlar?.length || 0) + (rapor.eticaret?.length || 0)}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{formatTL(rapor.toplam?.gelir)} ₺</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{formatTL(rapor.toplam?.maliyet)} ₺</TableCell>
                  <TableCell sx={{ color: karColor(rapor.toplam?.kar), fontWeight: 'bold', fontSize: '1rem' }}>{formatTL(rapor.toplam?.kar)} ₺</TableCell>
                  <TableCell sx={{ color: karColor(rapor.toplam?.kar), fontWeight: 'bold' }}>
                    %{parseFloat(rapor.toplam?.gelir || 0) > 0 ? ((parseFloat(rapor.toplam?.kar || 0) / parseFloat(rapor.toplam?.gelir || 1)) * 100).toFixed(1) : '0.0'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          )}
        </>
      )}

      {/* Motor Satışları Tab */}
      {tab === 1 && rapor && !loading && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { label: 'Toplam Satış', value: rapor.motorlar?.length || 0 },
              { label: 'Motor Gelir', value: `₺${formatTL(rapor.motorGelir)}` },
              { label: 'Motor Maliyet', value: `₺${formatTL(rapor.motorMaliyet)}` },
              { label: 'Motor Kâr', value: `₺${formatTL(rapor.motorKar)}` },
              { label: 'Noter Satış Cirosu', value: `₺${formatTL(rapor.motorNoterSatisCiro)}` },
              { label: 'Faturalı', value: (rapor.motorlar || []).filter(m => m.fatura_kesildi).length, color: '#2e7d32' },
              { label: 'Motor Stok Değeri', value: `₺${formatTL(rapor.motorStokToplam)}`, color: '#4A148C' },
            ].map((k, i) => (
              <Grid size={{ xs: 12, md: 2 }} key={i}>
                <KartItem label={k.label} value={k.value} color={k.color} />
              </Grid>
            ))}
          </Grid>
          {rapor.motorlar && rapor.motorlar.length > 0 ? (
            isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {rapor.motorlar.map((m, i) => (
                <Paper key={i} sx={{ p: 1.5, cursor: 'pointer' }} onClick={() => setMotorDetayModal({ open: true, data: m })}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">{m.plaka}</Typography>
                    <Chip size="small" label={m.fatura_kesildi ? '✓ Kesildi' : '✗ Kesilmedi'}
                      sx={{ bgcolor: m.fatura_kesildi ? '#e8f5e9' : '#ffebee', color: m.fatura_kesildi ? '#2e7d32' : '#d32f2f', fontWeight: 'bold', fontSize: '0.65rem', height: 20 }} />
                  </Box>
                  <Typography variant="body2">{m.marka} {m.model} • {formatDate(m.satis_tarihi || m.tamamlama_tarihi || m.created_at)}</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2">Alış: <strong>{formatTL(m.alis_fiyati)} ₺</strong></Typography>
                    <Typography variant="body2">Satış: <strong>{formatTL(m.satis_fiyati)} ₺</strong></Typography>
                    <Typography variant="body2" sx={{ color: karColor(m.kar) }}>Kâr: <strong>{formatTL(m.kar)} ₺</strong></Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{m.odeme_sekli || 'nakit'} • Masraf: {formatTL(m.masraflar)} ₺</Typography>
                </Paper>
              ))}
            </Box>
            ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { px: 1, py: 0.5, fontSize: '0.78rem' } }}>
                <TableHead><TableRow sx={{ bgcolor: '#C62828' }}>
                  {['', 'Tarih', 'Plaka', 'Marka/Model', 'Alış', 'Satış', 'Masraf', 'Kâr', 'Ödeme', 'Fatura'].map(h => <TableCell key={h} sx={headerSx}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {rapor.motorlar.map((m, i) => (
                    <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => setMotorDetayModal({ open: true, data: m })}>
                      <TableCell>
                        <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); setMotorDetayModal({ open: true, data: m }); }}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(m.satis_tarihi || m.tamamlama_tarihi || m.created_at)}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{m.plaka}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{m.marka} {m.model}</TableCell>
                      <TableCell>{formatTL(m.alis_fiyati)} ₺</TableCell>
                      <TableCell>{formatTL(m.satis_fiyati)} ₺</TableCell>
                      <TableCell>{formatTL(m.masraflar)} ₺</TableCell>
                      <TableCell sx={{ color: karColor(m.kar), fontWeight: 'bold' }}>{formatTL(m.kar)} ₺</TableCell>
                      <TableCell>{m.odeme_sekli || 'nakit'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={m.fatura_kesildi ? '✓ Kesildi' : '✗ Kesilmedi'}
                          sx={{ bgcolor: m.fatura_kesildi ? '#e8f5e9' : '#ffebee', color: m.fatura_kesildi ? '#2e7d32' : '#d32f2f', fontWeight: 'bold', fontSize: '0.7rem' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )
          ) : (
            <Alert severity="info">Seçilen tarih aralığında motor satışı bulunamadı.</Alert>
          )}
        </>
      )}

      {/* İş Emirleri Tab */}
      {tab === 2 && rapor && !loading && (() => {
        const filtered = (rapor.isEmirleri || []).filter(ie => !seciliPersonel || ie.olusturan_kisi === seciliPersonel);
        const fGelir = filtered.reduce((t, r) => t + parseFloat(r.gercek_toplam_ucret || 0), 0);
        const fMaliyet = filtered.reduce((t, r) => t + parseFloat(r.toplam_maliyet || 0), 0);
        const fKar = filtered.reduce((t, r) => t + parseFloat(r.kar || 0), 0);
        return (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { label: 'Toplam İş Emri', value: filtered.length },
              { label: 'Servis Gelir', value: `₺${formatTL(fGelir)}` },
              { label: 'Servis Maliyet', value: `₺${formatTL(fMaliyet)}` },
              { label: 'Servis Kâr', value: `₺${formatTL(fKar)}` },
            ].map((k, i) => (
              <Grid size={{ xs: 12, md: 3 }} key={i}>
                <KartItem label={k.label} value={k.value} />
              </Grid>
            ))}
          </Grid>
          {filtered.length > 0 ? (
            isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {filtered.map((ie, i) => (
                <Paper key={i} sx={{ p: 1.5 }} onClick={() => setDetayModal({ open: true, data: ie })}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">#{ie.fis_no}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(ie.tamamlama_tarihi || ie.created_at)}</Typography>
                  </Box>
                  <Typography variant="body2">{ie.musteri_ad_soyad} • {ie.marka} {ie.model_tip || ''}</Typography>
                  <Typography variant="body2" color="text.secondary">{ie.olusturan_kisi || '-'} • {ie.km ? `${parseInt(ie.km).toLocaleString('tr-TR')} km` : ''}</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                    <Typography variant="body2">Gelir: <strong>{formatTL(ie.gercek_toplam_ucret)} ₺</strong></Typography>
                    <Typography variant="body2" sx={{ color: karColor(ie.kar) }}>Kâr: <strong>{formatTL(ie.kar)} ₺</strong></Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
            ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ bgcolor: '#C62828' }}>
                  {['', 'Tarih', 'Fiş No', 'Müşteri', 'Telefon', 'Marka/Model', 'KM', 'Personel', 'Arıza/Şikayet', 'Gelir', 'Maliyet', 'Kâr'].map(h => <TableCell key={h} sx={headerSx}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {filtered.map((ie, i) => (
                    <TableRow key={i} hover>
                      <TableCell>
                        <IconButton size="small" color="primary" onClick={() => setDetayModal({ open: true, data: ie })}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>{formatDate(ie.tamamlama_tarihi || ie.created_at)}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>#{ie.fis_no}</TableCell>
                      <TableCell>{ie.musteri_ad_soyad}</TableCell>
                      <TableCell>{ie.telefon || '-'}</TableCell>
                      <TableCell>{ie.marka} {ie.model_tip || ''}</TableCell>
                      <TableCell>{ie.km ? `${parseInt(ie.km).toLocaleString('tr-TR')} km` : '-'}</TableCell>
                      <TableCell>{ie.olusturan_kisi || '-'}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ie.ariza_sikayetler || '-'}</TableCell>
                      <TableCell>{formatTL(ie.gercek_toplam_ucret)} ₺</TableCell>
                      <TableCell>{formatTL(ie.toplam_maliyet)} ₺</TableCell>
                      <TableCell sx={{ color: karColor(ie.kar), fontWeight: 'bold' }}>{formatTL(ie.kar)} ₺</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )
          ) : (
            <Typography color="text.secondary" textAlign="center" py={3}>Kayıt bulunamadı</Typography>
          )}
        </>
        );
      })()}

      {/* İş Emri Detay Modal */}
      <Dialog open={detayModal.open} onClose={() => setDetayModal({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        {detayModal.data && (() => {
          const d = detayModal.data;
          const parcalar = typeof d.parcalar === 'string' ? JSON.parse(d.parcalar) : (d.parcalar || []);
          const toplamFiyat = parcalar.reduce((t, p) => t + parseFloat(p.toplam_fiyat || 0), 0);
          const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
          const kar = toplamFiyat - toplamMaliyet;
          return (
            <>
              <DialogTitle sx={{ bgcolor: '#C62828', color: 'white', py: 1.5 }}>
                İş Emri #{d.fis_no} - {d.musteri_ad_soyad}
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Müşteri Bilgileri</Typography>
                      <Typography variant="body2"><strong>Ad Soyad:</strong> {d.musteri_ad_soyad}</Typography>
                      <Typography variant="body2"><strong>Telefon:</strong> {d.telefon || '-'}</Typography>
                      <Typography variant="body2"><strong>Adres:</strong> {d.adres || '-'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Araç Bilgileri</Typography>
                      <Typography variant="body2"><strong>Marka:</strong> {d.marka || '-'}</Typography>
                      <Typography variant="body2"><strong>Model/Tip:</strong> {d.model_tip || '-'}</Typography>
                      <Typography variant="body2"><strong>KM:</strong> {d.km ? `${parseInt(d.km).toLocaleString('tr-TR')} km` : '-'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>İş Emri Bilgileri</Typography>
                      <Typography variant="body2"><strong>Personel:</strong> {d.olusturan_kisi || '-'}</Typography>
                      <Typography variant="body2"><strong>Tarih:</strong> {formatDate(d.created_at)}</Typography>
                      <Typography variant="body2"><strong>Tamamlanma:</strong> {formatDate(d.tamamlama_tarihi)}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
                {d.ariza_sikayetler && (
                  <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#fff3e0', borderLeft: '3px solid #ed6c02' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#ed6c02' }}>Arıza / Şikayetler</Typography>
                    <Typography variant="body2">{d.ariza_sikayetler}</Typography>
                  </Paper>
                )}
                {d.aciklama && (
                  <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#e3f2fd', borderLeft: '3px solid #1565C0' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1565C0' }}>Açıklama</Typography>
                    <Typography variant="body2">{d.aciklama}</Typography>
                  </Paper>
                )}
                <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Parçalar ve İşçilik</Typography>
                {parcalar.length > 0 ? (
                  isMobile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {parcalar.map((p, i) => {
                      const pSatis = parseFloat(p.toplam_fiyat || 0);
                      const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                      const pKar = pSatis - pMaliyet;
                      return (
                        <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="body2" fontWeight="bold">{p.takilan_parca}</Typography>
                          <Typography variant="caption" color="text.secondary">Adet: {p.adet} • Birim: ₺{parseFloat(p.birim_fiyat || 0).toLocaleString('tr-TR')} • Toplam: ₺{pSatis.toLocaleString('tr-TR')}</Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>Maliyet: ₺{pMaliyet.toLocaleString('tr-TR')} • <span style={{ color: pKar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>Kâr: ₺{pKar.toLocaleString('tr-TR')}</span></Typography>
                        </Paper>
                      );
                    })}
                  </Box>
                  ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          {['Takılan Parça', 'Adet', 'Birim Fiyat', 'Toplam', 'Maliyet', 'Kâr'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parcalar.map((p, i) => {
                          const pSatis = parseFloat(p.toplam_fiyat || 0);
                          const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                          const pKar = pSatis - pMaliyet;
                          return (
                            <TableRow key={i}>
                              <TableCell>{p.takilan_parca}</TableCell>
                              <TableCell>{p.adet}</TableCell>
                              <TableCell>₺{parseFloat(p.birim_fiyat || 0).toLocaleString('tr-TR')}</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>₺{pSatis.toLocaleString('tr-TR')}</TableCell>
                              <TableCell>₺{pMaliyet.toLocaleString('tr-TR')}</TableCell>
                              <TableCell sx={{ color: pKar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>₺{pKar.toLocaleString('tr-TR')}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  )
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>Parça kaydı yok</Typography>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#ffebee' }}>
                    <Typography variant="body2">Toplam: <strong>₺{toplamFiyat.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#fff3e0' }}>
                    <Typography variant="body2">Maliyet: <strong>₺{toplamMaliyet.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#e8f5e9' }}>
                    <Typography variant="body2">Kâr: <strong style={{ color: kar >= 0 ? '#2e7d32' : '#c62828' }}>₺{kar.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                </Box>
                {d.odeme_detaylari && (
                  <Paper sx={{ p: 1.5, mt: 2, bgcolor: '#f3e5f5', borderLeft: '3px solid #9c27b0' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#9c27b0' }}>Ödeme Detayları</Typography>
                    <Typography variant="body2">{d.odeme_detaylari}</Typography>
                  </Paper>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDetayModal({ open: false, data: null })}>Kapat</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Aksesuar Satışları Tab */}
      {tab === 3 && rapor && !loading && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { label: 'Toplam Satış', value: rapor.aksesuarlar?.length || 0 },
              { label: 'Aksesuar Gelir', value: `₺${formatTL(rapor.aksesuarGelir)}` },
              { label: 'Aksesuar Maliyet', value: `₺${formatTL(rapor.aksesuarMaliyet)}` },
              { label: 'Aksesuar Kâr', value: `₺${formatTL(rapor.aksesuarKar)}` },
            ].map((k, i) => (
              <Grid size={{ xs: 12, md: 3 }} key={i}>
                <KartItem label={k.label} value={k.value} />
              </Grid>
            ))}
          </Grid>
          {rapor.aksesuarlar && rapor.aksesuarlar.length > 0 ? (
            isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {rapor.aksesuarlar.map((a, i) => (
                <Paper key={i} sx={{ p: 1.5 }} onClick={() => setAksDetayModal({ open: true, data: a })}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">{a.ad_soyad}</Typography>
                    {durumChip(a.durum)}
                  </Box>
                  <Typography variant="body2" color="text.secondary">{formatDate(a.tamamlama_tarihi || a.satis_tarihi || a.created_at)} • {a.olusturan_kisi || '-'}</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                    <Typography variant="body2">Satış: <strong>{formatTL(a.toplam_satis)} ₺</strong></Typography>
                    <Typography variant="body2" sx={{ color: karColor(a.kar) }}>Kâr: <strong>{formatTL(a.kar)} ₺</strong></Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
            ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ bgcolor: '#C62828' }}>
                  {['', 'Tarih', 'Müşteri', 'Telefon', 'Oluşturan', 'Ödeme Şekli', 'Satış', 'Maliyet', 'Kâr', 'Durum'].map(h => <TableCell key={h} sx={headerSx}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {rapor.aksesuarlar.map((a, i) => (
                    <TableRow key={i} hover>
                      <TableCell>
                        <IconButton size="small" color="primary" onClick={() => setAksDetayModal({ open: true, data: a })}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>{formatDate(a.tamamlama_tarihi || a.satis_tarihi || a.created_at)}</TableCell>
                      <TableCell>{a.ad_soyad}</TableCell>
                      <TableCell>{a.telefon || '-'}</TableCell>
                      <TableCell>{a.olusturan_kisi || '-'}</TableCell>
                      <TableCell>{a.odeme_sekli || '-'}</TableCell>
                      <TableCell>{formatTL(a.toplam_satis)} ₺</TableCell>
                      <TableCell>{formatTL(a.toplam_maliyet)} ₺</TableCell>
                      <TableCell sx={{ color: karColor(a.kar), fontWeight: 'bold' }}>{formatTL(a.kar)} ₺</TableCell>
                      <TableCell>{durumChip(a.durum)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )
          ) : (
            <Alert severity="info">Seçilen tarih aralığında aksesuar satışı bulunamadı.</Alert>
          )}
        </>
      )}

      {/* E-Ticaret Tab */}
      {tab === 4 && rapor && !loading && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { label: 'Toplam Satış', value: rapor.eticaret?.length || 0 },
              { label: 'E-Ticaret Gelir', value: `₺${formatTL(rapor.eticaretGelir)}` },
              { label: 'E-Ticaret Maliyet', value: `₺${formatTL(rapor.eticaretMaliyet)}` },
              { label: 'E-Ticaret Kâr', value: `₺${formatTL(rapor.eticaretKar)}` },
            ].map((k, i) => (
              <Grid size={{ xs: 12, md: 3 }} key={i}>
                <KartItem label={k.label} value={k.value} />
              </Grid>
            ))}
          </Grid>
          {rapor.eticaret && rapor.eticaret.length > 0 ? (
            isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {rapor.eticaret.map((e, i) => {
                const miktar = parseInt(e.adet || 1);
                const satis = parseFloat(e.satis_fiyati || 0);
                const alis = parseFloat(e.alis_fiyati || 0);
                const komisyonOrani = parseFloat(e.komisyon_orani || 0);
                const kdvOrani = parseFloat(e.kdv_orani || 20);
                const kargoUcreti = parseFloat(e.kargo_ucreti || 0);
                const komisyonTutari = satis * komisyonOrani / 100;
                const hizmetBedeli = satis * 0.00347;
                const kdvHaricKomisyon = komisyonTutari / (1 + kdvOrani / 100);
                const stopaj = kdvHaricKomisyon * 0.077;
                const toplamKesinti = (komisyonTutari + hizmetBedeli + stopaj + kargoUcreti) * miktar;
                const netKar = (satis * miktar) - (alis * miktar) - toplamKesinti;
                return (
                  <Paper key={i} sx={{ p: 1.5 }} onClick={() => setEticaretDetayModal({ open: true, data: e })}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold">{e.urun_adi || '-'}</Typography>
                      <Chip label={e.platform_adi || '-'} size="small" sx={{ bgcolor: '#ffebee', color: '#C62828', fontWeight: 'bold', fontSize: '0.65rem', height: 20 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">{formatDate(e.tarih)} • Adet: {miktar}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2">Alış: <strong>{formatTL(alis)} ₺</strong></Typography>
                      <Typography variant="body2">Satış: <strong>{formatTL(satis)} ₺</strong></Typography>
                      <Typography variant="body2" sx={{ color: karColor(netKar) }}>Net Kâr: <strong>{formatTL(netKar)} ₺</strong></Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
            ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ bgcolor: '#C62828' }}>
                  {['', 'Tarih', 'Platform', 'Ürün', 'Adet', 'Alış', 'Satış', 'Kargo', 'Komisyon', 'Toplam Kesinti', 'Net Kâr'].map(h => <TableCell key={h} sx={headerSx}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {rapor.eticaret.map((e, i) => {
                    const miktar = parseInt(e.adet || 1);
                    const satis = parseFloat(e.satis_fiyati || 0);
                    const alis = parseFloat(e.alis_fiyati || 0);
                    const komisyonOrani = parseFloat(e.komisyon_orani || 0);
                    const kdvOrani = parseFloat(e.kdv_orani || 20);
                    const kargoUcreti = parseFloat(e.kargo_ucreti || 0);
                    const komisyonTutari = satis * komisyonOrani / 100;
                    const hizmetBedeli = satis * 0.00347;
                    const kdvHaricKomisyon = komisyonTutari / (1 + kdvOrani / 100);
                    const stopaj = kdvHaricKomisyon * 0.077;
                    const toplamKesinti = (komisyonTutari + hizmetBedeli + stopaj + kargoUcreti) * miktar;
                    const netKar = (satis * miktar) - (alis * miktar) - toplamKesinti;
                    return (
                      <TableRow key={i} hover>
                        <TableCell>
                          <IconButton size="small" color="primary" onClick={() => setEticaretDetayModal({ open: true, data: e })}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                        <TableCell>{formatDate(e.tarih)}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{e.platform_adi || '-'}</TableCell>
                        <TableCell>{e.urun_adi || '-'}</TableCell>
                        <TableCell>{miktar}</TableCell>
                        <TableCell>{formatTL(alis)} ₺</TableCell>
                        <TableCell>{formatTL(satis)} ₺</TableCell>
                        <TableCell>{formatTL(kargoUcreti)} ₺</TableCell>
                        <TableCell>{formatTL(komisyonTutari * miktar)} ₺ (%{komisyonOrani})</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{formatTL(toplamKesinti)} ₺</TableCell>
                        <TableCell sx={{ color: karColor(netKar), fontWeight: 'bold' }}>{formatTL(netKar)} ₺</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            )
          ) : (
            <Alert severity="info">Seçilen tarih aralığında e-ticaret satışı bulunamadı.</Alert>
          )}
        </>
      )}

      {/* Yedek Parça Tab */}
      {tab === 5 && rapor && !loading && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { label: 'Toplam Ürün', value: rapor.yedekParcalar?.length || 0 },
              { label: 'Toplam Satış Değeri', value: `₺${formatTL(rapor.yedekParcaToplamDeger)}` },
              { label: 'Toplam Maliyet', value: `₺${formatTL(rapor.yedekParcaToplamMaliyet)}` },
              { label: 'Potansiyel Kâr', value: `₺${formatTL((rapor.yedekParcaToplamDeger || 0) - (rapor.yedekParcaToplamMaliyet || 0))}` },
            ].map((k, i) => (
              <Grid size={{ xs: 12, md: 3 }} key={i}>
                <KartItem label={k.label} value={k.value} />
              </Grid>
            ))}
          </Grid>
          {rapor.yedekParcalar && rapor.yedekParcalar.length > 0 ? (
            isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {rapor.yedekParcalar.map((yp, i) => {
                const alis = parseFloat(yp.alis_fiyati || 0);
                const satis = parseFloat(yp.satis_fiyati || 0);
                const kar = satis - alis;
                const oran = satis > 0 ? ((kar / satis) * 100).toFixed(1) : '0.0';
                return (
                  <Paper key={i} sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>{yp.urun_adi}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="body2">Alış: <strong>{formatTL(alis)} ₺</strong></Typography>
                      <Typography variant="body2">Satış: <strong>{formatTL(satis)} ₺</strong></Typography>
                      <Typography variant="body2" sx={{ color: karColor(kar) }}>Kâr: <strong>{formatTL(kar)} ₺ (%{oran})</strong></Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
            ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ bgcolor: '#C62828' }}>
                  {['Ürün Adı', 'Alış Fiyatı', 'Satış Fiyatı', 'Kâr Marjı', 'Kâr Oranı'].map(h => <TableCell key={h} sx={headerSx}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {rapor.yedekParcalar.map((yp, i) => {
                    const alis = parseFloat(yp.alis_fiyati || 0);
                    const satis = parseFloat(yp.satis_fiyati || 0);
                    const kar = satis - alis;
                    const oran = satis > 0 ? ((kar / satis) * 100).toFixed(1) : '0.0';
                    return (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{yp.urun_adi}</TableCell>
                        <TableCell>{formatTL(alis)} ₺</TableCell>
                        <TableCell>{formatTL(satis)} ₺</TableCell>
                        <TableCell sx={{ color: karColor(kar), fontWeight: 'bold' }}>{formatTL(kar)} ₺</TableCell>
                        <TableCell sx={{ color: karColor(kar), fontWeight: 'bold' }}>%{oran}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            )
          ) : (
            <Alert severity="info">Yedek parça kaydı bulunamadı.</Alert>
          )}
        </>
      )}

      {/* Fiş Kâr Analizi Tab */}
      {tab === 6 && !loading && (
        <>
          {fisKar && Array.isArray(fisKar) && fisKar.length > 0 ? (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {[
                  { label: 'Toplam Fiş', value: fisKar.length },
                  { label: 'Toplam Gelir', value: `₺${formatTL(fisKar.reduce((t, r) => t + parseFloat(r.gercek_toplam_ucret || 0), 0))}` },
                  { label: 'Toplam Maliyet', value: `₺${formatTL(fisKar.reduce((t, r) => t + parseFloat(r.toplam_maliyet || 0), 0))}` },
                  { label: 'Toplam Kâr', value: `₺${formatTL(fisKar.reduce((t, r) => t + parseFloat(r.kar || 0), 0))}` },
                ].map((k, i) => (
                  <Grid size={{ xs: 12, md: 3 }} key={i}>
                    <KartItem label={k.label} value={k.value} />
                  </Grid>
                ))}
              </Grid>
              {isMobile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {fisKar.map((r, i) => {
                  const oran = parseFloat(r.gercek_toplam_ucret || 0) > 0 ? ((parseFloat(r.kar || 0) / parseFloat(r.gercek_toplam_ucret || 1)) * 100).toFixed(1) : '0.0';
                  return (
                    <Paper key={i} sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold">#{r.fis_no}</Typography>
                        {durumChip(r.durum)}
                      </Box>
                      <Typography variant="body2">{r.musteri_ad_soyad} • {formatDate(r.tamamlama_tarihi || r.created_at)}</Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="body2">Gelir: <strong>{formatTL(r.gercek_toplam_ucret)} ₺</strong></Typography>
                        <Typography variant="body2" sx={{ color: karColor(r.kar) }}>Kâr: <strong>{formatTL(r.kar)} ₺ (%{oran})</strong></Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
              ) : (
              <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead><TableRow sx={{ bgcolor: '#C62828' }}>
                    {['Tarih', 'Fiş No', 'Müşteri', 'Durum', 'Toplam Gelir', 'Toplam Maliyet', 'Kâr', 'Kâr Oranı'].map(h => <TableCell key={h} sx={headerSx}>{h}</TableCell>)}
                  </TableRow></TableHead>
                  <TableBody>
                    {fisKar.map((r, i) => {
                      const oran = parseFloat(r.gercek_toplam_ucret || 0) > 0 ? ((parseFloat(r.kar || 0) / parseFloat(r.gercek_toplam_ucret || 1)) * 100).toFixed(1) : '0.0';
                      return (
                        <TableRow key={i} hover>
                          <TableCell>{formatDate(r.tamamlama_tarihi || r.created_at)}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>#{r.fis_no}</TableCell>
                          <TableCell>{r.musteri_ad_soyad}</TableCell>
                          <TableCell>{durumChip(r.durum)}</TableCell>
                          <TableCell>{formatTL(r.gercek_toplam_ucret)} ₺</TableCell>
                          <TableCell>{formatTL(r.toplam_maliyet)} ₺</TableCell>
                          <TableCell sx={{ color: karColor(r.kar), fontWeight: 'bold' }}>{formatTL(r.kar)} ₺</TableCell>
                          <TableCell sx={{ color: karColor(r.kar), fontWeight: 'bold' }}>%{oran}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              )}
            </>
          ) : (
            <Alert severity="info">Seçilen tarih aralığında tamamlanmış fiş bulunamadı.</Alert>
          )}
        </>
      )}

      {/* Motor Satış Detay Modal */}
      <Dialog open={motorDetayModal.open} onClose={() => setMotorDetayModal({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        {motorDetayModal.data && (() => {
          const m = motorDetayModal.data;
          const alis = parseFloat(m.alis_fiyati || 0);
          const satis = parseFloat(m.satis_fiyati || 0);
          const noterAlis = parseFloat(m.noter_alis || 0);
          const noterSatis = parseFloat(m.noter_satis || 0);
          const masraf = parseFloat(m.masraflar || 0);
          const kar = parseFloat(m.kar || 0);
          return (
            <>
              <DialogTitle sx={{ bgcolor: '#C62828', color: 'white', py: 1.5 }}>
                Motor Satış Detayı - {m.plaka}
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Araç Bilgileri</Typography>
                      <Typography variant="body2"><strong>Plaka:</strong> {m.plaka || '-'}</Typography>
                      <Typography variant="body2"><strong>Marka:</strong> {m.marka || '-'}</Typography>
                      <Typography variant="body2"><strong>Model:</strong> {m.model || '-'}</Typography>
                      <Typography variant="body2"><strong>Yıl:</strong> {m.yil || '-'}</Typography>
                      <Typography variant="body2"><strong>KM:</strong> {m.km ? Number(m.km).toLocaleString('tr-TR') + ' km' : '-'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Satıcı Bilgileri</Typography>
                      <Typography variant="body2"><strong>Ad Soyad:</strong> {m.satici_adi || '-'}</Typography>
                      <Typography variant="body2"><strong>TC:</strong> {m.satici_tc || '-'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Alıcı Bilgileri</Typography>
                      <Typography variant="body2"><strong>Ad Soyad:</strong> {m.alici_adi || '-'}</Typography>
                      <Typography variant="body2"><strong>TC:</strong> {m.alici_tc || '-'}</Typography>
                      <Typography variant="body2"><strong>Telefon:</strong> {m.alici_telefon || '-'}</Typography>
                      <Typography variant="body2"><strong>Adres:</strong> {m.alici_adres || '-'}</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Fiyat Bilgileri</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #eee' }}>
                        <Typography variant="body2" color="text.secondary">Alış Fiyatı:</Typography>
                        <Typography variant="body2" fontWeight="bold">{formatTL(alis)} ₺</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #eee' }}>
                        <Typography variant="body2" color="text.secondary">Satış Fiyatı:</Typography>
                        <Typography variant="body2" fontWeight="bold">{formatTL(satis)} ₺</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #eee' }}>
                        <Typography variant="body2" color="text.secondary">Masraflar:</Typography>
                        <Typography variant="body2" fontWeight="bold">{formatTL(masraf)} ₺</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, mt: 0.5, bgcolor: kar >= 0 ? '#e8f5e9' : '#ffebee', px: 1, borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight="bold">Net Kâr:</Typography>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: karColor(kar) }}>{formatTL(kar)} ₺</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Noter Bilgileri</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #eee' }}>
                        <Typography variant="body2" color="text.secondary">Noter Alış:</Typography>
                        <Typography variant="body2" fontWeight="bold">{formatTL(noterAlis)} ₺</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #eee' }}>
                        <Typography variant="body2" color="text.secondary">Noter Satış:</Typography>
                        <Typography variant="body2" fontWeight="bold">{formatTL(noterSatis)} ₺</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #eee' }}>
                        <Typography variant="body2" color="text.secondary">Ödeme Şekli:</Typography>
                        <Typography variant="body2" fontWeight="bold">{m.odeme_sekli || 'nakit'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Fatura:</Typography>
                        <Chip size="small" label={m.fatura_kesildi ? '✓ Kesildi' : '✗ Kesilmedi'}
                          sx={{ bgcolor: m.fatura_kesildi ? '#e8f5e9' : '#ffebee', color: m.fatura_kesildi ? '#2e7d32' : '#d32f2f', fontWeight: 'bold', fontSize: '0.75rem' }} />
                      </Box>
                      {m.yevmiye_no && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
                        <Typography variant="body2" color="text.secondary">Yevmiye No:</Typography>
                        <Typography variant="body2" fontWeight="bold">{m.yevmiye_no}</Typography>
                      </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Tarih Bilgileri</Typography>
                      <Typography variant="body2"><strong>Kayıt Tarihi:</strong> {formatDate(m.tarih || m.created_at)}</Typography>
                      <Typography variant="body2"><strong>Satış Tarihi:</strong> {formatDate(m.satis_tarihi || m.tamamlama_tarihi)}</Typography>
                    </Paper>
                  </Grid>
                  {m.aciklama && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 1.5, bgcolor: '#e3f2fd', borderLeft: '3px solid #1565C0' }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1565C0' }}>Açıklama</Typography>
                        <Typography variant="body2">{m.aciklama}</Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setMotorDetayModal({ open: false, data: null })}>Kapat</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Aksesuar Detay Modal */}
      <Dialog open={aksDetayModal.open} onClose={() => setAksDetayModal({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        {aksDetayModal.data && (() => {
          const a = aksDetayModal.data;
          const parcalar = typeof a.parcalar === 'string' ? JSON.parse(a.parcalar) : (a.parcalar || []);
          const enrichedParcalar = parcalar.map(p => {
            const stok = stokOptions.find(s => s.stok_adi === p.urun_adi);
            return { ...p, marka: stok?.marka, platform: stok?.platform, beden: stok?.beden, renk: stok?.renk };
          });
          const topSatis = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0), 0);
          const topMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
          const topKar = topSatis - topMaliyet;
          return (
            <>
              <DialogTitle sx={{ bgcolor: '#C62828', color: 'white', py: 1.5 }}>
                Aksesuar Satış Detayı - {a.ad_soyad}
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Müşteri Bilgileri</Typography>
                      <Typography variant="body2"><strong>Ad Soyad:</strong> {a.ad_soyad || '-'}</Typography>
                      <Typography variant="body2"><strong>Telefon:</strong> {a.telefon || '-'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Satış Bilgileri</Typography>
                      <Typography variant="body2"><strong>Ödeme Şekli:</strong> {a.odeme_sekli || '-'}</Typography>
                      <Typography variant="body2"><strong>Satış Tarihi:</strong> {formatDate(a.satis_tarihi)}</Typography>
                      <Typography variant="body2"><strong>Durum:</strong> {durumChip(a.durum)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Kayıt Bilgileri</Typography>
                      <Typography variant="body2"><strong>Oluşturan:</strong> {a.olusturan_kisi || '-'}</Typography>
                      <Typography variant="body2"><strong>Oluşturma:</strong> {formatDate(a.created_at)}</Typography>
                      {a.tamamlama_tarihi && <Typography variant="body2"><strong>Tamamlanma:</strong> {formatDate(a.tamamlama_tarihi)}</Typography>}
                    </Paper>
                  </Grid>
                </Grid>
                {a.aciklama && (
                  <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#e3f2fd', borderLeft: '3px solid #1565C0' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1565C0' }}>Açıklama</Typography>
                    <Typography variant="body2">{a.aciklama}</Typography>
                  </Paper>
                )}
                {a.odeme_detaylari && (
                  <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#f3e5f5', borderLeft: '3px solid #9c27b0' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#9c27b0' }}>Ödeme Detayları</Typography>
                    <Typography variant="body2">{a.odeme_detaylari}</Typography>
                  </Paper>
                )}
                <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Ürünler</Typography>
                {parcalar.length > 0 ? (
                  isMobile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {enrichedParcalar.map((p, i) => {
                      const pSatis = (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0);
                      const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                      const pKar = pSatis - pMaliyet;
                      return (
                        <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="body2" fontWeight="bold">{p.urun_adi}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Adet: {p.adet} • Maliyet: ₺{pMaliyet.toLocaleString('tr-TR')} • Satış: ₺{pSatis.toLocaleString('tr-TR')}
                            {p.marka ? ` • ${p.marka}` : ''}{p.platform ? ` • ${p.platform}` : ''}{p.beden ? ` • ${p.beden}` : ''}{p.renk ? ` • ${p.renk}` : ''}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: pKar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>Kâr: ₺{pKar.toLocaleString('tr-TR')}</Typography>
                        </Paper>
                      );
                    })}
                  </Box>
                  ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          {['Ürün Adı', 'Marka', 'Platform', 'Beden', 'Renk', 'Adet', 'Maliyet', 'Satış Fiyatı', 'Kâr'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {enrichedParcalar.map((p, i) => {
                          const pSatis = (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0);
                          const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                          const pKar = pSatis - pMaliyet;
                          return (
                            <TableRow key={i}>
                              <TableCell>{p.urun_adi}</TableCell>
                              <TableCell>{p.marka || '-'}</TableCell>
                              <TableCell>{p.platform || '-'}</TableCell>
                              <TableCell>{p.beden || '-'}</TableCell>
                              <TableCell>{p.renk || '-'}</TableCell>
                              <TableCell>{p.adet}</TableCell>
                              <TableCell>₺{pMaliyet.toLocaleString('tr-TR')}</TableCell>
                              <TableCell>₺{pSatis.toLocaleString('tr-TR')}</TableCell>
                              <TableCell sx={{ color: pKar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>₺{pKar.toLocaleString('tr-TR')}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  )
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>Ürün kaydı yok</Typography>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#ffebee' }}>
                    <Typography variant="body2">Satış: <strong>₺{topSatis.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#fff3e0' }}>
                    <Typography variant="body2">Maliyet: <strong>₺{topMaliyet.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#e8f5e9' }}>
                    <Typography variant="body2">Kâr: <strong style={{ color: topKar >= 0 ? '#2e7d32' : '#c62828' }}>₺{topKar.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setAksDetayModal({ open: false, data: null })}>Kapat</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* E-Ticaret Detay Modal */}
      <Dialog open={eticaretDetayModal.open} onClose={() => setEticaretDetayModal({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        {eticaretDetayModal.data && (() => {
          const e = eticaretDetayModal.data;
          const miktar = parseInt(e.adet || 1);
          const satis = parseFloat(e.satis_fiyati || 0);
          const alis = parseFloat(e.alis_fiyati || 0);
          const komisyonOrani = parseFloat(e.komisyon_orani || 0);
          const kdvOrani = parseFloat(e.kdv_orani || 20);
          const kargoUcreti = parseFloat(e.kargo_ucreti || 0);
          const komisyonTutari = satis * komisyonOrani / 100;
          const hizmetBedeli = satis * 0.00347;
          const kdvHaricKomisyon = komisyonTutari / (1 + kdvOrani / 100);
          const stopaj = kdvHaricKomisyon * 0.077;
          const toplamKesinti = (komisyonTutari + hizmetBedeli + stopaj + kargoUcreti) * miktar;
          const toplamSatis = satis * miktar;
          const toplamAlis = alis * miktar;
          const netKar = toplamSatis - toplamAlis - toplamKesinti;
          const karOrani = toplamSatis > 0 ? ((netKar / toplamSatis) * 100).toFixed(1) : '0.0';
          return (
            <>
              <DialogTitle sx={{ bgcolor: '#C62828', color: 'white', py: 1.5 }}>
                E-Ticaret Satış Detayı - {e.urun_adi}
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Ürün Bilgileri</Typography>
                      <Typography variant="body2"><strong>Ürün:</strong> {e.urun_adi || '-'}</Typography>
                      <Typography variant="body2"><strong>Platform:</strong> {e.platform_adi || '-'}</Typography>
                      <Typography variant="body2"><strong>Adet:</strong> {miktar}</Typography>
                      <Typography variant="body2"><strong>Tarih:</strong> {formatDate(e.tarih)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Fiyat Bilgileri</Typography>
                      <Typography variant="body2"><strong>Alış Fiyatı:</strong> ₺{formatTL(alis)}</Typography>
                      <Typography variant="body2"><strong>Satış Fiyatı:</strong> ₺{formatTL(satis)}</Typography>
                      <Typography variant="body2"><strong>Toplam Alış:</strong> ₺{formatTL(toplamAlis)}</Typography>
                      <Typography variant="body2"><strong>Toplam Satış:</strong> ₺{formatTL(toplamSatis)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Platform Bilgileri</Typography>
                      <Typography variant="body2"><strong>Komisyon Oranı:</strong> %{komisyonOrani}</Typography>
                      <Typography variant="body2"><strong>KDV Oranı:</strong> %{kdvOrani}</Typography>
                      <Typography variant="body2"><strong>Kargo Ücreti:</strong> ₺{formatTL(kargoUcreti)}</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Komisyon Detayları (Birim)</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow><TableCell>Komisyon Tutarı (%{komisyonOrani})</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}>₺{formatTL(komisyonTutari)}</TableCell></TableRow>
                      <TableRow><TableCell>Hizmet Bedeli (%0.347)</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}>₺{formatTL(hizmetBedeli)}</TableCell></TableRow>
                      <TableRow><TableCell>Stopaj (%7.7)</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}>₺{formatTL(stopaj)}</TableCell></TableRow>
                      <TableRow><TableCell>Kargo Ücreti</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}>₺{formatTL(kargoUcreti)}</TableCell></TableRow>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}><TableCell sx={{ fontWeight: 'bold' }}>Birim Toplam Kesinti</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}>₺{formatTL(komisyonTutari + hizmetBedeli + stopaj + kargoUcreti)}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#ffebee' }}>
                    <Typography variant="body2">Toplam Satış: <strong>₺{formatTL(toplamSatis)}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#fff3e0' }}>
                    <Typography variant="body2">Toplam Maliyet: <strong>₺{formatTL(toplamAlis)}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#fce4ec' }}>
                    <Typography variant="body2">Toplam Kesinti: <strong>₺{formatTL(toplamKesinti)}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: netKar >= 0 ? '#e8f5e9' : '#ffebee' }}>
                    <Typography variant="body2">Net Kâr: <strong style={{ color: netKar >= 0 ? '#2e7d32' : '#c62828' }}>₺{formatTL(netKar)}</strong> (%{karOrani})</Typography>
                  </Paper>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEticaretDetayModal({ open: false, data: null })}>Kapat</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
};

export default Raporlar;
