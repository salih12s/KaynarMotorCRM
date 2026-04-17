import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Grid, Chip, InputAdornment, Divider, MenuItem, Tooltip, Autocomplete, useTheme, useMediaQuery
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Visibility as ViewIcon, Close as CloseIcon, Print as PrintIcon, ShoppingCart as SellIcon } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { ikinciElMotorService, musteriService } from '../services/api';

const MotorStok = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [motorlar, setMotorlar] = useState([]);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [detayModal, setDetayModal] = useState({ open: false, data: null });
  const printRef = useRef();
  const [formData, setFormData] = useState({
    plaka: '', marka: '', model: '', yil: '', km: '',
    alis_fiyati: '', noter_alis: '',
    satici_adi: '', satici_tc: '',
    durum: 'stokta', stok_tipi: 'sahip', aciklama: '', tarih: new Date().toISOString().split('T')[0],
    fatura_kesildi: false
  });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [secondaryFilter, setSecondaryFilter] = useState(null);
  const [hizliSatis, setHizliSatis] = useState({ open: false, motor: null });
  const [hizliForm, setHizliForm] = useState({
    satis_fiyati: '', noter_satis: '', masraflar: '',
    alici_adi: '', alici_tc: '', alici_telefon: '', alici_adres: '',
    yevmiye_no: '', satis_tarihi: new Date().toISOString().split('T')[0]
  });
  const [musteriOptions, setMusteriOptions] = useState([]);

  const searchMusteri = async (query) => {
    if (!query || query.length < 2) { setMusteriOptions([]); return; }
    try { const res = await musteriService.search(query); setMusteriOptions(res.data); } catch { setMusteriOptions([]); }
  };

  const loadData = async () => {
    try {
      const res = await ikinciElMotorService.getAll();
      setMotorlar(res.data);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const openDialog = (motor = null) => {
    setError('');
    setFormData(motor ? {
      plaka: motor.plaka || '', marka: motor.marka || '', model: motor.model || '',
      yil: motor.yil || '', km: motor.km || '',
      alis_fiyati: motor.alis_fiyati || '', noter_alis: motor.noter_alis || '',
      satici_adi: motor.satici_adi || '', satici_tc: motor.satici_tc || '',
      durum: motor.durum || 'stokta', stok_tipi: motor.stok_tipi || 'sahip',
      aciklama: motor.aciklama || '', tarih: motor.tarih ? new Date(motor.tarih).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      fatura_kesildi: motor.fatura_kesildi || false
    } : {
      plaka: '', marka: '', model: '', yil: '', km: '',
      alis_fiyati: '', noter_alis: '',
      satici_adi: '', satici_tc: '',
      durum: 'stokta', stok_tipi: 'sahip', aciklama: '', tarih: new Date().toISOString().split('T')[0],
      fatura_kesildi: false
    });
    setDialog({ open: true, data: motor });
  };

  const handleSave = async () => {
    setError('');
    try {
      if (dialog.data) {
        await ikinciElMotorService.update(dialog.data.id, formData);
      } else {
        await ikinciElMotorService.create(formData);
      }
      setDialog({ open: false, data: null });
      loadData();
    } catch (err) { setError(err.response?.data?.message || 'Hata oluştu'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try { await ikinciElMotorService.delete(id); loadData(); } catch (err) { alert(err.response?.data?.message || 'Hata'); }
  };

  const openHizliSatis = (motor) => {
    setHizliForm({
      satis_fiyati: '', noter_satis: '', masraflar: motor.masraflar || '',
      alici_adi: '', alici_tc: '', alici_telefon: '', alici_adres: '',
      yevmiye_no: '', satis_tarihi: new Date().toISOString().split('T')[0]
    });
    setHizliSatis({ open: true, motor });
  };

  const handleHizliSatis = async () => {
    try {
      await ikinciElMotorService.update(hizliSatis.motor.id, {
        ...hizliSatis.motor,
        ...hizliForm,
        durum: 'tamamlandi',
        kalan_odeme: 0
      });
      setHizliSatis({ open: false, motor: null });
      loadData();
    } catch (err) { alert(err.response?.data?.message || 'Hata'); }
  };

  const f = formData;

  const filteredMotorlar = motorlar.filter(m => {
    // Apply active filter
    if (activeFilter === 'stokta' && (m.durum !== 'stokta' || m.stok_tipi === 'konsinye')) return false;
    if (activeFilter === 'kapora' && m.durum !== 'kapora') return false;
    if (activeFilter === 'konsinye' && (m.durum !== 'stokta' || m.stok_tipi !== 'konsinye')) return false;
    if (activeFilter === 'devir_bekliyor' && m.durum !== 'devir_bekliyor') return false;
    if (activeFilter === 'tamamlandi' && m.durum !== 'tamamlandi') return false;
    if (activeFilter === 'perte' && m.durum !== 'perte') return false;

    // Secondary filters
    if (secondaryFilter === 'fatura_kesildi' && !m.fatura_kesildi) return false;
    if (secondaryFilter === 'fatura_kesilmedi' && m.fatura_kesildi) return false;
    if (secondaryFilter === 'devir_verildi' && m.durum !== 'tamamlandi') return false;
    if (secondaryFilter === 'devir_verilmedi' && m.durum !== 'devir_bekliyor') return false;
    if (secondaryFilter === 'odeme_tamam' && parseFloat(m.kalan_odeme || 0) > 0) return false;
    if (secondaryFilter === 'odeme_bekliyor' && !(parseFloat(m.kalan_odeme || 0) > 0)) return false;

    return (m.plaka || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.marka || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.model || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.satici_adi || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.alici_adi || '').toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    const order = { stokta: 0, kapora: 1 };
    const aOrder = a.durum === 'tamamlandi' ? 5 : a.durum === 'perte' ? 4 : a.durum === 'devir_bekliyor' ? 3 : a.stok_tipi === 'konsinye' ? 2 : (order[a.durum] ?? 0);
    const bOrder = b.durum === 'tamamlandi' ? 5 : b.durum === 'perte' ? 4 : b.durum === 'devir_bekliyor' ? 3 : b.stok_tipi === 'konsinye' ? 2 : (order[b.durum] ?? 0);
    return aOrder - bOrder;
  });

  const stoktaSahip = motorlar.filter(m => m.durum === 'stokta' && m.stok_tipi !== 'konsinye');
  const stoktaKonsinye = motorlar.filter(m => m.durum === 'stokta' && m.stok_tipi === 'konsinye');
  const kaporalar = motorlar.filter(m => m.durum === 'kapora');
  const devirBekleyen = motorlar.filter(m => m.durum === 'devir_bekliyor');
  const tamamlananlar = motorlar.filter(m => m.durum === 'tamamlandi');
  const perteler = motorlar.filter(m => m.durum === 'perte');

  const statChips = [
    { label: `Toplam: ${motorlar.length}`, color: '#C62828', bg: '#ffebee', filter: null },
    { label: `Stokta: ${stoktaSahip.length}`, color: '#2e7d32', bg: '#e8f5e9', filter: 'stokta' },
    { label: `Konsinye: ${stoktaKonsinye.length}`, color: '#1565C0', bg: '#e3f2fd', filter: 'konsinye' },
    { label: `Kapora: ${kaporalar.length}`, color: '#F9A825', bg: '#FFFDE7', filter: 'kapora' },
    { label: `Devir Bekliyor: ${devirBekleyen.length}`, color: '#7B1FA2', bg: '#F3E5F5', filter: 'devir_bekliyor' },
    { label: `Perte: ${perteler.length}`, color: '#d32f2f', bg: '#ffcdd2', filter: 'perte' },
    { label: `Satılan: ${tamamlananlar.length}`, color: '#00695C', bg: '#E0F2F1', filter: 'tamamlandi' },
  ];

  const secondaryChips = [
    { label: `Fatura ✓ ${motorlar.filter(m => m.fatura_kesildi).length}`, filter: 'fatura_kesildi', color: '#2e7d32', bg: '#e8f5e9' },
    { label: `Fatura ✗ ${motorlar.filter(m => !m.fatura_kesildi).length}`, filter: 'fatura_kesilmedi', color: '#d32f2f', bg: '#ffebee' },
    { label: `Devir ✓ ${tamamlananlar.length}`, filter: 'devir_verildi', color: '#2e7d32', bg: '#e8f5e9' },
    { label: `Devir ✗ ${devirBekleyen.length}`, filter: 'devir_verilmedi', color: '#d32f2f', bg: '#ffebee' },
    { label: `Ödeme ✓ ${motorlar.filter(m => !(parseFloat(m.kalan_odeme || 0) > 0)).length}`, filter: 'odeme_tamam', color: '#2e7d32', bg: '#e8f5e9' },
    { label: `Ödeme ✗ ${motorlar.filter(m => parseFloat(m.kalan_odeme || 0) > 0).length}`, filter: 'odeme_bekliyor', color: '#d32f2f', bg: '#ffebee' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        {statChips.map((c, i) => (
          <Chip key={i} label={c.label}
            onClick={() => setActiveFilter(activeFilter === c.filter ? null : c.filter)}
            sx={{
              bgcolor: activeFilter === c.filter ? c.color : c.bg,
              color: activeFilter === c.filter ? 'white' : c.color,
              fontWeight: 'bold', fontSize: '0.8rem',
              borderLeft: `4px solid ${c.color}`,
              cursor: 'pointer',
              '&:hover': { opacity: 0.85 },
            }} />
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => openDialog()} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>Motor Ekle</Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {secondaryChips.map((c, i) => (
          <Chip key={i} label={c.label} size="small"
            onClick={() => setSecondaryFilter(secondaryFilter === c.filter ? null : c.filter)}
            sx={{
              bgcolor: secondaryFilter === c.filter ? c.color : c.bg,
              color: secondaryFilter === c.filter ? 'white' : c.color,
              fontWeight: 'bold', fontSize: '0.75rem',
              cursor: 'pointer',
              '&:hover': { opacity: 0.85 },
            }} />
        ))}
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField size="small" fullWidth placeholder="Plaka, marka, model veya satıcı adı ile ara..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
      </Paper>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredMotorlar.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
          {filteredMotorlar.map(m => {
            const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
            const bgColor = m.durum === 'tamamlandi' ? '#E0F2F1' : m.durum === 'perte' ? '#ffcdd2' : m.durum === 'devir_bekliyor' ? '#F3E5F5' : m.stok_tipi === 'konsinye' ? '#E3F2FD' : m.durum === 'kapora' ? '#FFFDE7' : '#fff';
            return (
              <Paper key={m.id} sx={{ p: 1.5, bgcolor: bgColor }} onClick={async () => { try { const res = await ikinciElMotorService.getById(m.id); setDetayModal({ open: true, data: res.data }); } catch {} }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">{m.plaka}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatDate(m.tarih)}</Typography>
                </Box>
                <Typography variant="body2">{m.marka} {m.model} {m.yil ? `(${m.yil})` : ''}</Typography>
                <Typography variant="body2" color="text.secondary">{m.km ? Number(m.km).toLocaleString('tr-TR') + ' km' : ''} • {m.satici_adi || '-'}</Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Typography variant="body2">Alım: <strong>₺{parseFloat(m.alis_fiyati || 0).toLocaleString('tr-TR')}</strong></Typography>
                  <Typography variant="body2">Noter: <strong>₺{parseFloat(m.noter_alis || 0).toLocaleString('tr-TR')}</strong></Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={e => e.stopPropagation()}>
                  {m.durum !== 'tamamlandi' && m.durum !== 'perte' && (
                    <IconButton size="small" sx={{ color: '#2e7d32' }} onClick={() => openHizliSatis(m)}><SellIcon fontSize="small" /></IconButton>
                  )}
                  <IconButton size="small" color="info" onClick={() => openDialog(m)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Paper>
            );
          })}
        </Box>
      ) : (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableCell-root': { px: 1, py: 0.5, fontSize: '0.78rem' } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#C62828' }}>
              {['Plaka', 'Marka', 'Model', 'Yıl', 'KM', 'Alım', 'Satış', 'İsim Soyisim', 'Alım Tarihi', 'Alış Bedeli', 'İşlemler'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', px: 1, py: 0.7, fontSize: '0.78rem' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMotorlar.map(m => {
              const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
              return (
                <TableRow key={m.id} hover sx={m.durum === 'tamamlandi' ? { bgcolor: '#E0F2F1' } : m.durum === 'perte' ? { bgcolor: '#ffcdd2' } : m.durum === 'devir_bekliyor' ? { bgcolor: '#F3E5F5' } : m.stok_tipi === 'konsinye' ? { bgcolor: '#E3F2FD' } : m.durum === 'kapora' ? { bgcolor: '#FFFDE7' } : {}}>
                  <TableCell><strong>{m.plaka}</strong></TableCell>
                  <TableCell>{m.marka || '-'}</TableCell>
                  <TableCell>{m.model || '-'}</TableCell>
                  <TableCell>{m.yil || '-'}</TableCell>
                  <TableCell>{m.km ? Number(m.km).toLocaleString('tr-TR') : '-'}</TableCell>
                  <TableCell>{parseFloat(m.alis_fiyati || 0).toLocaleString('tr-TR')}</TableCell>
                  <TableCell>{parseFloat(m.noter_satis || 0).toLocaleString('tr-TR')}</TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={`${m.satici_adi || '-'}${m.satici_tc ? ' - TC: ' + m.satici_tc : ''}`}>
                      <span>{m.satici_adi || '-'}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(m.tarih)}</TableCell>
                  <TableCell>{parseFloat(m.noter_alis || 0).toLocaleString('tr-TR')}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {m.durum !== 'tamamlandi' && m.durum !== 'perte' && (
                      <Tooltip title="Hızlı Satış"><IconButton size="small" sx={{ color: '#2e7d32', p: 0.3 }} onClick={() => openHizliSatis(m)}><SellIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                    <IconButton size="small" color="primary" sx={{ p: 0.3 }} onClick={async () => { try { const res = await ikinciElMotorService.getById(m.id); setDetayModal({ open: true, data: res.data }); } catch {} }}><ViewIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="info" sx={{ p: 0.3 }} onClick={() => openDialog(m)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" sx={{ p: 0.3 }} onClick={() => handleDelete(m.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredMotorlar.length === 0 && <TableRow><TableCell colSpan={11} align="center">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* Stok Ekleme/Düzenleme Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{dialog.data ? 'Motor Düzenle' : 'Yeni Motor Ekle'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>Motor Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Plaka" value={f.plaka} onChange={e => setFormData({ ...f, plaka: e.target.value.toUpperCase() })} required /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Marka" value={f.marka} onChange={e => setFormData({ ...f, marka: e.target.value })} required /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Model" value={f.model} onChange={e => setFormData({ ...f, model: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Yıl" type="number" value={f.yil} onChange={e => setFormData({ ...f, yil: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="KM" type="number" value={f.km} onChange={e => setFormData({ ...f, km: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select fullWidth label="Durum" value={f.durum} onChange={e => setFormData({ ...f, durum: e.target.value })}
                sx={{ '& .MuiInputBase-root': { bgcolor: f.durum === 'kapora' ? '#FFFDE7' : f.durum === 'devir_bekliyor' ? '#F3E5F5' : f.durum === 'tamamlandi' ? '#E0F2F1' : 'inherit' } }}>
                <MenuItem value="stokta">Stokta</MenuItem>
                <MenuItem value="kapora">Kapora</MenuItem>
                <MenuItem value="devir_bekliyor">Devir Bekliyor</MenuItem>
                <MenuItem value="tamamlandi">Satıldı</MenuItem>
                <MenuItem value="perte">Perte</MenuItem>
              </TextField>
            </Grid>
            {dialog.data && dialog.data.durum !== 'tamamlandi' && (
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select fullWidth label="Stok Tipi" value={f.stok_tipi} onChange={e => setFormData({ ...f, stok_tipi: e.target.value })}
                  sx={{ '& .MuiInputBase-root': { bgcolor: f.stok_tipi === 'konsinye' ? '#e3f2fd' : '#fff3e0' } }}>
                  <MenuItem value="sahip">Benim Olanlar</MenuItem>
                  <MenuItem value="konsinye">Konsinye</MenuItem>
                </TextField>
              </Grid>
            )}
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Alım Tarihi" type="date" value={f.tarih} onChange={e => setFormData({ ...f, tarih: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select fullWidth label="Fatura Durumu" value={f.fatura_kesildi ? 'true' : 'false'} onChange={e => setFormData({ ...f, fatura_kesildi: e.target.value === 'true' })}
                sx={{ '& .MuiInputBase-root': { bgcolor: f.fatura_kesildi ? '#e8f5e9' : '#ffebee' } }}>
                <MenuItem value="false">Fatura Kesilmedi</MenuItem>
                <MenuItem value="true">Fatura Kesildi</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Fiyat Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Alım (₺)" type="number" value={f.alis_fiyati} onChange={e => setFormData({ ...f, alis_fiyati: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Alış Bedeli / Noter (₺)" type="number" value={f.noter_alis} onChange={e => setFormData({ ...f, noter_alis: e.target.value })} /></Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Satıcı Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete freeSolo options={musteriOptions}
                getOptionLabel={(o) => typeof o === 'string' ? o : o.ad_soyad}
                inputValue={f.satici_adi} onInputChange={(e, val) => { setFormData({ ...f, satici_adi: val }); searchMusteri(val); }}
                onChange={(e, val) => { if (val && typeof val === 'object') { setFormData({ ...f, satici_adi: val.ad_soyad, satici_tc: f.satici_tc }); } }}
                renderInput={(params) => <TextField {...params} fullWidth label="İsim Soyisim" />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="TC Kimlik" value={f.satici_tc} onChange={e => setFormData({ ...f, satici_tc: e.target.value })} /></Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Açıklama" value={f.aciklama} onChange={e => setFormData({ ...f, aciklama: e.target.value })} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, data: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSave}>{dialog.data ? 'Güncelle' : 'Kaydet'}</Button>
        </DialogActions>
      </Dialog>

      {/* Hızlı Satış Dialog */}
      <Dialog open={hizliSatis.open} onClose={() => setHizliSatis({ open: false, motor: null })} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ bgcolor: '#2e7d32', color: 'white' }}>
          ⚡ Hızlı Satış {hizliSatis.motor && `- ${hizliSatis.motor.plaka} ${hizliSatis.motor.marka || ''} ${hizliSatis.motor.model || ''}`}
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>Satış Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Satış Fiyatı (₺)" type="number" value={hizliForm.satis_fiyati} onChange={e => setHizliForm({ ...hizliForm, satis_fiyati: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Noter Satış (₺)" type="number" value={hizliForm.noter_satis} onChange={e => setHizliForm({ ...hizliForm, noter_satis: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Masraflar (₺)" type="number" value={hizliForm.masraflar} onChange={e => setHizliForm({ ...hizliForm, masraflar: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Yevmiye No" value={hizliForm.yevmiye_no} onChange={e => setHizliForm({ ...hizliForm, yevmiye_no: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Satış Tarihi" type="date" value={hizliForm.satis_tarihi} onChange={e => setHizliForm({ ...hizliForm, satis_tarihi: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Alıcı Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete freeSolo options={musteriOptions}
                getOptionLabel={(o) => typeof o === 'string' ? o : o.ad_soyad}
                inputValue={hizliForm.alici_adi} onInputChange={(e, val) => { setHizliForm({ ...hizliForm, alici_adi: val }); searchMusteri(val); }}
                onChange={(e, val) => { if (val && typeof val === 'object') { setHizliForm({ ...hizliForm, alici_adi: val.ad_soyad, alici_telefon: val.telefon || hizliForm.alici_telefon, alici_adres: val.adres || hizliForm.alici_adres }); } }}
                renderInput={(params) => <TextField {...params} fullWidth label="Ad Soyad" />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="TC No" value={hizliForm.alici_tc} onChange={e => setHizliForm({ ...hizliForm, alici_tc: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Telefon" value={hizliForm.alici_telefon} onChange={e => setHizliForm({ ...hizliForm, alici_telefon: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Adres" value={hizliForm.alici_adres} onChange={e => setHizliForm({ ...hizliForm, alici_adres: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHizliSatis({ open: false, motor: null })}>İptal</Button>
          <Button variant="contained" onClick={handleHizliSatis} sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>Satışı Tamamla</Button>
        </DialogActions>
      </Dialog>

      {/* Motor Detay Modal */}
      <StokDetayModal open={detayModal.open} data={detayModal.data} onClose={() => setDetayModal({ open: false, data: null })} printRef={printRef} isMobile={isMobile} />
    </Box>
  );
};

const StokDetayModal = ({ open, data, onClose, printRef, isMobile }) => {
  const handlePrint = useReactToPrint({ contentRef: printRef });
  if (!data) return null;

  const formatTL = (v) => parseFloat(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 });
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
  const alis = parseFloat(data.alis_fiyati || 0);
  const noterAlis = parseFloat(data.noter_alis || 0);

  const InfoRow = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
      <Typography variant="body2" color="text.secondary">{label}:</Typography>
      <Typography variant="body2" fontWeight="500">{value || '-'}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>Motor Stok Detay</Typography>
        <Button startIcon={<PrintIcon />} variant="contained" size="small" onClick={handlePrint} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' }, mr: 1 }}>Yazdır</Button>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box ref={printRef} sx={{ p: 1 }}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>🏍️ Motor Bilgileri</Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Plaka" value={data.plaka} />
              <InfoRow label="Marka" value={data.marka} />
              <InfoRow label="Model" value={data.model} />
              <InfoRow label="Yıl" value={data.yil} />
              <InfoRow label="KM" value={data.km ? Number(data.km).toLocaleString('tr-TR') : null} />
              <InfoRow label="Stok Tipi" value={data.stok_tipi === 'konsinye' ? 'Konsinye' : 'Sahip'} />
              <InfoRow label="Alım Tarihi" value={formatDate(data.tarih)} />
              {data.yevmiye_no && <InfoRow label="Yevmiye No" value={data.yevmiye_no} />}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>🏪 Satıcı Bilgileri</Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="İsim Soyisim" value={data.satici_adi} />
              <InfoRow label="TC Kimlik" value={data.satici_tc} />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>💰 Fiyat Bilgileri</Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 6 }}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                <Typography variant="caption" color="text.secondary">Alım</Typography>
                <Typography fontWeight="bold" sx={{ color: '#C62828' }}>₺{formatTL(alis)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 6 }}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fce4ec', borderLeft: '4px solid #c62828' }}>
                <Typography variant="caption" color="text.secondary">Alış Bedeli (Noter)</Typography>
                <Typography fontWeight="bold" sx={{ color: '#c62828' }}>₺{formatTL(noterAlis)}</Typography>
              </Paper>
            </Grid>
          </Grid>

          {data.aciklama && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>📝 Açıklama</Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography>{data.aciklama}</Typography>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default MotorStok;
