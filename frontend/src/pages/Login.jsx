import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, Tab, Tabs } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

const Login = () => {
  const { login } = useAuth();
  const [tab, setTab] = useState(0);
  const [formData, setFormData] = useState({ kullanici_adi: '', sifre: '', ad_soyad: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authService.login({ kullanici_adi: formData.kullanici_adi, sifre: formData.sifre });
      login(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş başarısız');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await authService.register(formData);
      setSuccess(res.data.message);
      setTab(0);
      setFormData({ ...formData, ad_soyad: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt başarısız');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1a1a1a' }}>
      <Paper elevation={6} sx={{ p: 4, width: 400, maxWidth: '95%' }}>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <img src="/KaynarMotor.png" alt="Kaynar Motor" style={{ width: 200, maxWidth: '80%' }} />
        </Box>
        <Typography variant="body2" textAlign="center" color="text.secondary" mb={3}>
          Servis Yönetim Sistemi
        </Typography>

        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); setSuccess(''); }} centered sx={{ mb: 3 }}>
          <Tab label="Giriş Yap" />
          <Tab label="Kayıt Ol" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {tab === 0 ? (
          <form onSubmit={handleLogin}>
            <TextField fullWidth label="Kullanıcı Adı" name="kullanici_adi" value={formData.kullanici_adi}
              onChange={handleChange} margin="normal" required autoFocus />
            <TextField fullWidth label="Şifre" name="sifre" type="password" value={formData.sifre}
              onChange={handleChange} margin="normal" required />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <TextField fullWidth label="Ad Soyad" name="ad_soyad" value={formData.ad_soyad}
              onChange={handleChange} margin="normal" required autoFocus />
            <TextField fullWidth label="Kullanıcı Adı" name="kullanici_adi" value={formData.kullanici_adi}
              onChange={handleChange} margin="normal" required />
            <TextField fullWidth label="Şifre" name="sifre" type="password" value={formData.sifre}
              onChange={handleChange} margin="normal" required />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default Login;
