import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Grid, Chip, InputAdornment
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Upload as UploadIcon, Search as SearchIcon } from '@mui/icons-material';
import { aksesuarStokService } from '../services/api';

const AksesuarStok = () => {
  const [stoklar, setStoklar] = useState([]);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [importDialog, setImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [formData, setFormData] = useState({ stok_kodu: '', stok_adi: '', marka: '', alis_fiyati: '', satis_fiyati: '', giren_miktar: '', platform: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try { const res = await aksesuarStokService.getAll(); setStoklar(res.data); } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const handleSearch = async () => {
    if (!search.trim()) return loadData();
    try { const res = await aksesuarStokService.search(search); setStoklar(res.data); } catch {}
  };

  useEffect(() => { const t = setTimeout(handleSearch, 300); return () => clearTimeout(t); }, [search]);

  const openDialog = async (stok = null) => {
    setError('');
    if (stok) {
      setFormData({
        stok_kodu: stok.stok_kodu || '', stok_adi: stok.stok_adi || '', marka: stok.marka || '',
        alis_fiyati: stok.alis_fiyati || '', satis_fiyati: stok.satis_fiyati || '',
        giren_miktar: stok.giren_miktar || 0, platform: stok.platform || ''
      });
    } else {
      let nextKodu = '';
      try {
        const res = await aksesuarStokService.getNextStokKodu();
        nextKodu = res.data.nextStokKodu;
      } catch {}
      setFormData({ stok_kodu: nextKodu, stok_adi: '', marka: '', alis_fiyati: '', satis_fiyati: '', giren_miktar: 0, platform: '' });
    }
    setDialog({ open: true, data: stok });
  };

  const handleSave = async () => {
    setError('');
    try {
      if (dialog.data) {
        await aksesuarStokService.update(dialog.data.id, formData);
      } else {
        await aksesuarStokService.create(formData);
      }
      setDialog({ open: false, data: null });
      loadData();
    } catch (err) { setError(err.response?.data?.message || 'Hata'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu stok kaydını silmek istediğinizden emin misiniz?')) return;
    try { await aksesuarStokService.delete(id); loadData(); } catch (err) { alert(err.response?.data?.message || 'Hata'); }
  };

  const handleImport = async () => {
    setError('');
    try {
      const lines = importText.trim().split('\n').filter(l => l.trim());
      const items = lines.map(line => {
        const parts = line.split('\t').map(p => p.trim());
        return { stok_kodu: parts[0] || '', stok_adi: parts[1] || '', alis_fiyati: parts[2] || 0, satis_fiyati: parts[3] || 0, giren_miktar: parts[4] || 0 };
      });
      await aksesuarStokService.bulkImport(items);
      setImportDialog(false);
      setImportText('');
      loadData();
    } catch (err) { setError(err.response?.data?.message || 'İçe aktarma hatası'); }
  };

  const totalUrun = stoklar.length;
  const envanter = stoklar.reduce((acc, s) => acc + (parseFloat(s.alis_fiyati || 0) * parseInt(s.mevcut || 0)), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        <Chip label={`Toplam: ${totalUrun} ürün`} sx={{ bgcolor: '#ffebee', color: '#C62828', fontWeight: 'bold', fontSize: '0.8rem', borderLeft: '4px solid #C62828' }} />
        <Chip label={`Envanter: ₺${envanter.toLocaleString('tr-TR')}`} sx={{ bgcolor: '#ffebee', color: '#C62828', fontWeight: 'bold', fontSize: '0.8rem', borderLeft: '4px solid #C62828' }} />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setImportDialog(true)}>İçe Aktar</Button>
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => openDialog()}>Yeni Stok</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField size="small" fullWidth placeholder="Stok ara (kod, ad)" value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['Stok Kodu', 'Stok Adı', 'Marka', 'Platform', 'Alış (₺)', 'Satış (₺)', 'Giren', 'Mevcut', 'İşlemler'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {stoklar.map(s => (
              <TableRow key={s.id} hover sx={{ bgcolor: (s.mevcut || 0) <= 0 ? '#ffebee' : 'inherit' }}>
                <TableCell>{s.stok_kodu || '-'}</TableCell>
                <TableCell>{s.stok_adi}</TableCell>
                <TableCell>{s.marka || '-'}</TableCell>
                <TableCell>{s.platform || '-'}</TableCell>
                <TableCell>{parseFloat(s.alis_fiyati || 0).toLocaleString('tr-TR')}</TableCell>
                <TableCell>{parseFloat(s.satis_fiyati || 0).toLocaleString('tr-TR')}</TableCell>
                <TableCell>{s.giren_miktar || 0}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: (s.mevcut || 0) <= 0 ? 'red' : 'green' }}>{s.mevcut || 0}</TableCell>
                <TableCell>
                  <IconButton size="small" color="info" onClick={() => openDialog(s)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {stoklar.length === 0 && <TableRow><TableCell colSpan={9} align="center">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Stok Ekle/Düzenle Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.data ? 'Stok Düzenle' : 'Yeni Stok'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth label="Stok Kodu" value={formData.stok_kodu} onChange={e => setFormData({ ...formData, stok_kodu: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth label="Stok Adı" value={formData.stok_adi} onChange={e => setFormData({ ...formData, stok_adi: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth label="Marka" value={formData.marka} onChange={e => setFormData({ ...formData, marka: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Alış Fiyatı" type="number" value={formData.alis_fiyati} onChange={e => setFormData({ ...formData, alis_fiyati: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Satış Fiyatı" type="number" value={formData.satis_fiyati} onChange={e => setFormData({ ...formData, satis_fiyati: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Giren Miktar" type="number" value={formData.giren_miktar} onChange={e => setFormData({ ...formData, giren_miktar: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Platform" value={formData.platform} onChange={e => setFormData({ ...formData, platform: e.target.value })} placeholder="Örn: Trendyol, Hepsiburada" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, data: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSave}>{dialog.data ? 'Güncelle' : 'Kaydet'}</Button>
        </DialogActions>
      </Dialog>

      {/* Toplu İçe Aktarma */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Toplu Stok İçe Aktar</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Her satıra bir ürün girin (Tab ile ayırın): Stok Kodu, Stok Adı, Alış Fiyatı, Satış Fiyatı, Miktar</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField fullWidth multiline rows={10} value={importText} onChange={e => setImportText(e.target.value)}
            placeholder="AKS001	Ayna	Aksesuar	50	100	20" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>İptal</Button>
          <Button variant="contained" onClick={handleImport}>İçe Aktar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AksesuarStok;
