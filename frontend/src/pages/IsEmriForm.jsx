import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Grid, MenuItem, IconButton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Alert, Autocomplete, useMediaQuery, useTheme
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { isEmriService, musteriService } from '../services/api';

const IsEmriForm = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    musteri_ad_soyad: '', adres: '', telefon: '', km: '', model_tip: '', marka: '',
    aciklama: '', ariza_sikayetler: '', tahmini_teslim_tarihi: '', tahmini_toplam_ucret: '',
    durum: 'beklemede', odeme_detaylari: '', teslim_alan_ad_soyad: '', teslim_eden_teknisyen: '', teslim_tarihi: ''
  });
  const [parcalar, setParcalar] = useState([]);
  const [fisNo, setFisNo] = useState('');
  const [error, setError] = useState('');
  const [musteriOptions, setMusteriOptions] = useState([]);

  useEffect(() => {
    if (isEdit) {
      loadIsEmri();
    } else {
      loadNextFisNo();
    }
  }, [id]);

  const loadIsEmri = async () => {
    try {
      const res = await isEmriService.getById(id);
      const data = res.data;
      setFormData({
        musteri_ad_soyad: data.musteri_ad_soyad || '', adres: data.adres || '', telefon: data.telefon || '',
        km: data.km || '', model_tip: data.model_tip || '', marka: data.marka || '',
        aciklama: data.aciklama || '', ariza_sikayetler: data.ariza_sikayetler || '',
        tahmini_teslim_tarihi: data.tahmini_teslim_tarihi ? data.tahmini_teslim_tarihi.split('T')[0] : '',
        tahmini_toplam_ucret: data.tahmini_toplam_ucret || '', durum: data.durum || 'beklemede',
        odeme_detaylari: data.odeme_detaylari || '', teslim_alan_ad_soyad: data.teslim_alan_ad_soyad || '',
        teslim_eden_teknisyen: data.teslim_eden_teknisyen || '',
        teslim_tarihi: data.teslim_tarihi ? data.teslim_tarihi.split('T')[0] : ''
      });
      setFisNo(data.fis_no);
      setParcalar(data.parcalar || []);
    } catch { setError('İş emri yüklenemedi'); }
  };

  const loadNextFisNo = async () => {
    try { const res = await isEmriService.getNextFisNo(); setFisNo(res.data.nextFisNo); } catch {}
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleMusteriSearch = async (query) => {
    if (query.length < 2) return;
    try {
      const res = await musteriService.search(query);
      setMusteriOptions(res.data);
    } catch {}
  };

  const handleMusteriSelect = (musteri) => {
    if (musteri) {
      setFormData({ ...formData, musteri_ad_soyad: musteri.ad_soyad || '', telefon: musteri.telefon || '', adres: musteri.adres || '' });
    }
  };

  const addParca = () => {
    setParcalar([...parcalar, { parca_kodu: '', takilan_parca: '', adet: 1, birim_fiyat: 0, maliyet: 0 }]);
  };

  const updateParca = (index, field, value) => {
    const updated = [...parcalar];
    updated[index][field] = value;
    if (field === 'adet' || field === 'birim_fiyat') {
      updated[index].toplam_fiyat = (Number(updated[index].adet) || 0) * (Number(updated[index].birim_fiyat) || 0);
    }
    setParcalar(updated);
  };

  const removeParca = (index) => setParcalar(parcalar.filter((_, i) => i !== index));

  const toplamFiyat = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.birim_fiyat) || 0), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const kar = toplamFiyat - toplamMaliyet;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...formData, parcalar };
      if (isEdit) {
        await isEmriService.update(id, payload);
      } else {
        await isEmriService.create(payload);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Kaydetme hatası');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)}><BackIcon /></IconButton>
        <Typography variant="h5" fontWeight="bold">
          {isEdit ? `İş Emri Düzenle #${fisNo}` : `Yeni İş Emri #${fisNo}`}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Müşteri Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete freeSolo options={musteriOptions} getOptionLabel={(o) => typeof o === 'string' ? o : o.ad_soyad || ''}
                onInputChange={(_, v) => { handleMusteriSearch(v); setFormData({ ...formData, musteri_ad_soyad: v }); }}
                onChange={(_, v) => handleMusteriSelect(v)} inputValue={formData.musteri_ad_soyad}
                renderInput={(params) => <TextField {...params} label="Ad Soyad" required />} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Telefon" name="telefon" value={formData.telefon} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Adres" name="adres" value={formData.adres} onChange={handleChange} />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Araç Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Marka" name="marka" value={formData.marka} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Model/Tip" name="model_tip" value={formData.model_tip} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="KM" name="km" type="number" value={formData.km} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Arıza/Şikayetler" name="ariza_sikayetler" value={formData.ariza_sikayetler} onChange={handleChange} multiline rows={2} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Açıklama" name="aciklama" value={formData.aciklama} onChange={handleChange} multiline rows={2} />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3, border: '2px solid', borderColor: formData.durum === 'tamamlandi' ? '#2e7d32' : formData.durum === 'devam_ediyor' ? '#1565C0' : '#ed6c02' }}>
          <Typography variant="h6" gutterBottom sx={{ color: formData.durum === 'tamamlandi' ? '#2e7d32' : formData.durum === 'devam_ediyor' ? '#1565C0' : '#ed6c02' }}>Durum</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Durum" name="durum" value={formData.durum} onChange={handleChange}
                sx={{ '& .MuiInputBase-root': { bgcolor: formData.durum === 'tamamlandi' ? '#e8f5e9' : formData.durum === 'devam_ediyor' ? '#e3f2fd' : '#fff3e0', fontWeight: 'bold' } }}>
                <MenuItem value="beklemede">Beklemede</MenuItem>
                <MenuItem value="devam_ediyor">İşlemde</MenuItem>
                <MenuItem value="odeme_bekliyor">Ödeme Bekliyor</MenuItem>
                <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
                <MenuItem value="iptal">İptal</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Parçalar</Typography>
            <Button startIcon={<AddIcon />} onClick={addParca} variant="outlined" size="small">Parça Ekle</Button>
          </Box>
          {parcalar.length > 0 && (
            isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {parcalar.map((p, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Parça #{i + 1}</Typography>
                    <IconButton size="small" color="error" onClick={() => removeParca(i)}><DeleteIcon /></IconButton>
                  </Box>
                  <Grid container spacing={1}>
                    <Grid size={6}><TextField fullWidth size="small" label="Parça Kodu" value={p.parca_kodu || ''} onChange={e => updateParca(i, 'parca_kodu', e.target.value)} /></Grid>
                    <Grid size={6}><TextField fullWidth size="small" label="Takılan Parça" value={p.takilan_parca || ''} onChange={e => updateParca(i, 'takilan_parca', e.target.value)} /></Grid>
                    <Grid size={4}><TextField fullWidth size="small" type="number" label="Adet" value={p.adet} onChange={e => updateParca(i, 'adet', e.target.value)} /></Grid>
                    <Grid size={4}><TextField fullWidth size="small" type="number" label="Birim Fiyat" value={p.birim_fiyat} onChange={e => updateParca(i, 'birim_fiyat', e.target.value)} /></Grid>
                    <Grid size={4}><TextField fullWidth size="small" type="number" label="Maliyet" value={p.maliyet} onChange={e => updateParca(i, 'maliyet', e.target.value)} /></Grid>
                  </Grid>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>Toplam: {((Number(p.adet) || 0) * (Number(p.birim_fiyat) || 0)).toLocaleString('tr-TR')} ₺</Typography>
                </Paper>
              ))}
            </Box>
            ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Parça Kodu', 'Takılan Parça', 'Adet', 'Birim Fiyat (₺)', 'Maliyet (₺)', 'Toplam (₺)', ''].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parcalar.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell><TextField size="small" value={p.parca_kodu || ''} onChange={e => updateParca(i, 'parca_kodu', e.target.value)} /></TableCell>
                      <TableCell><TextField size="small" value={p.takilan_parca || ''} onChange={e => updateParca(i, 'takilan_parca', e.target.value)} sx={{ minWidth: 200 }} /></TableCell>
                      <TableCell><TextField size="small" type="number" value={p.adet} onChange={e => updateParca(i, 'adet', e.target.value)} sx={{ width: 80 }} /></TableCell>
                      <TableCell><TextField size="small" type="number" value={p.birim_fiyat} onChange={e => updateParca(i, 'birim_fiyat', e.target.value)} sx={{ width: 120 }} /></TableCell>
                      <TableCell><TextField size="small" type="number" value={p.maliyet} onChange={e => updateParca(i, 'maliyet', e.target.value)} sx={{ width: 120 }} /></TableCell>
                      <TableCell>{((Number(p.adet) || 0) * (Number(p.birim_fiyat) || 0)).toLocaleString('tr-TR')} ₺</TableCell>
                      <TableCell><IconButton size="small" color="error" onClick={() => removeParca(i)}><DeleteIcon /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )
          )}
          <Box sx={{ mt: 2, display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Typography>Toplam: <strong>{toplamFiyat.toLocaleString('tr-TR')} ₺</strong></Typography>
            <Typography>Maliyet: <strong>{toplamMaliyet.toLocaleString('tr-TR')} ₺</strong></Typography>
            <Typography sx={{ color: kar >= 0 ? 'green' : 'red' }}>Kâr: <strong>{kar.toLocaleString('tr-TR')} ₺</strong></Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Teslim Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Tahmini Teslim Tarihi" name="tahmini_teslim_tarihi" type="date"
                value={formData.tahmini_teslim_tarihi} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Teslim Tarihi" name="teslim_tarihi" type="date"
                value={formData.teslim_tarihi} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Teslim Alan" name="teslim_alan_ad_soyad" value={formData.teslim_alan_ad_soyad} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Teslim Eden Teknisyen" name="teslim_eden_teknisyen" value={formData.teslim_eden_teknisyen} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Ödeme Detayları" name="odeme_detaylari" value={formData.odeme_detaylari} onChange={handleChange} multiline rows={2} />
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>İptal</Button>
          <Button type="submit" variant="contained" size="large">{isEdit ? 'Güncelle' : 'Kaydet'}</Button>
        </Box>
      </form>
    </Box>
  );
};

export default IsEmriForm;
