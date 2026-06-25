import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, IconButton, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid, useTheme, useMediaQuery
} from '@mui/material';
import { Delete as DeleteIcon, Check as CheckIcon, Close as CloseIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { authService } from '../services/api';

const Kullanicilar = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ kullanici_adi: '', sifre: '', ad_soyad: '', rol: 'yatirimci' });

  const loadUsers = async () => {
    try {
      const res = await authService.getUsers();
      setUsers(res.data);
    } catch { setError('Kullanıcılar yüklenemedi'); }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async () => {
    setError('');
    if (!createForm.kullanici_adi || !createForm.sifre || !createForm.ad_soyad) {
      setError('Tüm alanlar zorunludur'); return;
    }
    try {
      await authService.createUser(createForm);
      setCreateDialog(false);
      setCreateForm({ kullanici_adi: '', sifre: '', ad_soyad: '', rol: 'yatirimci' });
      loadUsers();
    } catch (err) { setError(err.response?.data?.message || 'Oluşturma hatası'); }
  };

  const handleApprove = async (id) => {
    try { await authService.approveUser(id); loadUsers(); } catch { setError('Onaylama hatası'); }
  };

  const handleReject = async (id) => {
    try { await authService.rejectUser(id); loadUsers(); } catch { setError('Reddetme hatası'); }
  };

  const handleDelete = async () => {
    try {
      await authService.deleteUser(deleteDialog.user.id);
      setDeleteDialog({ open: false, user: null });
      loadUsers();
    } catch (err) { setError(err.response?.data?.message || 'Silme hatası'); }
  };

  const durumRenk = (durum) => {
    if (durum === 'onaylandi') return 'success';
    if (durum === 'reddedildi') return 'error';
    return 'warning';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" fontWeight="bold">Kullanıcı Yönetimi</Typography>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => { setError(''); setCreateDialog(true); }} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>
          Kullanıcı / Yatırımcı Ekle
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>Personel yetkilerini (Motor Satış, Servis, Aksesuar, vb.) <strong>Yetkilendirme</strong> sayfasından ayarlayabilirsiniz.</Alert>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {users.map(user => (
            <Paper key={user.id} sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">{user.ad_soyad}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Chip label={user.rol} size="small" color={user.rol === 'admin' ? 'primary' : 'default'} sx={{ height: 20, fontSize: '0.7rem' }} />
                  <Chip label={user.onay_durumu} size="small" color={durumRenk(user.onay_durumu)} sx={{ height: 20, fontSize: '0.7rem' }} />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">{user.kullanici_adi} • {user.plain_sifre || '***'}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                {user.onay_durumu === 'beklemede' && (
                  <>
                    <IconButton color="success" size="small" onClick={() => handleApprove(user.id)}><CheckIcon /></IconButton>
                    <IconButton color="error" size="small" onClick={() => handleReject(user.id)}><CloseIcon /></IconButton>
                  </>
                )}
                {user.rol !== 'admin' && (
                  <IconButton color="error" size="small" onClick={() => setDeleteDialog({ open: true, user })}><DeleteIcon /></IconButton>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['Ad Soyad', 'Kullanıcı Adı', 'Şifre', 'Rol', 'Durum', 'İşlemler'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', px: 1 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id} hover>
                <TableCell>{user.ad_soyad}</TableCell>
                <TableCell>{user.kullanici_adi}</TableCell>
                <TableCell>{user.plain_sifre || '***'}</TableCell>
                <TableCell><Chip label={user.rol} size="small" color={user.rol === 'admin' ? 'primary' : 'default'} /></TableCell>
                <TableCell><Chip label={user.onay_durumu} size="small" color={durumRenk(user.onay_durumu)} /></TableCell>
                <TableCell>
                  {user.onay_durumu === 'beklemede' && (
                    <>
                      <IconButton color="success" size="small" onClick={() => handleApprove(user.id)}><CheckIcon /></IconButton>
                      <IconButton color="error" size="small" onClick={() => handleReject(user.id)}><CloseIcon /></IconButton>
                    </>
                  )}
                  {user.rol !== 'admin' && (
                    <IconButton color="error" size="small" onClick={() => setDeleteDialog({ open: true, user })}><DeleteIcon /></IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })} fullScreen={isMobile}>
        <DialogTitle>Kullanıcı Sil</DialogTitle>
        <DialogContent>
          <Typography><strong>{deleteDialog.user?.ad_soyad}</strong> kullanıcısını silmek istediğinizden emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Sil</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Yeni Kullanıcı / Yatırımcı Ekle</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField select fullWidth label="Rol" value={createForm.rol} onChange={e => setCreateForm({ ...createForm, rol: e.target.value })}>
                <MenuItem value="yatirimci">Yatırımcı</MenuItem>
                <MenuItem value="personel">Personel</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Ad Soyad" value={createForm.ad_soyad} onChange={e => setCreateForm({ ...createForm, ad_soyad: e.target.value })} required /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Kullanıcı Adı" value={createForm.kullanici_adi} onChange={e => setCreateForm({ ...createForm, kullanici_adi: e.target.value })} required /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Şifre" value={createForm.sifre} onChange={e => setCreateForm({ ...createForm, sifre: e.target.value })} required /></Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            Yatırımcılar giriş yapınca sadece kendi motorlarını ve raporlarını görür. Personel yetkileri oluşturduktan sonra tabloda ve Yetkilendirme ekranında ayarlanabilir.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>İptal</Button>
          <Button variant="contained" onClick={handleCreate}>Oluştur</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Kullanicilar;
