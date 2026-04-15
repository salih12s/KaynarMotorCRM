import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Grid, Chip, InputAdornment, useTheme, useMediaQuery
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import { yedekParcaService } from '../services/api';

const YedekParcalar = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [parcalar, setParcalar] = useState([]);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [formData, setFormData] = useState({ urun_adi: '', alis_fiyati: '', satis_fiyati: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try { const res = await yedekParcaService.getAll(); setParcalar(res.data); } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const filtered = parcalar.filter(p =>
    (p.urun_adi || '').toLowerCase().includes(search.toLowerCase())
  );

  const openDialog = (parca = null) => {
    setError('');
    setFormData(parca ? {
      urun_adi: parca.urun_adi || '', alis_fiyati: parca.alis_fiyati || '', satis_fiyati: parca.satis_fiyati || ''
    } : { urun_adi: '', alis_fiyati: '', satis_fiyati: '' });
    setDialog({ open: true, data: parca });
  };

  const handleSave = async () => {
    setError('');
    try {
      if (dialog.data) {
        await yedekParcaService.update(dialog.data.id, formData);
      } else {
        await yedekParcaService.create(formData);
      }
      setDialog({ open: false, data: null });
      loadData();
    } catch (err) { setError(err.response?.data?.message || 'Hata'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try { await yedekParcaService.delete(id); loadData(); } catch (err) { alert(err.response?.data?.message || 'Hata'); }
  };

  const kar = (Number(formData.satis_fiyati) || 0) - (Number(formData.alis_fiyati) || 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        <Chip label={`Toplam: ${parcalar.length}`} sx={{ bgcolor: '#ffebee', color: '#C62828', fontWeight: 'bold', fontSize: '0.8rem', borderLeft: '4px solid #C62828' }} />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => openDialog()} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>Yeni Parça</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField size="small" fullWidth placeholder="Parça ara..." value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
      </Paper>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
          {filtered.map(p => {
            const pKar = parseFloat(p.satis_fiyati || 0) - parseFloat(p.alis_fiyati || 0);
            return (
              <Paper key={p.id} sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">{p.urun_adi}</Typography>
                  <Box>
                    <IconButton size="small" color="info" onClick={() => openDialog(p)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}><DeleteIcon /></IconButton>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2">Alış: <strong>{parseFloat(p.alis_fiyati || 0).toLocaleString('tr-TR')} ₺</strong></Typography>
                  <Typography variant="body2">Satış: <strong>{parseFloat(p.satis_fiyati || 0).toLocaleString('tr-TR')} ₺</strong></Typography>
                  <Typography variant="body2" sx={{ color: pKar >= 0 ? 'green' : 'red' }}>Kâr: <strong>{pKar.toLocaleString('tr-TR')} ₺</strong></Typography>
                </Box>
              </Paper>
            );
          })}
        </Box>
      ) : (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#C62828' }}>
              {['Ürün Adı', 'Alış Fiyatı (₺)', 'Satış Fiyatı (₺)', 'Kâr (₺)', 'İşlemler'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(p => {
              const pKar = parseFloat(p.satis_fiyati || 0) - parseFloat(p.alis_fiyati || 0);
              return (
                <TableRow key={p.id} hover>
                  <TableCell>{p.urun_adi}</TableCell>
                  <TableCell>{parseFloat(p.alis_fiyati || 0).toLocaleString('tr-TR')}</TableCell>
                  <TableCell>{parseFloat(p.satis_fiyati || 0).toLocaleString('tr-TR')}</TableCell>
                  <TableCell sx={{ color: pKar >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>{pKar.toLocaleString('tr-TR')}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="info" onClick={() => openDialog(p)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} align="center">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{dialog.data ? 'Parça Düzenle' : 'Yeni Yedek Parça'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Ürün Adı" value={formData.urun_adi} onChange={e => setFormData({ ...formData, urun_adi: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Alış Fiyatı (₺)" type="number" value={formData.alis_fiyati} onChange={e => setFormData({ ...formData, alis_fiyati: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Satış Fiyatı (₺)" type="number" value={formData.satis_fiyati} onChange={e => setFormData({ ...formData, satis_fiyati: e.target.value })} />
            </Grid>
          </Grid>
          <Paper sx={{ p: 1, mt: 2, textAlign: 'center', bgcolor: kar >= 0 ? '#e8f5e9' : '#ffebee' }}>
            <Typography sx={{ color: kar >= 0 ? 'green' : 'red' }}>Kâr: <strong>{kar.toLocaleString('tr-TR')} ₺</strong></Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, data: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSave}>{dialog.data ? 'Güncelle' : 'Kaydet'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default YedekParcalar;
