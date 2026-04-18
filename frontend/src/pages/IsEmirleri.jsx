import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, IconButton, TextField, MenuItem, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Alert, Divider, useTheme, useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon, Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Close as CloseIcon, Save as SaveIcon, Print as PrintIcon
} from '@mui/icons-material';
import { isEmriService, musteriService, authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const IsEmirleri = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [isEmirleri, setIsEmirleri] = useState([]);
  const [search, setSearch] = useState('');
  const [durumFilter, setDurumFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    musteri_ad_soyad: '', telefon: '', adres: '', km: '', marka: '', model_tip: '',
    tahmini_teslim_tarihi: '', tahmini_toplam_ucret: '',
    ariza_sikayetler: '', aciklama: '', odeme_detaylari: '', durum: 'beklemede',
    teslim_alan_ad_soyad: '', teslim_eden_teknisyen: '', teslim_tarihi: ''
  });
  const [parcalar, setParcalar] = useState([]);
  const [newParca, setNewParca] = useState({ takilan_parca: '', adet: 1, birim_fiyat: 0, maliyet: 0 });
  const [error, setError] = useState('');
  const [musteriOptions, setMusteriOptions] = useState([]);

  // Detay modal state
  const [detayModal, setDetayModal] = useState({ open: false, data: null });
  const [kullanicilar, setKullanicilar] = useState([]);

  const loadData = async () => {
    try {
      const params = {};
      if (durumFilter) params.durum = durumFilter;
      const res = await isEmriService.getAll(params);
      setIsEmirleri(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadData();
    authService.getPersonelListesi().then(r => {
      setKullanicilar(r.data || []);
    }).catch(() => {});
  }, [durumFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Bu iş emrini silmek istediğinizden emin misiniz?')) return;
    try { await isEmriService.delete(id); loadData(); } catch (err) { alert(err.response?.data?.message || 'Silme hatası'); }
  };

  const filtered = isEmirleri.filter(ie => {
    const matchSearch = !search || 
      (ie.musteri_ad_soyad?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (ie.fis_no?.toString() || '').includes(search) ||
      (ie.telefon || '').includes(search) ||
      (ie.marka?.toLowerCase() || '').includes(search.toLowerCase());
    const tarih = (ie.created_at || ie.tarih || '').split('T')[0];
    const matchStart = !startDate || tarih >= startDate;
    const matchEnd = !endDate || tarih <= endDate;
    return matchSearch && matchStart && matchEnd;
  });

  const durumRenk = (d) => {
    if (d === 'tamamlandi') return 'success';
    if (d === 'devam_ediyor') return 'info';
    return 'warning';
  };
  const durumLabel = (d) => {
    if (d === 'tamamlandi') return 'Tamam';
    if (d === 'devam_ediyor') return 'İşlemde';
    return 'Bekl.';
  };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '';

  const totalCount = isEmirleri.length;
  const todayCount = isEmirleri.filter(ie => {
    const d = new Date(ie.created_at || ie.tarih);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;
  const beklemedeCnt = isEmirleri.filter(ie => ie.durum === 'beklemede').length;
  const islemdeCnt = isEmirleri.filter(ie => ie.durum === 'devam_ediyor').length;
  const tamamlandiCnt = isEmirleri.filter(ie => ie.durum === 'tamamlandi').length;
  const toplamTutar = isEmirleri.reduce((t, ie) => t + parseFloat(ie.gercek_toplam_ucret || 0), 0);
  const toplamKar = isEmirleri.reduce((t, ie) => t + parseFloat(ie.kar || 0), 0);

  const statChips = [
    { label: `Toplam: ${totalCount}`, color: '#C62828', bg: '#ffebee' },
    { label: `Bugün: ${todayCount}`, color: '#C62828', bg: '#ffebee' },
    { label: `Beklemede: ${beklemedeCnt}`, color: '#C62828', bg: '#ffebee' },
    { label: `İşlemde: ${islemdeCnt}`, color: '#C62828', bg: '#ffebee' },
    { label: `Ödeme Bekl.: 0`, color: '#C62828', bg: '#ffebee' },
    { label: `Tamamlandı: ${tamamlandiCnt}`, color: '#C62828', bg: '#ffebee' },
    { label: `İptal: 0`, color: '#C62828', bg: '#ffebee' },
    { label: `₺${toplamTutar.toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
    { label: `Kar: ₺${toplamKar.toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
  ];

  // Modal functions
  const openModal = () => {
    setEditId(null);
    setFormData({
      musteri_ad_soyad: '', telefon: '', adres: '', km: '', marka: '', model_tip: '',
      tahmini_teslim_tarihi: '', tahmini_toplam_ucret: '',
      ariza_sikayetler: '', aciklama: '', odeme_detaylari: '', durum: 'beklemede',
      teslim_alan_ad_soyad: '', teslim_eden_teknisyen: '', teslim_tarihi: ''
    });
    setParcalar([]);
    setNewParca({ takilan_parca: '', adet: 1, birim_fiyat: 0, maliyet: 0 });
    setError('');
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    setError('');
    try {
      const res = await isEmriService.getById(id);
      const d = res.data;
      setEditId(id);
      setFormData({
        musteri_ad_soyad: d.musteri_ad_soyad || '', telefon: d.telefon || '', adres: d.adres || '',
        km: d.km || '', marka: d.marka || '', model_tip: d.model_tip || '',
        tahmini_teslim_tarihi: d.tahmini_teslim_tarihi ? new Date(d.tahmini_teslim_tarihi).toLocaleDateString('en-CA') : '',
        tahmini_toplam_ucret: d.tahmini_toplam_ucret || '',
        ariza_sikayetler: d.ariza_sikayetler || '', aciklama: d.aciklama || '',
        odeme_detaylari: d.odeme_detaylari || '', durum: d.durum || 'beklemede',
        teslim_alan_ad_soyad: d.teslim_alan_ad_soyad || d.olusturan_kisi || '',
        teslim_eden_teknisyen: d.teslim_eden_teknisyen || d.olusturan_kisi || '',
        teslim_tarihi: d.teslim_tarihi ? new Date(d.teslim_tarihi).toLocaleDateString('en-CA') : ''
      });
      setParcalar(d.parcalar || []);
      setNewParca({ takilan_parca: '', adet: 1, birim_fiyat: 0, maliyet: 0 });
      setModalOpen(true);
    } catch { setError('İş emri yüklenemedi'); }
  };

  const addParca = () => {
    if (!newParca.takilan_parca.trim()) return;
    setParcalar([...parcalar, { ...newParca }]);
    setNewParca({ takilan_parca: '', adet: 1, birim_fiyat: 0, maliyet: 0 });
  };

  const removeParca = (index) => setParcalar(parcalar.filter((_, i) => i !== index));

  const handleMusteriSearch = async (query) => {
    if (query.length < 2) return;
    try { const res = await musteriService.search(query); setMusteriOptions(res.data); } catch {}
  };

  const handleMusteriSelect = (musteri) => {
    if (musteri) {
      setFormData({ ...formData, musteri_ad_soyad: musteri.ad_soyad || '', telefon: musteri.telefon || '', adres: musteri.adres || '' });
    }
  };

  const handleSave = async () => {
    setError('');
    if (!formData.musteri_ad_soyad.trim()) { setError('Ad Soyad zorunlu'); return; }
    try {
      const payload = { ...formData, parcalar };
      if (editId) {
        await isEmriService.update(editId, payload);
      } else {
        await isEmriService.create(payload);
      }
      setModalOpen(false);
      setEditId(null);
      loadData();
    } catch (err) { setError(err.response?.data?.message || 'Kaydetme hatası'); }
  };

  const toplamFiyat = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.birim_fiyat) || 0), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const toplamKarModal = toplamFiyat - toplamMaliyet;

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        {statChips.map((c, i) => (
          <Chip key={i} label={c.label} sx={{ bgcolor: c.bg, color: c.color, fontWeight: 'bold', fontSize: '0.8rem', borderLeft: `4px solid ${c.color}` }} />
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={openModal}>Yeni İş Emri</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Ara (Müşteri, Fiş No, Marka,...)" value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ minWidth: { xs: '100%', sm: 250 } }} />
          <TextField select size="small" value={durumFilter} onChange={(e) => setDurumFilter(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 150 } }} label="Durum">
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="beklemede">Beklemede</MenuItem>
            <MenuItem value="devam_ediyor">Devam Ediyor</MenuItem>
            <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
          </TextField>
          <TextField size="small" label="Başlangıç" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="Bitiş" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>
      </Paper>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.length === 0 && <Alert severity="info">Kayıt bulunamadı</Alert>}
          {filtered.map(ie => {
            const toplam = parseFloat(ie.gercek_toplam_ucret || 0);
            const maliyet = parseFloat(ie.toplam_maliyet || 0);
            const kar = parseFloat(ie.kar || 0);
            return (
              <Paper key={ie.id} sx={{ p: 1.5 }} onClick={async () => { try { const res = await isEmriService.getById(ie.id); setDetayModal({ open: true, data: res.data }); } catch {} }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ color: '#C62828', fontWeight: 'bold' }}>#{ie.fis_no}</Typography>
                  <Chip label={durumLabel(ie.durum)} size="small" color={durumRenk(ie.durum)} sx={{ height: 20, fontSize: '0.7rem' }} />
                </Box>
                <Typography variant="body2" fontWeight="bold">{ie.musteri_ad_soyad}</Typography>
                <Typography variant="body2" color="text.secondary">{ie.marka} {ie.model_tip} • {ie.telefon || '-'}</Typography>
                <Typography variant="body2" color="text.secondary">{formatDate(ie.created_at || ie.tarih)} • {ie.teslim_eden_teknisyen || ie.teslim_alan_ad_soyad || ie.olusturan_kisi || '-'}</Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Typography variant="body2">Toplam: <strong>₺{toplam.toLocaleString('tr-TR')}</strong></Typography>
                  <Typography variant="body2" sx={{ color: kar >= 0 ? '#2e7d32' : '#c62828' }}>Kâr: <strong>₺{kar.toLocaleString('tr-TR')}</strong></Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={e => e.stopPropagation()}>
                  <IconButton size="small" sx={{ color: '#C62828' }} onClick={async () => { try { const res = await isEmriService.getById(ie.id); printIsEmri(res.data); } catch {} }}><PrintIcon /></IconButton>
                  <IconButton size="small" color="info" onClick={() => openEditModal(ie.id)}><EditIcon /></IconButton>
                  {user?.rol === 'admin' && <IconButton size="small" color="error" onClick={() => handleDelete(ie.id)}><DeleteIcon /></IconButton>}
                </Box>
              </Paper>
            );
          })}
        </Box>
      ) : (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['Fiş No', 'Müşteri', 'Araç', 'Telefon', 'Tarih/Durum', 'Personel', 'Arıza', 'Toplam', 'Maliyet', 'Kar', 'İşlemler'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(ie => {
              const toplam = parseFloat(ie.gercek_toplam_ucret || 0);
              const maliyet = parseFloat(ie.toplam_maliyet || 0);
              const kar = parseFloat(ie.kar || 0);
              return (
                <TableRow key={ie.id} hover>
                  <TableCell sx={{ color: '#C62828', fontWeight: 'bold' }}>{ie.fis_no}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{ie.musteri_ad_soyad}</TableCell>
                  <TableCell>{ie.marka} {ie.model_tip}</TableCell>
                  <TableCell>{ie.telefon}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontSize="0.8rem">{formatDate(ie.created_at || ie.tarih)}</Typography>
                    <Chip label={durumLabel(ie.durum)} size="small" color={durumRenk(ie.durum)}
                      sx={{ height: 20, fontSize: '0.7rem', mt: 0.3 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{ie.teslim_eden_teknisyen || ie.teslim_alan_ad_soyad || ie.olusturan_kisi || '-'}</TableCell>
                  <TableCell>{ie.ariza_sikayetler || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>₺{toplam.toLocaleString('tr-TR')}</TableCell>
                  <TableCell sx={{ color: '#C62828' }}>₺{maliyet.toLocaleString('tr-TR')}</TableCell>
                  <TableCell sx={{ color: kar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>₺{kar.toLocaleString('tr-TR')}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" color="primary" onClick={async () => { try { const res = await isEmriService.getById(ie.id); setDetayModal({ open: true, data: res.data }); } catch {} }}><ViewIcon /></IconButton>
                    <IconButton size="small" sx={{ color: '#C62828' }} onClick={async () => { try { const res = await isEmriService.getById(ie.id); printIsEmri(res.data); } catch {} }}><PrintIcon /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openEditModal(ie.id)}><EditIcon /></IconButton>
                    {user?.rol === 'admin' && (
                      <IconButton size="small" color="error" onClick={() => handleDelete(ie.id)}><DeleteIcon /></IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={11} align="center">Kayıt bulunamadı</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* Yeni İş Emri Modal */}
      <Dialog open={modalOpen} onClose={() => { setModalOpen(false); setEditId(null); }} maxWidth="lg" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18 }}>📋</Box>
          <Typography variant="h6" fontWeight="bold">{editId ? 'İş Emri Düzenle' : 'Yeni İş Emri'}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={() => { setModalOpen(false); setEditId(null); }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={3}>
            {/* Sol: Müşteri + Araç + Arıza */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                👤 Müşteri Bilgileri
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Ad Soyad *" value={formData.musteri_ad_soyad}
                    onChange={e => setFormData({ ...formData, musteri_ad_soyad: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 6 }} sx={{ position: 'relative' }}>
                  <TextField fullWidth size="small" label="Telefon" value={formData.telefon}
                    onChange={e => { setFormData({ ...formData, telefon: e.target.value }); handleMusteriSearch(e.target.value); }} />
                  {musteriOptions.length > 0 && formData.telefon.length >= 2 && (
                    <Paper sx={{ position: 'absolute', zIndex: 10, left: 16, right: 0, maxHeight: 200, overflow: 'auto', boxShadow: 3, bgcolor: 'white' }}>
                      {musteriOptions.map(m => (
                        <Box key={m.id} sx={{ p: 1, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' }, borderBottom: '1px solid #eee' }}
                          onClick={() => { handleMusteriSelect(m); setMusteriOptions([]); }}>
                          <Typography variant="body2"><strong>{m.telefon}</strong> - {m.ad_soyad}</Typography>
                        </Box>
                      ))}
                    </Paper>
                  )}
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="KM" value={formData.km}
                    onChange={e => setFormData({ ...formData, km: e.target.value })}
                    InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment> }} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Adres" value={formData.adres}
                    onChange={e => setFormData({ ...formData, adres: e.target.value })} />
                </Grid>
              </Grid>

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                🏍️ Araç Bilgileri
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth size="small" label="Marka" value={formData.marka}
                    onChange={e => setFormData({ ...formData, marka: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth size="small" label="Model/Tip" value={formData.model_tip}
                    onChange={e => setFormData({ ...formData, model_tip: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select fullWidth size="small" label="Durum" value={formData.durum}
                    onChange={e => setFormData({ ...formData, durum: e.target.value })}>
                    <MenuItem value="beklemede">Beklemede</MenuItem>
                    <MenuItem value="devam_ediyor">Devam Ediyor</MenuItem>
                    <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" type="date" label="Tahmini Teslim" value={formData.tahmini_teslim_tarihi}
                    onChange={e => setFormData({ ...formData, tahmini_teslim_tarihi: e.target.value })} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Tahmini Ücret" type="number" value={formData.tahmini_toplam_ucret}
                    onChange={e => setFormData({ ...formData, tahmini_toplam_ucret: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
                </Grid>
              </Grid>

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                🔧 Arıza ve Açıklama
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Arıza / Şikayetler" multiline rows={2} value={formData.ariza_sikayetler}
                    onChange={e => setFormData({ ...formData, ariza_sikayetler: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField fullWidth size="small" label="Ek Açıklama" multiline rows={2} value={formData.aciklama}
                    onChange={e => setFormData({ ...formData, aciklama: e.target.value })} />
                </Grid>
              </Grid>
            </Grid>

            {/* Sağ: Parçalar + Ödeme */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  📋 Parçalar ve İşçilik
                </Typography>
                <Chip label={`${parcalar.length} parça`} size="small" color="primary" variant="outlined" />
              </Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <TextField fullWidth size="small" label="Takılan Parça / İşçilik Adı" value={newParca.takilan_parca}
                  onChange={e => setNewParca({ ...newParca, takilan_parca: e.target.value })} sx={{ mb: 1.5 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 4 }}>
                    <TextField fullWidth size="small" label="Adet" type="number" value={newParca.adet}
                      onChange={e => setNewParca({ ...newParca, adet: e.target.value })} />
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <TextField fullWidth size="small" label="Satış Fiyatı (₺)" type="number" value={newParca.birim_fiyat}
                      onChange={e => setNewParca({ ...newParca, birim_fiyat: e.target.value })}
                      InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <TextField fullWidth size="small" label="Maliyet Fiyatı (₺)" type="number" value={newParca.maliyet}
                      onChange={e => setNewParca({ ...newParca, maliyet: e.target.value })}
                      InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }} />
                  </Grid>
                </Grid>
                <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={addParca} sx={{ mt: 1.5 }}>Parça Ekle</Button>
              </Paper>

              {parcalar.length > 0 ? (
                isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {parcalar.map((p, i) => {
                    const pSatis = (Number(p.adet) || 0) * (Number(p.birim_fiyat) || 0);
                    const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                    const pKar = pSatis - pMaliyet;
                    return (
                      <Paper key={i} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="bold">{p.takilan_parca}</Typography>
                          <Typography variant="caption" color="text.secondary">Adet: {p.adet} • Satış: ₺{pSatis.toLocaleString('tr-TR')} • Maliyet: ₺{pMaliyet.toLocaleString('tr-TR')}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: pKar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>Kâr: ₺{pKar.toLocaleString('tr-TR')}</Typography>
                        </Box>
                        <IconButton size="small" color="error" onClick={() => removeParca(i)}><CloseIcon fontSize="small" /></IconButton>
                      </Paper>
                    );
                  })}
                </Box>
                ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Parça</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Adet</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Satış</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Maliyet</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Kâr</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Sil</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parcalar.map((p, i) => {
                        const pSatis = (Number(p.adet) || 0) * (Number(p.birim_fiyat) || 0);
                        const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                        const pKar = pSatis - pMaliyet;
                        return (
                          <TableRow key={i}>
                            <TableCell>{p.takilan_parca}</TableCell>
                            <TableCell align="center">{p.adet}</TableCell>
                            <TableCell align="right">₺{pSatis.toLocaleString('tr-TR')}</TableCell>
                            <TableCell align="right">₺{pMaliyet.toLocaleString('tr-TR')}</TableCell>
                            <TableCell align="right" sx={{ color: pKar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>₺{pKar.toLocaleString('tr-TR')}</TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="error" onClick={() => removeParca(i)}><CloseIcon fontSize="small" /></IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                )
              ) : (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary', mb: 2 }}>
                  Henüz parça eklenmedi
                </Paper>
              )}

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                📋 Ödeme Detayları
              </Typography>
              <TextField fullWidth size="small" placeholder="Örn: Nakit, Kart..." value={formData.odeme_detaylari}
                onChange={e => setFormData({ ...formData, odeme_detaylari: e.target.value })} multiline rows={2} />

              {editId && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    📅 Teslim Bilgileri
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <TextField fullWidth size="small" label="Teslim Tarihi" type="date" value={formData.teslim_tarihi}
                        onChange={e => setFormData({ ...formData, teslim_tarihi: e.target.value })} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField select fullWidth size="small" label="Teslim Alan" value={formData.teslim_alan_ad_soyad}
                        onChange={e => setFormData({ ...formData, teslim_alan_ad_soyad: e.target.value })}>
                        <MenuItem value="">Seçiniz</MenuItem>
                        {kullanicilar.map(k => <MenuItem key={k.id} value={k.ad_soyad}>{k.ad_soyad}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField select fullWidth size="small" label="Teslim Eden Teknisyen" value={formData.teslim_eden_teknisyen}
                        onChange={e => setFormData({ ...formData, teslim_eden_teknisyen: e.target.value })}>
                        <MenuItem value="">Seçiniz</MenuItem>
                        {kullanicilar.map(k => <MenuItem key={k.id} value={k.ad_soyad}>{k.ad_soyad}</MenuItem>)}
                      </TextField>
                    </Grid>
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" color="error" onClick={() => { setModalOpen(false); setEditId(null); }}>İptal</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>{editId ? 'Güncelle' : 'Kaydet'}</Button>
        </DialogActions>
      </Dialog>

      {/* İş Emri Detay Modal */}
      <IsEmriDetayModal open={detayModal.open} data={detayModal.data} onClose={() => setDetayModal({ open: false, data: null })} onEdit={openEditModal} isMobile={isMobile} />
    </Box>
  );
};

const printIsEmri = (data) => {
  if (!data) return;
  const parcalar = data.parcalar || [];
  const toplamFiyat = parcalar.reduce((t, p) => t + parseFloat(p.toplam_fiyat || 0), 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
  const durumLabel = (d) => d === 'tamamlandi' ? 'Tamamlandı' : d === 'devam_ediyor' ? 'Devam Ediyor' : 'Beklemede';

  const parcaRows = parcalar.map(p => {
    const pSatis = parseFloat(p.toplam_fiyat || 0);
    return `<tr>
      <td style="padding:6px;border:1px solid #ddd">${p.takilan_parca || ''}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:center">${p.adet}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">₺${parseFloat(p.birim_fiyat || 0).toLocaleString('tr-TR')}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right;font-weight:bold">₺${pSatis.toLocaleString('tr-TR')}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>İş Emri #${data.fis_no}</title>
  <style>
    body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;padding:15px;font-size:12px;color:#333}
    h2{text-align:center;margin:0 0 5px;color:#C62828}
    .header{text-align:center;margin-bottom:15px;border-bottom:2px solid #C62828;padding-bottom:10px}
    .section{margin-bottom:12px}
    .section-title{font-weight:bold;color:#C62828;font-size:13px;margin-bottom:5px;border-bottom:1px solid #eee;padding-bottom:3px}
    .info-grid{display:flex;gap:20px;margin-bottom:12px}
    .info-box{flex:1}
    .info-row{display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dotted #eee}
    .info-row .label{color:#666}
    .info-row .value{font-weight:500}
    table{width:100%;border-collapse:collapse;margin-top:5px}
    th{background:#C62828;color:white;padding:6px;text-align:left;font-size:11px}
    td{font-size:11px}
    .total-box{text-align:right;margin-top:8px;font-size:13px;font-weight:bold}
    .footer{margin-top:30px;display:flex;justify-content:space-between}
    .sign-box{text-align:center;width:45%}
    .sign-line{border-top:1px solid #333;margin-top:40px;padding-top:5px}
    @page{size:A4;margin:10mm}
  </style></head><body>
  <div class="header">
    <h2>KAYNAR MOTOR - İŞ EMRİ</h2>
    <div>Fiş No: <strong>#${data.fis_no}</strong> | Tarih: ${formatDate(data.created_at)}</div>
  </div>
  <div class="info-grid">
    <div class="info-box">
      <div class="section-title">Müşteri Bilgileri</div>
      <div class="info-row"><span class="label">Ad Soyad:</span><span class="value">${data.musteri_ad_soyad || '-'}</span></div>
      <div class="info-row"><span class="label">Telefon:</span><span class="value">${data.telefon || '-'}</span></div>
      <div class="info-row"><span class="label">Adres:</span><span class="value">${data.adres || '-'}</span></div>
      <div class="info-row"><span class="label">KM:</span><span class="value">${data.km || '-'}</span></div>
    </div>
    <div class="info-box">
      <div class="section-title">Araç Bilgileri</div>
      <div class="info-row"><span class="label">Marka:</span><span class="value">${data.marka || '-'}</span></div>
      <div class="info-row"><span class="label">Model/Tip:</span><span class="value">${data.model_tip || '-'}</span></div>
      <div class="info-row"><span class="label">Durum:</span><span class="value">${durumLabel(data.durum)}</span></div>
      <div class="info-row"><span class="label">Kaydı Açan:</span><span class="value">${data.olusturan_kisi || '-'}</span></div>
    </div>
    <div class="info-box">
      <div class="section-title">Tarih ve Teslim</div>
      <div class="info-row"><span class="label">Oluşturma:</span><span class="value">${formatDate(data.created_at)}</span></div>
      <div class="info-row"><span class="label">Tah. Teslim:</span><span class="value">${formatDate(data.tahmini_teslim_tarihi)}</span></div>
      <div class="info-row"><span class="label">Teslim Tarihi:</span><span class="value">${formatDate(data.teslim_tarihi)}</span></div>
      <div class="info-row"><span class="label">Teslim Alan:</span><span class="value">${data.teslim_alan_ad_soyad || '-'}</span></div>
      <div class="info-row"><span class="label">Teslim Eden:</span><span class="value">${data.teslim_eden_teknisyen || '-'}</span></div>
    </div>
  </div>
  ${data.ariza_sikayetler ? `<div class="section"><div class="section-title">Arıza / Şikayetler</div><div>${data.ariza_sikayetler}</div></div>` : ''}
  ${data.aciklama ? `<div class="section"><div class="section-title">Açıklama</div><div>${data.aciklama}</div></div>` : ''}
  <div class="section">
    <div class="section-title">Parçalar ve İşçilik</div>
    ${parcalar.length > 0 ? `
      <table><thead><tr>
        <th>Takılan Parça</th><th style="text-align:center">Adet</th><th style="text-align:right">Birim Fiyat</th><th style="text-align:right">Toplam</th>
      </tr></thead><tbody>${parcaRows}</tbody></table>
      <div class="total-box">Toplam: ₺${toplamFiyat.toLocaleString('tr-TR')}</div>
    ` : '<div style="text-align:center;color:#999;padding:10px">Parça kaydı yok</div>'}
  </div>
  ${data.odeme_detaylari ? `<div class="section"><div class="section-title">Ödeme Detayları</div><div>${data.odeme_detaylari}</div></div>` : ''}
  <div class="footer">
    <div class="sign-box"><div class="sign-line">Teslim Eden</div></div>
    <div class="sign-box"><div class="sign-line">Teslim Alan</div></div>
  </div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};

const IsEmriDetayModal = ({ open, data, onClose, onEdit, isMobile }) => {
  if (!data) return null;

  const parcalar = data.parcalar || [];
  const toplamFiyat = parcalar.reduce((t, p) => t + parseFloat(p.toplam_fiyat || 0), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const kar = toplamFiyat - toplamMaliyet;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
  const durumLabel = (d) => d === 'tamamlandi' ? 'Tamamlandı' : d === 'devam_ediyor' ? 'Devam Ediyor' : 'Beklemede';
  const durumRenk = (d) => d === 'tamamlandi' ? 'success' : d === 'devam_ediyor' ? 'info' : 'warning';

  const InfoRow = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
      <Typography variant="body2" color="text.secondary">{label}:</Typography>
      <Typography variant="body2" fontWeight="500">{value || '-'}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>İş Emri #{data.fis_no}</Typography>
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => { onClose(); onEdit(data.id); }} sx={{ mr: 1 }}>Düzenle</Button>
        <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={() => printIsEmri(data)} sx={{ mr: 1 }}>Yazdır</Button>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ p: 1 }}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>👤 Müşteri Bilgileri</Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Ad Soyad" value={data.musteri_ad_soyad} />
              <InfoRow label="Telefon" value={data.telefon} />
              <InfoRow label="Adres" value={data.adres} />
              <InfoRow label="KM" value={data.km} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>🏍️ Araç Bilgileri</Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Fiş No" value={`#${data.fis_no}`} />
              <InfoRow label="Marka" value={data.marka} />
              <InfoRow label="Model/Tip" value={data.model_tip} />
              <Box sx={{ mt: 1 }}><Chip label={durumLabel(data.durum)} color={durumRenk(data.durum)} size="small" /></Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>📅 Tarih ve Teslim</Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Oluşturma" value={formatDate(data.created_at)} />
              <InfoRow label="Tahmini Teslim" value={formatDate(data.tahmini_teslim_tarihi)} />
              <InfoRow label="Teslim Tarihi" value={formatDate(data.teslim_tarihi)} />
              <InfoRow label="Teslim Alan" value={data.teslim_alan_ad_soyad} />
              <InfoRow label="Teslim Eden" value={data.teslim_eden_teknisyen} />
              <InfoRow label="Kaydı Açan" value={data.olusturan_kisi} />
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>🔧 Arıza / Şikayetler</Typography>
                <Divider sx={{ mb: 1 }} />
                <Typography>{data.ariza_sikayetler || 'Belirtilmemiş'}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>📝 Açıklama</Typography>
                <Divider sx={{ mb: 1 }} />
                <Typography>{data.aciklama || 'Belirtilmemiş'}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>📋 Parçalar ve İşçilik</Typography>
            <Divider sx={{ mb: 1 }} />
            {parcalar.length > 0 ? (
              <>
                {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {parcalar.map((p, i) => {
                    const pSatis = parseFloat(p.toplam_fiyat || 0);
                    const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                    const pKar = pSatis - pMaliyet;
                    return (
                      <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="body2" fontWeight="bold">{p.takilan_parca}</Typography>
                        <Typography variant="caption" color="text.secondary">Adet: {p.adet} • Birim: ₺{parseFloat(p.birim_fiyat || 0).toLocaleString('tr-TR')} • Toplam: ₺{pSatis.toLocaleString('tr-TR')}</Typography>
                        <Typography variant="caption" className="no-print" sx={{ display: 'block' }}>Maliyet: ₺{pMaliyet.toLocaleString('tr-TR')} • <span style={{ color: pKar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>Kâr: ₺{pKar.toLocaleString('tr-TR')}</span></Typography>
                      </Paper>
                    );
                  })}
                </Box>
                ) : (
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        {['Takılan Parça', 'Adet', 'Birim Fiyat', 'Toplam'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 'bold' }} className="no-print">Maliyet</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} className="no-print">Kâr</TableCell>
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
                            <TableCell className="no-print">₺{pMaliyet.toLocaleString('tr-TR')}</TableCell>
                            <TableCell className="no-print" sx={{ color: pKar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>₺{pKar.toLocaleString('tr-TR')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#ffebee' }}>
                    <Typography variant="body2">Toplam: <strong>₺{toplamFiyat.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#ffebee' }} className="no-print">
                    <Typography variant="body2">Maliyet: <strong>₺{toplamMaliyet.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: kar >= 0 ? '#e8f5e9' : '#ffebee' }} className="no-print">
                    <Typography variant="body2" sx={{ color: kar >= 0 ? '#2e7d32' : '#c62828' }}>Kâr: <strong>₺{kar.toLocaleString('tr-TR')}</strong></Typography>
                  </Paper>
                </Box>
              </>
            ) : (
              <Typography color="text.secondary" textAlign="center" py={2}>Parça kaydı yok</Typography>
            )}
          </Paper>

          {data.odeme_detaylari && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>💳 Ödeme Detayları</Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography>{data.odeme_detaylari}</Typography>
            </Paper>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default IsEmirleri;
