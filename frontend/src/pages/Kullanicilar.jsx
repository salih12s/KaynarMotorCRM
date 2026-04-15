import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, IconButton, Switch, FormControlLabel, Alert, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, useMediaQuery
} from '@mui/material';
import { Delete as DeleteIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { authService } from '../services/api';

const Kullanicilar = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });

  const loadUsers = async () => {
    try {
      const res = await authService.getUsers();
      setUsers(res.data);
    } catch { setError('Kullanıcılar yüklenemedi'); }
  };

  useEffect(() => { loadUsers(); }, []);

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

  const handleAksesuarYetkisi = async (id, value) => {
    try { await authService.setAksesuarYetkisi(id, value); loadUsers(); } catch { setError('Yetki güncelleme hatası'); }
  };

  const handleMotorYetkisi = async (id, value) => {
    try { await authService.setMotorSatisYetkisi(id, value); loadUsers(); } catch { setError('Yetki güncelleme hatası'); }
  };

  const durumRenk = (durum) => {
    if (durum === 'onaylandi') return 'success';
    if (durum === 'reddedildi') return 'error';
    return 'warning';
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>Kullanıcı Yönetimi</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

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
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5, alignItems: 'center' }}>
                <Typography variant="body2">Aksesuar: <Switch checked={user.aksesuar_yetkisi || false} onChange={(e) => handleAksesuarYetkisi(user.id, e.target.checked)} disabled={user.rol === 'admin'} size="small" /></Typography>
                <Typography variant="body2">Motor: <Switch checked={user.motor_satis_yetkisi || false} onChange={(e) => handleMotorYetkisi(user.id, e.target.checked)} disabled={user.rol === 'admin'} size="small" /></Typography>
              </Box>
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
              {['Ad Soyad', 'Kullanıcı Adı', 'Şifre', 'Rol', 'Durum', 'Aksesuar Yetkisi', 'Motor Yetkisi', 'İşlemler'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
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
                  <Switch checked={user.aksesuar_yetkisi || false}
                    onChange={(e) => handleAksesuarYetkisi(user.id, e.target.checked)}
                    disabled={user.rol === 'admin'} size="small" />
                </TableCell>
                <TableCell>
                  <Switch checked={user.motor_satis_yetkisi || false}
                    onChange={(e) => handleMotorYetkisi(user.id, e.target.checked)}
                    disabled={user.rol === 'admin'} size="small" />
                </TableCell>
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
    </Box>
  );
};

export default Kullanicilar;
