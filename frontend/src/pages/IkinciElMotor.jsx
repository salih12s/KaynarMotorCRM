import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Grid, Chip, InputAdornment, Divider, MenuItem, Checkbox, FormControlLabel, Autocomplete
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Visibility as ViewIcon, Close as CloseIcon, Print as PrintIcon } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { ikinciElMotorService } from '../services/api';

const IkinciElMotor = () => {
  const [motorlar, setMotorlar] = useState([]);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [detayModal, setDetayModal] = useState({ open: false, data: null });
  const printRef = useRef();
  const [formData, setFormData] = useState({
    plaka: '', marka: '', model: '', km: '', yil: '',
    alis_fiyati: '', satis_fiyati: '', noter_alis: '', noter_satis: '', masraflar: '',
    alici_adi: '', alici_tc: '', alici_telefon: '', alici_adres: '', aciklama: '',
    satici_adi: '', satici_tc: '',
    durum: 'stokta', odeme_sekli: 'nakit', stok_tipi: 'sahip',
    kalan_odeme: '', odeme_tamamlandi: true, fatura_kesildi: false, yevmiye_no: ''
  });
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [stokMotorlar, setStokMotorlar] = useState([]);
  const [selectedStokId, setSelectedStokId] = useState(null);

  const loadData = async () => {
    try {
      const [motorRes, statsRes] = await Promise.all([ikinciElMotorService.getAll(), ikinciElMotorService.getStats()]);
      const allMotors = motorRes.data;
      const satisMotorlar = allMotors.filter(m => m.durum === 'tamamlandi' && !m.eski_kayit);
      setMotorlar(satisMotorlar);
      setStats(statsRes.data);
      setStokMotorlar(allMotors.filter(m => m.durum === 'stokta' || m.durum === 'kapora'));
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const openDialog = (motor = null) => {
    setError('');
    setSelectedStokId(null);
    setFormData(motor ? {
      plaka: motor.plaka || '', marka: motor.marka || '', model: motor.model || '',
      km: motor.km || '', yil: motor.yil || '',
      alis_fiyati: motor.alis_fiyati || '', satis_fiyati: motor.satis_fiyati || '',
      noter_alis: motor.noter_alis || '', noter_satis: motor.noter_satis || '',
      masraflar: motor.masraflar || '',
      alici_adi: motor.alici_adi || '', alici_tc: motor.alici_tc || '',
      alici_telefon: motor.alici_telefon || '', alici_adres: motor.alici_adres || '',
      aciklama: motor.aciklama || '',
      satici_adi: motor.satici_adi || '', satici_tc: motor.satici_tc || '',
      durum: motor.durum || 'tamamlandi', odeme_sekli: motor.odeme_sekli || 'nakit',
      kalan_odeme: motor.kalan_odeme || '', odeme_tamamlandi: !parseFloat(motor.kalan_odeme || 0),
      fatura_kesildi: motor.fatura_kesildi || false,
      tarih: motor.tarih ? new Date(motor.tarih).toISOString().split('T')[0] : ''
    } : {
      plaka: '', marka: '', model: '', km: '', yil: '',
      alis_fiyati: '', satis_fiyati: '', noter_alis: '', noter_satis: '', masraflar: '',
      alici_adi: '', alici_tc: '', alici_telefon: '', alici_adres: '', aciklama: '',
      satici_adi: '', satici_tc: '',
      durum: 'tamamlandi', odeme_sekli: 'nakit',
      kalan_odeme: '', odeme_tamamlandi: true, fatura_kesildi: false,
      tarih: ''
    });
    setDialog({ open: true, data: motor });
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = { ...formData, kalan_odeme: formData.odeme_tamamlandi ? 0 : (formData.kalan_odeme || 0) };
      delete payload.odeme_tamamlandi;
      if (dialog.data) {
        await ikinciElMotorService.update(dialog.data.id, payload);
      } else if (selectedStokId) {
        // Stoktan seçilen motor - güncelle ve eski_kayit kaldır
        await ikinciElMotorService.update(selectedStokId, { ...payload, eski_kayit: false });
      } else {
        await ikinciElMotorService.create(payload);
      }
      setDialog({ open: false, data: null });
      setSelectedStokId(null);
      loadData();
    } catch (err) { setError(err.response?.data?.message || 'Hata oluştu'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try { await ikinciElMotorService.delete(id); loadData(); } catch (err) { alert(err.response?.data?.message || 'Hata'); }
  };

  const f = formData;
  const canliKar = (Number(f.satis_fiyati) || 0) - (Number(f.alis_fiyati) || 0) - (Number(f.masraflar) || 0);

  const [search, setSearch] = useState('');
  const filteredMotorlar = motorlar.filter(m => {
    return (m.plaka || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.marka || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.model || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.alici_adi || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.satici_adi || '').toLowerCase().includes(search.toLowerCase());
  });

  const statChips = [
    { label: `Toplam: ${motorlar.length}`, color: '#C62828', bg: '#ffebee' },
    { label: `Satış: ₺${parseFloat(stats.toplam_satis_tutari || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
    { label: `Kâr: ₺${parseFloat(stats.toplam_kar || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        {statChips.map((c, i) => (
          <Chip key={i} label={c.label} sx={{ bgcolor: c.bg, color: c.color, fontWeight: 'bold', fontSize: '0.8rem', borderLeft: `4px solid ${c.color}` }} />
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => openDialog()} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>Motor Satış</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField size="small" fullWidth placeholder="Plaka, marka, model veya satıcı adı ile ara..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#C62828' }}>
              {['Plaka', 'Marka', 'Model', 'Yıl', 'KM', 'Alım (₺)', 'Satıcı', 'TC Kimlik', 'Tarih', 'Alış Bedeli (₺)', 'İşlemler'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMotorlar.map(m => {
              const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
              return (
                <TableRow key={m.id} hover>
                  <TableCell><strong>{m.plaka}</strong></TableCell>
                  <TableCell>{m.marka || '-'}</TableCell>
                  <TableCell>{m.model || '-'}</TableCell>
                  <TableCell>{m.yil || '-'}</TableCell>
                  <TableCell>{m.km ? Number(m.km).toLocaleString('tr-TR') : '-'}</TableCell>
                  <TableCell>{parseFloat(m.alis_fiyati || 0).toLocaleString('tr-TR')}</TableCell>
                  <TableCell>{m.satici_adi || '-'}</TableCell>
                  <TableCell>{m.satici_tc || '-'}</TableCell>
                  <TableCell>{formatDate(m.tarih)}</TableCell>
                  <TableCell>{parseFloat(m.noter_alis || 0).toLocaleString('tr-TR')}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={async () => { try { const res = await ikinciElMotorService.getById(m.id); setDetayModal({ open: true, data: res.data }); } catch {} }}><ViewIcon /></IconButton>
                    <IconButton size="small" color="info" onClick={() => openDialog(m)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredMotorlar.length === 0 && <TableRow><TableCell colSpan={11} align="center">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="md" fullWidth>
        <DialogTitle>{dialog.data ? 'Motor Düzenle' : 'Yeni Motor Satış'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>Motor Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                freeSolo
                options={stokMotorlar.map(m => m.plaka)}
                value={f.plaka}
                onInputChange={(e, val) => setFormData({ ...f, plaka: (val || '').toUpperCase() })}
                onChange={(e, val) => {
                  if (val) {
                    const motor = stokMotorlar.find(m => m.plaka === val);
                    if (motor) {
                      setSelectedStokId(motor.id);
                      setFormData({
                        ...f,
                        plaka: motor.plaka, marka: motor.marka || '', model: motor.model || '',
                        km: motor.km || '', yil: motor.yil || '',
                        alis_fiyati: motor.alis_fiyati || '', noter_alis: motor.noter_alis || '',
                        satici_adi: motor.satici_adi || '', satici_tc: motor.satici_tc || '',
                        durum: 'tamamlandi'
                      });
                    } else {
                      setSelectedStokId(null);
                    }
                  }
                }}
                renderInput={(params) => <TextField {...params} fullWidth label="Plaka" required />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Marka" value={f.marka} onChange={e => setFormData({ ...f, marka: e.target.value })} required /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Model" value={f.model} onChange={e => setFormData({ ...f, model: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Yıl" type="number" value={f.yil} onChange={e => setFormData({ ...f, yil: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="KM" type="number" value={f.km} onChange={e => setFormData({ ...f, km: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField select fullWidth label="Durum" value={f.durum} onChange={e => setFormData({ ...f, durum: e.target.value })}
                sx={{ '& .MuiInputBase-root': { bgcolor: f.durum === 'tamamlandi' ? '#e8f5e9' : f.durum === 'kapora' ? '#fff3e0' : f.durum === 'devir_bekliyor' ? '#f3e5f5' : f.durum === 'perte' ? '#ffebee' : 'inherit' } }}>
                <MenuItem value="stokta">Stokta</MenuItem>
                <MenuItem value="kapora">Kapora</MenuItem>
                <MenuItem value="devir_bekliyor">Devir Bekliyor</MenuItem>
                <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
                <MenuItem value="perte">Perte</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Ödeme Şekli" value={f.odeme_sekli} onChange={e => setFormData({ ...f, odeme_sekli: e.target.value })}>
                <MenuItem value="nakit">Nakit</MenuItem>
                <MenuItem value="kredi_karti">Kredi Kartı</MenuItem>
                <MenuItem value="havale">Havale/EFT</MenuItem>
                <MenuItem value="taksit">Taksit</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Tarih" type="date" value={f.tarih} onChange={e => setFormData({ ...f, tarih: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel control={<Checkbox checked={f.fatura_kesildi} onChange={e => setFormData({ ...f, fatura_kesildi: e.target.checked })} />} label="Fatura Kesildi" />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Fiyat Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Alış Fiyatı (₺)" type="number" value={f.alis_fiyati} onChange={e => setFormData({ ...f, alis_fiyati: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Satış Fiyatı (₺)" type="number" value={f.satis_fiyati} onChange={e => setFormData({ ...f, satis_fiyati: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Masraflar (₺)" type="number" value={f.masraflar} onChange={e => setFormData({ ...f, masraflar: e.target.value })} helperText="Tamir, bakım, sigorta vb." /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Noter Alış (₺)" type="number" value={f.noter_alis} onChange={e => setFormData({ ...f, noter_alis: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Noter Satış (₺)" type="number" value={f.noter_satis} onChange={e => setFormData({ ...f, noter_satis: e.target.value })} /></Grid>
          </Grid>
          <Paper sx={{ p: 2, mt: 2, bgcolor: canliKar >= 0 ? '#e8f5e9' : '#ffebee', textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: canliKar >= 0 ? 'green' : 'red' }}>
              Net Kâr: <strong>{canliKar.toLocaleString('tr-TR')} ₺</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">Kâr = Satış - (Alış + Masraflar)</Typography>
          </Paper>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Satıcı Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Satıcı Ad Soyad" value={f.satici_adi} onChange={e => setFormData({ ...f, satici_adi: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Satıcı TC No" value={f.satici_tc} onChange={e => setFormData({ ...f, satici_tc: e.target.value })} /></Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Alıcı Bilgileri</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Ad Soyad" value={f.alici_adi} onChange={e => setFormData({ ...f, alici_adi: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="TC No" value={f.alici_tc} onChange={e => setFormData({ ...f, alici_tc: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Telefon" value={f.alici_telefon} onChange={e => setFormData({ ...f, alici_telefon: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Adres" value={f.alici_adres} onChange={e => setFormData({ ...f, alici_adres: e.target.value })} /></Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Kalan Ödeme</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={<Checkbox checked={f.odeme_tamamlandi} onChange={e => setFormData({ ...f, odeme_tamamlandi: e.target.checked, kalan_odeme: e.target.checked ? '' : f.kalan_odeme })} />}
                label="Ödeme Tamamlandı"
              />
            </Grid>
            {!f.odeme_tamamlandi && (
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="Kalan Ödeme (₺)" type="number" value={f.kalan_odeme} onChange={e => setFormData({ ...f, kalan_odeme: e.target.value })} />
              </Grid>
            )}
          </Grid>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Açıklama" value={f.aciklama} onChange={e => setFormData({ ...f, aciklama: e.target.value })} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, data: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSave}>{dialog.data ? 'Güncelle' : 'Kaydet'}</Button>
        </DialogActions>
      </Dialog>

      {/* Motor Detay Modal */}
      <MotorDetayModal open={detayModal.open} data={detayModal.data} onClose={() => setDetayModal({ open: false, data: null })} printRef={printRef} />
    </Box>
  );
};

const MotorDetayModal = ({ open, data, onClose, printRef }) => {
  const handlePrint = useReactToPrint({ contentRef: printRef });
  if (!data) return null;

  const formatTL = (v) => parseFloat(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 });
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
  const alis = parseFloat(data.alis_fiyati || 0);
  const satis = parseFloat(data.satis_fiyati || 0);
  const noterAlis = parseFloat(data.noter_alis || 0);
  const noterSatis = parseFloat(data.noter_satis || 0);
  const masraflar = parseFloat(data.masraflar || 0);
  const toplamMaliyet = alis + masraflar;
  const kar = parseFloat(data.kar || 0);

  const InfoRow = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
      <Typography variant="body2" color="text.secondary">{label}:</Typography>
      <Typography variant="body2" fontWeight="500">{value || '-'}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>Motor Detay</Typography>
        <Button startIcon={<PrintIcon />} variant="contained" size="small" onClick={handlePrint} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' }, mr: 1 }}>Yazdır</Button>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box ref={printRef} sx={{ p: 1 }}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>🏍️ Motor Bilgileri</Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Plaka" value={data.plaka} />
              <InfoRow label="Marka" value={data.marka} />
              <InfoRow label="Model" value={data.model} />
              <InfoRow label="Yıl" value={data.yil} />
              <InfoRow label="KM" value={data.km ? Number(data.km).toLocaleString('tr-TR') : null} />
              <InfoRow label="Tarih" value={formatDate(data.tarih)} />
              <InfoRow label="Durum" value={data.durum === 'stokta' ? 'Stokta' : data.durum === 'kapora' ? 'Kapora' : data.durum === 'devir_bekliyor' ? 'Devir Bekliyor' : data.durum === 'tamamlandi' ? 'Tamamlandı' : data.durum === 'perte' ? 'Perte' : data.durum} />
              <InfoRow label="Stok Tipi" value={data.stok_tipi === 'konsinye' ? 'Konsinye' : 'Sahip'} />
              <InfoRow label="Ödeme Şekli" value={data.odeme_sekli || 'Nakit'} />
              <InfoRow label="Fatura" value={data.fatura_kesildi ? 'Kesildi ✓' : 'Kesilmedi'} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>🏪 Satıcı (Alım) Bilgileri</Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="İsim Soyisim" value={data.satici_adi} />
              <InfoRow label="TC Kimlik" value={data.satici_tc} />
              <InfoRow label="Tarih" value={formatDate(data.tarih)} />
              <InfoRow label="Alış Bedeli" value={noterAlis ? `₺${formatTL(noterAlis)}` : null} />
            </Grid>
          </Grid>

          {(data.alici_adi || data.alici_tc) && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>👤 Alıcı (Satım) Bilgileri</Typography>
              <Divider sx={{ mb: 1 }} />
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 3 }}><InfoRow label="İsim Soyisim" value={data.alici_adi} /></Grid>
                <Grid size={{ xs: 12, md: 3 }}><InfoRow label="TC Kimlik" value={data.alici_tc} /></Grid>
                <Grid size={{ xs: 12, md: 3 }}><InfoRow label="Telefon" value={data.alici_telefon} /></Grid>
                <Grid size={{ xs: 12, md: 3 }}><InfoRow label="Kalan Ödeme" value={parseFloat(data.kalan_odeme || 0) > 0 ? `₺${parseFloat(data.kalan_odeme).toLocaleString('tr-TR')}` : 'Tamamlandı ✓'} /></Grid>
              </Grid>
            </Box>
          )}

          <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>💰 Finansal Detaylar</Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                <Typography variant="caption" color="text.secondary">Alış</Typography>
                <Typography fontWeight="bold" sx={{ color: '#C62828' }}>₺{formatTL(alis)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                <Typography variant="caption" color="text.secondary">Satış</Typography>
                <Typography fontWeight="bold" sx={{ color: '#C62828' }}>₺{formatTL(satis)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fce4ec', borderLeft: '4px solid #c62828' }}>
                <Typography variant="caption" color="text.secondary">Noter Alış</Typography>
                <Typography fontWeight="bold" sx={{ color: '#c62828' }}>₺{formatTL(noterAlis)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fce4ec', borderLeft: '4px solid #c62828' }}>
                <Typography variant="caption" color="text.secondary">Noter Satış</Typography>
                <Typography fontWeight="bold" sx={{ color: '#c62828' }}>₺{formatTL(noterSatis)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                <Typography variant="caption" color="text.secondary">Masraflar</Typography>
                <Typography fontWeight="bold" sx={{ color: '#C62828' }}>₺{formatTL(masraflar)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                <Typography variant="caption" color="text.secondary">Toplam Maliyet</Typography>
                <Typography fontWeight="bold" sx={{ color: '#C62828' }}>₺{formatTL(toplamMaliyet)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: kar >= 0 ? '#e8f5e9' : '#ffebee', borderLeft: `4px solid ${kar >= 0 ? '#2e7d32' : '#C62828'}` }}>
                <Typography variant="caption" color="text.secondary">NET KÂR</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: kar >= 0 ? '#2e7d32' : '#C62828' }}>₺{formatTL(kar)}</Typography>
              </Paper>
            </Grid>
          </Grid>

          {data.aciklama && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>📝 Açıklama</Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography>{data.aciklama}</Typography>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default IkinciElMotor;
