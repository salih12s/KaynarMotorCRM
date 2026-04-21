import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Chip, IconButton, Button, Divider, useMediaQuery, useTheme
} from '@mui/material';
import { ArrowBack as BackIcon, Print as PrintIcon, Edit as EditIcon } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { ikinciElMotorService } from '../services/api';

const MotorDetay = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try { const res = await ikinciElMotorService.getById(id); setData(res.data); } catch { navigate('/ikinci-el-motor'); }
    };
    load();
  }, [id]);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  if (!data) return null;

  const formatTL = (v) => parseFloat(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 });
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

  const alis = parseFloat(data.alis_fiyati || 0);
  const satis = parseFloat(data.satis_fiyati || 0);
  const noterAlis = parseFloat(data.noter_alis || 0);
  const noterSatis = parseFloat(data.noter_satis || 0);
  const masraflar = parseFloat(data.masraflar || 0);
  const toplamMaliyet = alis + noterAlis + masraflar;
  const eleGecen = satis - noterSatis;
  const kar = parseFloat(data.kar || 0);

  const durumLabel = (d) => {
    if (d === 'tamamlandi') return 'Tamamlandı';
    if (d === 'beklemede') return 'Beklemede';
    return d || '-';
  };
  const durumRenk = (d) => {
    if (d === 'tamamlandi') return 'success';
    return 'warning';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/ikinci-el-motor')}><BackIcon /></IconButton>
        <Typography variant="h5" fontWeight="bold" sx={{ flexGrow: 1 }}>Motor Satış Detay</Typography>
        <Button startIcon={<PrintIcon />} variant="contained" size={isMobile ? 'small' : 'medium'} onClick={handlePrint} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>Yazdır</Button>
      </Box>

      <Box ref={printRef} sx={{ p: 1 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">KAYNAR MOTOR - MOTOR SATIŞ</Typography>
            <Chip label={durumLabel(data.durum)} color={durumRenk(data.durum)} />
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>Motor Bilgileri</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Plaka:</Typography>
                  <Typography fontWeight="bold">{data.plaka || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Marka:</Typography>
                  <Typography>{data.marka || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Model:</Typography>
                  <Typography>{data.model || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">KM:</Typography>
                  <Typography>{data.km ? Number(data.km).toLocaleString('tr-TR') : '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Tarih:</Typography>
                  <Typography>{formatDate(data.tarih)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Ödeme Şekli:</Typography>
                  <Typography>{data.odeme_sekli || 'Nakit'}</Typography>
                </Box>
                {data.yevmiye_no && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Yevmiye No:</Typography>
                    <Typography fontWeight="bold">{data.yevmiye_no}</Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>Alıcı Bilgileri</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Ad Soyad:</Typography>
                  <Typography fontWeight="bold">{data.alici_adi || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">TC No:</Typography>
                  <Typography>{data.alici_tc || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Telefon:</Typography>
                  <Typography>{data.alici_telefon || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Adres:</Typography>
                  <Typography>{data.alici_adres || '-'}</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {data.komisyoncu_adi && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>Komisyoncu</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Ad Soyad:</Typography>
                  <Typography fontWeight="bold">{data.komisyoncu_adi}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Telefon:</Typography>
                  <Typography>{data.komisyoncu_telefon || '-'}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Tutar:</Typography>
                  <Typography fontWeight="bold">₺{parseFloat(data.komisyoncu_tutari || 0).toLocaleString('tr-TR')}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>Finansal Detaylar</Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                <Typography variant="body2" color="text.secondary">Alış Fiyatı</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#C62828' }}>₺{formatTL(alis)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                <Typography variant="body2" color="text.secondary">Satış Fiyatı</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#C62828' }}>₺{formatTL(satis)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fce4ec', borderLeft: '4px solid #c62828' }}>
                <Typography variant="body2" color="text.secondary">Noter Alış</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#c62828' }}>₺{formatTL(noterAlis)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fce4ec', borderLeft: '4px solid #c62828' }}>
                <Typography variant="body2" color="text.secondary">Noter Satış</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#c62828' }}>₺{formatTL(noterSatis)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                <Typography variant="body2" color="text.secondary">Masraflar (Tamir, Bakım vb.)</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#C62828' }}>₺{formatTL(masraflar)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                <Typography variant="body2" color="text.secondary">Toplam Maliyet</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#C62828' }}>₺{formatTL(toplamMaliyet)}</Typography>
                <Typography variant="caption" color="text.secondary">Alış + Noter Alış + Masraflar</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: kar >= 0 ? '#e8f5e9' : '#ffebee', borderLeft: `4px solid ${kar >= 0 ? '#2e7d32' : '#C62828'}` }}>
                <Typography variant="body2" color="text.secondary">NET KÂR</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color: kar >= 0 ? '#2e7d32' : '#C62828' }}>₺{formatTL(kar)}</Typography>
                <Typography variant="caption" color="text.secondary">Satış - (Alış + Noter Alış + Noter Satış + Masraflar)</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        {data.aciklama && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>Açıklama</Typography>
            <Typography>{data.aciklama}</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default MotorDetay;
