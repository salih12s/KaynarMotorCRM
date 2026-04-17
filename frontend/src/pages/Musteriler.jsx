import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  InputAdornment, Grid, Chip, Divider, useTheme, useMediaQuery
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Visibility as ViewIcon, Close as CloseIcon } from '@mui/icons-material';
import { musteriService } from '../services/api';

const Musteriler = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [musteriler, setMusteriler] = useState([]);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [formData, setFormData] = useState({ ad_soyad: '', telefon: '', adres: '' });
  const [error, setError] = useState('');
  const [detayDialog, setDetayDialog] = useState({ open: false, data: null });

  const openDetay = async (musteri) => {
    try {
      const res = await musteriService.getById(musteri.id);
      setDetayDialog({ open: true, data: res.data });
    } catch {}
  };

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

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {musteriler.length === 0 && <Alert severity="info">Kayıt bulunamadı</Alert>}
          {musteriler.map(m => (
            <Paper key={m.id} sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" fontWeight="bold">{m.ad_soyad}</Typography>
                <Box>
                  <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); openDetay(m); }}><ViewIcon /></IconButton>
                  <IconButton size="small" color="info" onClick={() => openDialog(m)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}><DeleteIcon /></IconButton>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">{m.telefon || '-'}</Typography>
              {m.adres && <Typography variant="body2" color="text.secondary">{m.adres}</Typography>}
            </Paper>
          ))}
        </Box>
      ) : (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
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
                  <IconButton size="small" color="primary" onClick={() => openDetay(m)}><ViewIcon /></IconButton>
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
      )}

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="sm" fullWidth fullScreen={isMobile}>
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

      {/* Müşteri Detay Dialog */}
      <Dialog open={detayDialog.open} onClose={() => setDetayDialog({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        {detayDialog.data && (() => {
          const d = detayDialog.data;
          const formatDate = (v) => v ? new Date(v).toLocaleDateString('tr-TR') : '-';
          const formatTL = (v) => parseFloat(v || 0).toLocaleString('tr-TR');
          return (
            <>
              <DialogTitle sx={{ bgcolor: '#1565C0', color: 'white', py: 1.5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>👤 {d.ad_soyad}</Typography>
                <IconButton onClick={() => setDetayDialog({ open: false, data: null })} sx={{ color: 'white' }}><CloseIcon /></IconButton>
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 1.5, bgcolor: '#e3f2fd', borderLeft: '4px solid #1565C0' }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="#1565C0">İletişim</Typography>
                      <Typography variant="body2"><strong>Telefon:</strong> {d.telefon || '-'}</Typography>
                      <Typography variant="body2"><strong>Adres:</strong> {d.adres || '-'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`Motor: ${(d.motorlar || []).length}`} sx={{ bgcolor: '#ffebee', color: '#C62828', fontWeight: 'bold' }} />
                      <Chip label={`Aksesuar: ${(d.aksesuarlar || []).length}`} sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold' }} />
                      <Chip label={`Servis: ${(d.isEmirleri || []).length}`} sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 'bold' }} />
                    </Box>
                  </Grid>
                </Grid>

                {/* Motor İşlemleri */}
                {(d.motorlar || []).length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="#C62828" gutterBottom>🏍️ Motor İşlemleri</Typography>
                    <Divider sx={{ mb: 1 }} />
                    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#ffebee' }}>
                            {['Plaka', 'Marka/Model', 'Rol', 'Fiyat', 'Durum', 'Tarih'].map(h => (
                              <TableCell key={h} sx={{ fontWeight: 'bold', color: '#C62828' }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {d.motorlar.map(m => {
                            const isSatici = m.satici_adi && m.satici_adi.toLowerCase() === d.ad_soyad.toLowerCase();
                            const isAlici = m.alici_adi && m.alici_adi.toLowerCase() === d.ad_soyad.toLowerCase();
                            return (
                              <TableRow key={m.id} hover>
                                <TableCell><strong>{m.plaka}</strong></TableCell>
                                <TableCell>{m.marka} {m.model} {m.yil ? `(${m.yil})` : ''}</TableCell>
                                <TableCell>
                                  {isSatici && <Chip label="Satıcı" size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', mr: 0.5 }} />}
                                  {isAlici && <Chip label="Alıcı" size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }} />}
                                </TableCell>
                                <TableCell>
                                  {isSatici && `₺${formatTL(m.alis_fiyati)}`}
                                  {isAlici && `₺${formatTL(m.satis_fiyati)}`}
                                </TableCell>
                                <TableCell>{m.durum === 'tamamlandi' ? 'Tamamlandı' : m.durum === 'stokta' ? 'Stokta' : m.durum}</TableCell>
                                <TableCell>{formatDate(m.satis_tarihi || m.tarih)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Aksesuar İşlemleri */}
                {(d.aksesuarlar || []).length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="#2e7d32" gutterBottom>🛒 Aksesuar Satışları</Typography>
                    <Divider sx={{ mb: 1 }} />
                    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                            {['Toplam Satış', 'Kâr', 'Durum', 'Tarih'].map(h => (
                              <TableCell key={h} sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {d.aksesuarlar.map(a => (
                            <TableRow key={a.id} hover>
                              <TableCell>₺{formatTL(a.toplam_satis)}</TableCell>
                              <TableCell sx={{ color: parseFloat(a.kar || 0) >= 0 ? 'green' : 'red' }}>₺{formatTL(a.kar)}</TableCell>
                              <TableCell>{a.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'}</TableCell>
                              <TableCell>{formatDate(a.satis_tarihi)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* İş Emirleri */}
                {(d.isEmirleri || []).length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="#e65100" gutterBottom>🔧 Servis İşlemleri</Typography>
                    <Divider sx={{ mb: 1 }} />
                    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#fff3e0' }}>
                            {['Fiş No', 'Model', 'Tutar', 'Durum', 'Tarih'].map(h => (
                              <TableCell key={h} sx={{ fontWeight: 'bold', color: '#e65100' }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {d.isEmirleri.map(ie => (
                            <TableRow key={ie.id} hover>
                              <TableCell>#{ie.fis_no}</TableCell>
                              <TableCell>{ie.marka} {ie.model_tip}</TableCell>
                              <TableCell>₺{formatTL(ie.gercek_toplam_ucret)}</TableCell>
                              <TableCell>{ie.durum === 'tamamlandi' ? 'Tamamlandı' : ie.durum === 'beklemede' ? 'Beklemede' : ie.durum}</TableCell>
                              <TableCell>{formatDate(ie.created_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {(d.motorlar || []).length === 0 && (d.aksesuarlar || []).length === 0 && (d.isEmirleri || []).length === 0 && (
                  <Alert severity="info">Bu müşteriye ait işlem kaydı bulunamadı.</Alert>
                )}
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

export default Musteriler;
