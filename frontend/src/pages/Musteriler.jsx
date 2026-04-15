import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  InputAdornment, Grid
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import { musteriService } from '../services/api';

const Musteriler = () => {
  const [musteriler, setMusteriler] = useState([]);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [formData, setFormData] = useState({ ad_soyad: '', telefon: '', adres: '' });
  const [error, setError] = useState('');

  const loadData = async () => {
    try { const res = await musteriService.getAll(); setMusteriler(res.data); } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const handleSearch = async () => {
    if (!search.trim()) return loadData();
    try { const res = await musteriService.search(search); setMusteriler(res.data); } catch {}
  };

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openDialog = (musteri = null) => {
    setFormData(musteri ? { ad_soyad: musteri.ad_soyad, telefon: musteri.telefon || '', adres: musteri.adres || '' } : { ad_soyad: '', telefon: '', adres: '' });
    setDialog({ open: true, data: musteri });
    setError('');
  };

  const handleSave = async () => {
    try {
      if (dialog.data) {
        await musteriService.update(dialog.data.id, formData);
      } else {
        await musteriService.create(formData);
      }
      setDialog({ open: false, data: null });
      loadData();
    } catch (err) { setError(err.response?.data?.message || 'Hata oluştu'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) return;
    try { await musteriService.delete(id); loadData(); } catch (err) { alert(err.response?.data?.message || 'Silme hatası'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight="bold">Müşteriler</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}>Yeni Müşteri</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField size="small" fullWidth placeholder="Müşteri ara (ad, telefon)" value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['Ad Soyad', 'Telefon', 'Adres', 'İşlemler'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {musteriler.map(m => (
              <TableRow key={m.id} hover>
                <TableCell>{m.ad_soyad}</TableCell>
                <TableCell>{m.telefon || '-'}</TableCell>
                <TableCell>{m.adres || '-'}</TableCell>
                <TableCell>
                  <IconButton size="small" color="info" onClick={() => openDialog(m)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {musteriler.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center">Kayıt bulunamadı</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.data ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Ad Soyad" value={formData.ad_soyad} onChange={e => setFormData({ ...formData, ad_soyad: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Telefon" value={formData.telefon} onChange={e => setFormData({ ...formData, telefon: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Adres" value={formData.adres} onChange={e => setFormData({ ...formData, adres: e.target.value })} multiline rows={2} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, data: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSave}>{dialog.data ? 'Güncelle' : 'Kaydet'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Musteriler;
