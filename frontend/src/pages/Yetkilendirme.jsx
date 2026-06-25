import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Switch, Alert, Chip, Card, CardContent, Divider, FormControlLabel, useTheme, useMediaQuery
} from '@mui/material';
import { authService } from '../services/api';

// Motor Satış yetkisi ile birlikte verilen görüntüleme yetkileri
// (satış fiyatı, müşteri bilgisi ve satış geçmişi Motor Satış'ın içinde gelir — alış fiyatı ve kâr DAHİL DEĞİL)
const MOTOR_SATIS_KAPSAMI = ['satis_fiyati_gor', 'musteri_gor', 'satis_gecmisi_gor'];

// İşlem (modül) yetkileri — tüm yetkilendirme tek bir tabloda toplanır
const ISLEM_YETKILERI = [
  { key: 'motor_satis_yetkisi', label: 'Motor Satış' },
  { key: 'aksesuar_yetkisi', label: 'Aksesuar Satış' },
  { key: 'aksesuar_stok_yetkisi', label: 'Aksesuar Stok' },
  { key: 'yedek_parca_yetkisi', label: 'Yedek Parça' },
  { key: 'servis_yetkisi', label: 'Servis' },
  { key: 'eticaret_yetkisi', label: 'E-Ticaret' },
  { key: 'motor_vitrin_yetkisi', label: 'Motor Vitrini (Site)' },
  { key: 'aksesuar_vitrin_yetkisi', label: 'Aksesuar Vitrini (Site)' },
];

const TUM_YETKILER = ISLEM_YETKILERI;

const Yetkilendirme = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('md'));
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async () => {
    try {
      const res = await authService.getUsers();
      // Admin ve yatırımcı dışındaki (personel) kullanıcılar yetkilendirilir
      setUsers(res.data.filter(u => u.rol !== 'admin' && u.rol !== 'yatirimci'));
    } catch { setError('Kullanıcılar yüklenemedi'); }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleToggle = async (user, key, value) => {
    setError(''); setSuccess('');
    // Motor Satış yetkisi açılınca/kapanınca alış-satış fiyatı, kâr, müşteri ve satış geçmişi yetkileri de birlikte değişir
    const payload = key === 'motor_satis_yetkisi'
      ? { motor_satis_yetkisi: value, ...Object.fromEntries(MOTOR_SATIS_KAPSAMI.map(k => [k, value])) }
      : { [key]: value };
    const oncekiUser = user; // hata olursa geri almak için
    // Optimistik güncelleme
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...payload } : u));
    try {
      await authService.setYetkiler(user.id, payload);
      setSuccess(`${user.ad_soyad} yetkileri güncellendi`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Güncelleme hatası');
      // Geri al
      setUsers(prev => prev.map(u => u.id === user.id ? oncekiUser : u));
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={1}>Yetkilendirme</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Personelin hangi işlemleri yapabileceğini buradan ayarlayın. <strong>Motor Satış</strong> yetkisi; satış fiyatı, müşteri bilgisi ve satış geçmişi görüntüleme yetkilerini de kapsar (alış fiyatı ve kâr hariç).
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {users.length === 0 && (
        <Alert severity="info">Yetkilendirilecek personel bulunmuyor. Kullanıcı Yönetimi ekranından personel ekleyebilirsiniz.</Alert>
      )}

      {/* Mobil görünüm */}
      {isMobile ? (
        users.map(user => (
          <Card key={user.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography fontWeight="bold">{user.ad_soyad}</Typography>
                <Chip size="small" label={user.kullanici_adi} variant="outlined" />
              </Box>
              <Divider sx={{ mb: 1 }} />
              {ISLEM_YETKILERI.map(y => (
                <FormControlLabel key={y.key} sx={{ display: 'flex', justifyContent: 'space-between', ml: 0 }}
                  labelPlacement="start" label={y.label}
                  control={<Switch checked={!!user[y.key]} onChange={e => handleToggle(user, y.key, e.target.checked)} />} />
              ))}
            </CardContent>
          </Card>
        ))
      ) : (
        users.length > 0 && (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', position: 'sticky', left: 0, bgcolor: '#fafafa' }}>Personel</TableCell>
                  {TUM_YETKILER.map(y => (
                    <TableCell key={y.key} align="center" sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>{y.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: '#fff' }}>
                      <Typography fontWeight="bold" variant="body2">{user.ad_soyad}</Typography>
                      <Typography variant="caption" color="text.secondary">{user.kullanici_adi}</Typography>
                    </TableCell>
                    {TUM_YETKILER.map(y => (
                      <TableCell key={y.key} align="center">
                        <Switch size="small" checked={!!user[y.key]} onChange={e => handleToggle(user, y.key, e.target.checked)} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}
    </Box>
  );
};

export default Yetkilendirme;
