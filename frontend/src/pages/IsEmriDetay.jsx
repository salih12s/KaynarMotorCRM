import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Divider
} from '@mui/material';
import { ArrowBack as BackIcon, Print as PrintIcon, Edit as EditIcon } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { isEmriService } from '../services/api';

const IsEmriDetay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try { const res = await isEmriService.getById(id); setData(res.data); } catch { navigate('/'); }
    };
    load();
  }, [id]);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  if (!data) return null;

  const parcalar = data.parcalar || [];
  const toplamFiyat = parcalar.reduce((t, p) => t + parseFloat(p.toplam_fiyat || 0), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const kar = toplamFiyat - toplamMaliyet;

  const durumLabel = (d) => {
    if (d === 'tamamlandi') return 'Tamamlandı';
    if (d === 'devam_ediyor') return 'Devam Ediyor';
    return 'Beklemede';
  };
  const durumRenk = (d) => {
    if (d === 'tamamlandi') return 'success';
    if (d === 'devam_ediyor') return 'info';
    return 'warning';
  };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

  const InfoRow = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
      <Typography variant="body2" color="text.secondary">{label}:</Typography>
      <Typography variant="body2" fontWeight="500">{value || '-'}</Typography>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/')}><BackIcon /></IconButton>
        <Typography variant="h5" fontWeight="bold" sx={{ flexGrow: 1 }}>İş Emri #{data.fis_no}</Typography>
        <Button startIcon={<EditIcon />} variant="outlined" onClick={() => navigate(`/is-emri/${id}/duzenle`)}>Düzenle</Button>
        <Button startIcon={<PrintIcon />} variant="contained" onClick={handlePrint}>Yazdır</Button>
      </Box>

      <Box ref={printRef} sx={{ p: 1 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Müşteri Bilgileri */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                👤 Müşteri Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Ad Soyad" value={data.musteri_ad_soyad} />
              <InfoRow label="Telefon" value={data.telefon} />
              <InfoRow label="Adres" value={data.adres} />
              <InfoRow label="KM" value={data.km} />
            </Paper>
          </Grid>

          {/* Araç Bilgileri */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🏍️ Araç Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Fiş No" value={`#${data.fis_no}`} />
              <InfoRow label="Marka" value={data.marka} />
              <InfoRow label="Model/Tip" value={data.model_tip} />
              <Box sx={{ mt: 1 }}>
                <Chip label={durumLabel(data.durum)} color={durumRenk(data.durum)} size="small" />
              </Box>
            </Paper>
          </Grid>

          {/* Tarih ve Teslim */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📅 Tarih ve Teslim
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Oluşturma" value={formatDate(data.created_at)} />
              <InfoRow label="Tahmini Teslim" value={formatDate(data.tahmini_teslim_tarihi)} />
              <InfoRow label="Teslim Tarihi" value={formatDate(data.teslim_tarihi)} />
              <InfoRow label="Teslim Alan" value={data.teslim_alan_ad_soyad} />
              <InfoRow label="Teslim Eden" value={data.teslim_eden_teknisyen} />
            </Paper>
          </Grid>
        </Grid>

        {/* Arıza ve Açıklama */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>🔧 Arıza / Şikayetler</Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography>{data.ariza_sikayetler || 'Belirtilmemiş'}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>📝 Açıklama</Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography>{data.aciklama || 'Belirtilmemiş'}</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Parçalar */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>📋 Parçalar ve İşçilik</Typography>
          <Divider sx={{ mb: 1 }} />
          {parcalar.length > 0 ? (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      {['Parça Kodu', 'Takılan Parça', 'Adet', 'Birim Fiyat', 'Maliyet', 'Toplam'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parcalar.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>{p.parca_kodu || '-'}</TableCell>
                        <TableCell>{p.takilan_parca}</TableCell>
                        <TableCell>{p.adet}</TableCell>
                        <TableCell>₺{parseFloat(p.birim_fiyat || 0).toLocaleString('tr-TR')}</TableCell>
                        <TableCell>₺{parseFloat(p.maliyet || 0).toLocaleString('tr-TR')}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>₺{parseFloat(p.toplam_fiyat || 0).toLocaleString('tr-TR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                <Paper sx={{ px: 2, py: 1, bgcolor: '#ffebee' }}>
                  <Typography variant="body2">Toplam: <strong>₺{toplamFiyat.toLocaleString('tr-TR')}</strong></Typography>
                </Paper>
                <Paper sx={{ px: 2, py: 1, bgcolor: '#ffebee' }}>
                  <Typography variant="body2">Maliyet: <strong>₺{toplamMaliyet.toLocaleString('tr-TR')}</strong></Typography>
                </Paper>
                <Paper sx={{ px: 2, py: 1, bgcolor: kar >= 0 ? '#e8f5e9' : '#ffebee' }}>
                  <Typography variant="body2" sx={{ color: kar >= 0 ? '#2e7d32' : '#c62828' }}>Kâr: <strong>₺{kar.toLocaleString('tr-TR')}</strong></Typography>
                </Paper>
              </Box>
            </>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={2}>Parça kaydı yok</Typography>
          )}
        </Paper>

        {/* Ödeme */}
        {data.odeme_detaylari && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>💳 Ödeme Detayları</Typography>
            <Divider sx={{ mb: 1 }} />
            <Typography>{data.odeme_detaylari}</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default IsEmriDetay;
