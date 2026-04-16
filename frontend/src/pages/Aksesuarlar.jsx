import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Alert, MenuItem, InputAdornment, Autocomplete, Divider, useTheme, useMediaQuery
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Visibility as ViewIcon, Close as CloseIcon } from '@mui/icons-material';
import { aksesuarService, aksesuarStokService } from '../services/api';

const Aksesuarlar = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [satislar, setSatislar] = useState([]);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [formData, setFormData] = useState({ ad_soyad: '', telefon: '', odeme_sekli: '', aciklama: '', durum: 'beklemede', odeme_detaylari: '', satis_tarihi: '' });
  const [parcalar, setParcalar] = useState([]);
  const [stokOptions, setStokOptions] = useState([]);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [aksSearch, setAksSearch] = useState('');
  const [aksStart, setAksStart] = useState('');
  const [aksEnd, setAksEnd] = useState('');
  const [detayDialog, setDetayDialog] = useState({ open: false, data: null });

  const loadData = async () => {
    try {
      const [satisRes, statsRes] = await Promise.all([aksesuarService.getAll(), aksesuarService.getStats()]);
      setSatislar(satisRes.data);
      setStats(statsRes.data);
    } catch {}
  };

  const loadStok = async () => {
    try { const res = await aksesuarStokService.getAll(); setStokOptions(res.data); } catch {}
  };

  useEffect(() => { loadData(); loadStok(); }, []);

  const openDialog = async (satis = null) => {
    setError('');
    if (satis) {
      try {
        const res = await aksesuarService.getById(satis.id);
        const d = res.data;
        setFormData({ ad_soyad: d.ad_soyad || '', telefon: d.telefon || '', odeme_sekli: d.odeme_sekli || '', aciklama: d.aciklama || '', durum: d.durum || 'beklemede', odeme_detaylari: d.odeme_detaylari || '', satis_tarihi: d.satis_tarihi ? d.satis_tarihi.split('T')[0] : '' });
        setParcalar(d.parcalar || []);
      } catch { setError('Yükleme hatası'); }
    } else {
      setFormData({ ad_soyad: '', telefon: '', odeme_sekli: '', aciklama: '', durum: 'beklemede', odeme_detaylari: '', satis_tarihi: new Date().toISOString().split('T')[0] });
      setParcalar([]);
    }
    setDialog({ open: true, data: satis });
  };

  const addParca = () => setParcalar([...parcalar, { urun_adi: '', adet: 1, maliyet: 0, satis_fiyati: 0 }]);

  const updateParca = (i, field, value) => {
    const updated = [...parcalar];
    updated[i][field] = value;
    if (field === 'urun_adi') {
      const found = stokOptions.find(s => s.stok_adi === value);
      if (found) {
        updated[i].maliyet = parseFloat(found.alis_fiyati || 0);
        updated[i].satis_fiyati = parseFloat(found.satis_fiyati || 0);
      }
    }
    setParcalar(updated);
  };

  const removeParca = (i) => setParcalar(parcalar.filter((_, idx) => idx !== i));

  const toplamSatis = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const kar = toplamSatis - toplamMaliyet;

  const handleSave = async () => {
    setError('');
    try {
      const payload = { ...formData, parcalar };
      if (dialog.data) {
        await aksesuarService.update(dialog.data.id, payload);
      } else {
        await aksesuarService.create(payload);
      }
      setDialog({ open: false, data: null });
      loadData();
      loadStok();
    } catch (err) { setError(err.response?.data?.message || 'Hata oluştu'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Silmek istediğinizden emin misiniz?')) return;
    try { await aksesuarService.delete(id); loadData(); loadStok(); } catch (err) { alert(err.response?.data?.message || 'Hata'); }
  };

  const durumRenk = (d) => d === 'tamamlandi' ? 'success' : 'warning';

  const beklemedeCnt = satislar.filter(s => s.durum === 'beklemede').length;
  const tamamlandiCnt = satislar.filter(s => s.durum === 'tamamlandi').length;
  const todayCnt = satislar.filter(s => { const d = new Date(s.satis_tarihi || s.created_at); return d.toDateString() === new Date().toDateString(); }).length;

  const statChips = [
    { label: `Toplam: ${satislar.length}`, color: '#C62828', bg: '#ffebee' },
    { label: `Bugün: ${todayCnt}`, color: '#C62828', bg: '#ffebee' },
    { label: `Beklemede: ${beklemedeCnt}`, color: '#C62828', bg: '#ffebee' },
    { label: `İşlemde: 0`, color: '#C62828', bg: '#ffebee' },
    { label: `Tamamlandı: ${tamamlandiCnt}`, color: '#C62828', bg: '#ffebee' },
    { label: `İptal: 0`, color: '#C62828', bg: '#ffebee' },
    { label: `₺${parseFloat(stats.toplam_gelir || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
    { label: `Kâr: ₺${parseFloat(stats.toplam_kar || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        {statChips.map((c, i) => (
          <Chip key={i} label={c.label} sx={{ bgcolor: c.bg, color: c.color, fontWeight: 'bold', fontSize: '0.8rem', borderLeft: `4px solid ${c.color}` }} />
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => openDialog()}>Yeni Satış</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Ad veya telefon ara..." value={aksSearch} onChange={(e) => setAksSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ minWidth: { xs: '100%', sm: 250 } }} />
          <TextField size="small" label="Başlangıç Tarihi" type="date" value={aksStart} onChange={e => setAksStart(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="Bitiş Tarihi" type="date" value={aksEnd} onChange={e => setAksEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>
      </Paper>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {(() => {
            const filteredSatislar = satislar.filter(s => {
              const matchSearch = !aksSearch || 
                (s.ad_soyad?.toLowerCase() || '').includes(aksSearch.toLowerCase()) ||
                (s.telefon || '').includes(aksSearch);
              const tarih = (s.satis_tarihi || s.created_at || '').split('T')[0];
              const matchStart = !aksStart || tarih >= aksStart;
              const matchEnd = !aksEnd || tarih <= aksEnd;
              return matchSearch && matchStart && matchEnd;
            });
            if (filteredSatislar.length === 0) return <Alert severity="info">Kayıt yok</Alert>;
            return filteredSatislar.map(s => (
              <Paper key={s.id} sx={{ p: 1.5 }} onClick={async () => { try { const res = await aksesuarService.getById(s.id); setDetayDialog({ open: true, data: res.data }); } catch {} }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">{s.ad_soyad}</Typography>
                  <Chip label={s.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'} size="small" color={durumRenk(s.durum)} sx={{ height: 20, fontSize: '0.7rem' }} />
                </Box>
                <Typography variant="body2" color="text.secondary">{s.telefon || '-'} • {s.olusturan_kisi || '-'}</Typography>
                <Typography variant="body2" color="text.secondary">{s.satis_tarihi ? new Date(s.satis_tarihi).toLocaleDateString('tr-TR') : '-'}</Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Typography variant="body2">Satış: <strong>{parseFloat(s.toplam_satis || 0).toLocaleString('tr-TR')} ₺</strong></Typography>
                  <Typography variant="body2" sx={{ color: parseFloat(s.kar || 0) >= 0 ? 'green' : 'red' }}>Kâr: <strong>{parseFloat(s.kar || 0).toLocaleString('tr-TR')} ₺</strong></Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={e => e.stopPropagation()}>
                  <IconButton size="small" color="info" onClick={() => openDialog(s)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><DeleteIcon /></IconButton>
                </Box>
              </Paper>
            ));
          })()}
        </Box>
      ) : (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['Müşteri', 'Telefon', 'Toplam Satış', 'Kâr', 'Oluşturan', 'Durum', 'Tarih', 'İşlemler'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {satislar.filter(s => {
              const matchSearch = !aksSearch || 
                (s.ad_soyad?.toLowerCase() || '').includes(aksSearch.toLowerCase()) ||
                (s.telefon || '').includes(aksSearch);
              const tarih = (s.satis_tarihi || s.created_at || '').split('T')[0];
              const matchStart = !aksStart || tarih >= aksStart;
              const matchEnd = !aksEnd || tarih <= aksEnd;
              return matchSearch && matchStart && matchEnd;
            }).map(s => (
              <TableRow key={s.id} hover>
                <TableCell>{s.ad_soyad}</TableCell>
                <TableCell>{s.telefon || '-'}</TableCell>
                <TableCell>{parseFloat(s.toplam_satis || 0).toLocaleString('tr-TR')} ₺</TableCell>
                <TableCell sx={{ color: parseFloat(s.kar || 0) >= 0 ? 'green' : 'red' }}>{parseFloat(s.kar || 0).toLocaleString('tr-TR')} ₺</TableCell>
                <TableCell>{s.olusturan_kisi || '-'}</TableCell>
                <TableCell><Chip label={s.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'} size="small" color={durumRenk(s.durum)} /></TableCell>
                <TableCell>{s.satis_tarihi ? new Date(s.satis_tarihi).toLocaleDateString('tr-TR') : '-'}</TableCell>
                <TableCell>
                  <IconButton size="small" color="primary" onClick={async () => { try { const res = await aksesuarService.getById(s.id); setDetayDialog({ open: true, data: res.data }); } catch {} }}><ViewIcon /></IconButton>
                  <IconButton size="small" color="info" onClick={() => openDialog(s)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {satislar.length === 0 && <TableRow><TableCell colSpan={8} align="center">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{dialog.data ? 'Satış Düzenle' : 'Yeni Aksesuar Satışı'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Ad Soyad" value={formData.ad_soyad} onChange={e => setFormData({ ...formData, ad_soyad: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Telefon" value={formData.telefon} onChange={e => setFormData({ ...formData, telefon: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Durum" value={formData.durum} onChange={e => setFormData({ ...formData, durum: e.target.value })}>
                <MenuItem value="beklemede">Beklemede</MenuItem>
                <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Ödeme Şekli" value={formData.odeme_sekli} onChange={e => setFormData({ ...formData, odeme_sekli: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Satış Tarihi" type="date" value={formData.satis_tarihi} onChange={e => setFormData({ ...formData, satis_tarihi: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Ödeme Detayları" value={formData.odeme_detaylari} onChange={e => setFormData({ ...formData, odeme_detaylari: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Açıklama" value={formData.aciklama} onChange={e => setFormData({ ...formData, aciklama: e.target.value })} multiline rows={2} />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Ürünler</Typography>
            <Button startIcon={<AddIcon />} onClick={addParca} size="small" variant="outlined">Ürün Ekle</Button>
          </Box>
          {parcalar.length > 0 && (
            isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              {parcalar.map((p, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Ürün #{i + 1}</Typography>
                    <IconButton size="small" color="error" onClick={() => removeParca(i)}><DeleteIcon /></IconButton>
                  </Box>
                  <Autocomplete size="small" options={stokOptions}
                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.stok_adi} (Stok: ${option.mevcut})`}
                    value={stokOptions.find(s => s.stok_adi === p.urun_adi) || null}
                    onChange={(_, newValue) => updateParca(i, 'urun_adi', newValue?.stok_adi || '')}
                    renderInput={(params) => <TextField {...params} placeholder="Ürün ara..." label="Ürün" />}
                    isOptionEqualToValue={(option, value) => option.stok_adi === value.stok_adi}
                    sx={{ mb: 1 }} />
                  <Grid container spacing={1}>
                    <Grid size={4}><TextField fullWidth size="small" type="number" label="Adet" value={p.adet} onChange={e => updateParca(i, 'adet', e.target.value)} /></Grid>
                    <Grid size={4}><TextField fullWidth size="small" type="number" label="Maliyet" value={p.maliyet} onChange={e => updateParca(i, 'maliyet', e.target.value)} /></Grid>
                    <Grid size={4}><TextField fullWidth size="small" type="number" label="Satış" value={p.satis_fiyati} onChange={e => updateParca(i, 'satis_fiyati', e.target.value)} /></Grid>
                  </Grid>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>Toplam: {((Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0)).toLocaleString('tr-TR')} ₺</Typography>
                </Paper>
              ))}
            </Box>
            ) : (
            <TableContainer sx={{ mt: 1, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow>
                  {['Ürün', 'Adet', 'Maliyet (₺)', 'Satış Fiyatı (₺)', 'Toplam', ''].map(h => <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {parcalar.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Autocomplete
                          size="small"
                          options={stokOptions}
                          getOptionLabel={(option) => typeof option === 'string' ? option : `${option.stok_adi} (Stok: ${option.mevcut})`}
                          value={stokOptions.find(s => s.stok_adi === p.urun_adi) || null}
                          onChange={(_, newValue) => updateParca(i, 'urun_adi', newValue?.stok_adi || '')}
                          renderInput={(params) => <TextField {...params} placeholder="Ürün ara..." />}
                          sx={{ minWidth: 200 }}
                          isOptionEqualToValue={(option, value) => option.stok_adi === value.stok_adi}
                        />
                      </TableCell>
                      <TableCell><TextField size="small" type="number" value={p.adet} onChange={e => updateParca(i, 'adet', e.target.value)} sx={{ width: 80 }} /></TableCell>
                      <TableCell><TextField size="small" type="number" value={p.maliyet} onChange={e => updateParca(i, 'maliyet', e.target.value)} sx={{ width: 100 }} /></TableCell>
                      <TableCell><TextField size="small" type="number" value={p.satis_fiyati} onChange={e => updateParca(i, 'satis_fiyati', e.target.value)} sx={{ width: 100 }} /></TableCell>
                      <TableCell>{((Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0)).toLocaleString('tr-TR')} ₺</TableCell>
                      <TableCell><IconButton size="small" color="error" onClick={() => removeParca(i)}><DeleteIcon /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )
          )}
          <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
            <Typography>Toplam: <strong>{toplamSatis.toLocaleString('tr-TR')} ₺</strong></Typography>
            <Typography sx={{ color: kar >= 0 ? 'green' : 'red' }}>Kâr: <strong>{kar.toLocaleString('tr-TR')} ₺</strong></Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, data: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSave}>{dialog.data ? 'Güncelle' : 'Kaydet'}</Button>
        </DialogActions>
      </Dialog>

      {/* Detay Dialog */}
      <Dialog open={detayDialog.open} onClose={() => setDetayDialog({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        {detayDialog.data && (() => {
          const d = detayDialog.data;
          const dp = d.parcalar || [];
          // Stok bilgilerini zenginleştir
          const enrichedDp = dp.map(p => {
            const stok = stokOptions.find(s => s.stok_adi === p.urun_adi);
            return { ...p, marka: stok?.marka, platform: stok?.platform, beden: stok?.beden, renk: stok?.renk };
          });
          const dToplamSatis = dp.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0), 0);
          const dToplamMaliyet = dp.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
          const dKar = dToplamSatis - dToplamMaliyet;
          const formatDate = (v) => v ? new Date(v).toLocaleDateString('tr-TR') : '-';
          return (
            <>
              <DialogTitle sx={{ bgcolor: '#C62828', color: 'white', py: 1.5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>Aksesuar Satış Detayı</Typography>
                <IconButton onClick={() => setDetayDialog({ open: false, data: null })} sx={{ color: 'white' }}><CloseIcon /></IconButton>
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Müşteri Bilgileri</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <Typography variant="body2"><strong>Ad Soyad:</strong> {d.ad_soyad || '-'}</Typography>
                      <Typography variant="body2"><strong>Telefon:</strong> {d.telefon || '-'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Satış Bilgileri</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <Typography variant="body2"><strong>Ödeme Şekli:</strong> {d.odeme_sekli || '-'}</Typography>
                      <Typography variant="body2"><strong>Satış Tarihi:</strong> {formatDate(d.satis_tarihi)}</Typography>
                      <Typography variant="body2"><strong>Durum:</strong> <Chip label={d.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'} size="small" color={d.durum === 'tamamlandi' ? 'success' : 'warning'} /></Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Kayıt Bilgileri</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <Typography variant="body2"><strong>Oluşturan:</strong> {d.olusturan_kisi || '-'}</Typography>
                      <Typography variant="body2"><strong>Oluşturma:</strong> {formatDate(d.created_at)}</Typography>
                      {d.tamamlama_tarihi && <Typography variant="body2"><strong>Tamamlanma:</strong> {formatDate(d.tamamlama_tarihi)}</Typography>}
                    </Paper>
                  </Grid>
                </Grid>

                {d.aciklama && (
                  <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#e3f2fd', borderLeft: '3px solid #1565C0' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1565C0' }}>Açıklama</Typography>
                    <Typography variant="body2">{d.aciklama}</Typography>
                  </Paper>
                )}

                {d.odeme_detaylari && (
                  <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#f3e5f5', borderLeft: '3px solid #9c27b0' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#9c27b0' }}>Ödeme Detayları</Typography>
                    <Typography variant="body2">{d.odeme_detaylari}</Typography>
                  </Paper>
                )}

                <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Ürünler</Typography>
                {dp.length > 0 ? (
                  isMobile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {enrichedDp.map((p, i) => {
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
                          {['Ürün Adı', 'Marka', 'Platform', 'Beden', 'Renk', 'Adet', 'Maliyet', 'Satış Fiyatı', 'Toplam', 'Kâr'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {enrichedDp.map((p, i) => {
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
                              <TableCell sx={{ fontWeight: 'bold' }}>₺{pSatis.toLocaleString('tr-TR')}</TableCell>
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
                    <Typography variant="body2">Toplam Satış: <strong>₺{dToplamSatis.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#fff3e0' }}>
                    <Typography variant="body2">Maliyet: <strong>₺{dToplamMaliyet.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#e8f5e9' }}>
                    <Typography variant="body2">Kâr: <strong style={{ color: dKar >= 0 ? '#2e7d32' : '#c62828' }}>₺{dKar.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => { setDetayDialog({ open: false, data: null }); openDialog(d); }} variant="outlined" startIcon={<EditIcon />}>Düzenle</Button>
                <Button onClick={() => setDetayDialog({ open: false, data: null })}>Kapat</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
};

export default Aksesuarlar;
