import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Paper, Chip, Divider, CircularProgress } from '@mui/material';
import { TwoWheeler as MotoIcon, Build as BuildIcon } from '@mui/icons-material';
import { servisGecmisiService } from '../services/api';

const RED = '#C62828';

// Motorun üzerindeki QR koddan açılan halka açık sayfa: /s/:token
// Müşteri yalnızca kendi plakasının servis geçmişini görür (işlemler + toplam tutar).
// Giriş gerektirmez; sistemin başka hiçbir bölümüne erişim yoktur.
const ServisGecmisi = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await servisGecmisiService.getByToken(token);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Servis geçmişi yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
  const durumLabel = (d) => d === 'tamamlandi' ? 'Tamamlandı' : d === 'devam_ediyor' ? 'Devam Ediyor' : 'Beklemede';
  const durumRenk = (d) => d === 'tamamlandi' ? 'success' : d === 'devam_ediyor' ? 'info' : 'warning';
  const fmtPlaka = (p) => String(p || '').replace(/^(\d{2})([A-Z]+)(\d+)$/, '$1 $2 $3');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ bgcolor: '#1a1a1a' }} elevation={3}>
        <Toolbar sx={{ gap: 1 }}>
          <span className="kmt-logo-wrap" style={{ width: 31, height: 34, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            <img className="kmt-logo" src="/KaynarMotor.png" alt="Kaynar Motor" width="31" height="34"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }} />
          </span>
          <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: 1, fontSize: { xs: 16, md: 20 } }}>
            KAYNAR <span style={{ color: RED }}>MOTOR</span>
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, maxWidth: 760, mx: 'auto', width: '100%' }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: RED }} /></Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary', borderRadius: 3 }}>
            <Typography>{error}</Typography>
          </Paper>
        ) : (
          <>
            <Paper sx={{ p: 2, mb: 2, borderRadius: 3, textAlign: 'center', bgcolor: '#fff' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <MotoIcon sx={{ color: RED, fontSize: 32 }} />
                <Typography variant="h4" fontWeight="bold" sx={{ letterSpacing: 2 }}>{fmtPlaka(data.plaka)}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Servis Geçmişi</Typography>
            </Paper>

            {data.servisler.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary', borderRadius: 3 }}>
                <Typography>Bu plakaya ait servis kaydı bulunamadı.</Typography>
              </Paper>
            ) : (
              data.servisler.map((s, i) => (
                <Paper key={i} sx={{ p: 2, mb: 2, borderRadius: 3, borderLeft: `4px solid ${RED}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildIcon sx={{ color: RED, fontSize: 20 }} />
                      <Typography fontWeight="bold">{formatDate(s.tarih)}</Typography>
                      {(s.marka || s.model_tip) && (
                        <Typography variant="body2" color="text.secondary">{[s.marka, s.model_tip].filter(Boolean).join(' ')}</Typography>
                      )}
                    </Box>
                    <Chip label={durumLabel(s.durum)} size="small" color={durumRenk(s.durum)} />
                  </Box>
                  {s.km ? (
                    <Typography variant="caption" color="text.secondary">KM: {Number(s.km).toLocaleString('tr-TR')}</Typography>
                  ) : null}
                  <Divider sx={{ my: 1 }} />
                  {s.islemler.length > 0 ? (
                    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                      {s.islemler.map((p, j) => (
                        <Typography component="li" variant="body2" key={j} sx={{ py: 0.25 }}>
                          {p.islem}{(p.adet || 1) > 1 ? ` (x${p.adet})` : ''}
                        </Typography>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">İşlem detayı girilmemiş.</Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Typography fontWeight="bold" sx={{ color: RED }}>
                      Toplam: ₺{parseFloat(s.toplam_tutar || 0).toLocaleString('tr-TR')}
                    </Typography>
                  </Box>
                </Paper>
              ))
            )}

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2, textAlign: 'center' }}>
              Sorularınız için bize ulaşın — Kaynar Motor Servis
            </Typography>
          </>
        )}
      </Box>

      <Box sx={{ bgcolor: '#1a1a1a', color: 'rgba(255,255,255,0.7)', py: 2, textAlign: 'center' }}>
        <Typography variant="body2">© {new Date().getFullYear()} Kaynar Motor</Typography>
      </Box>
    </Box>
  );
};

export default ServisGecmisi;
