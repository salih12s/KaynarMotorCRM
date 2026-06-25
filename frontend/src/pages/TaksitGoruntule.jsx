import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Paper, Alert, useTheme, useMediaQuery } from '@mui/material';
import { hesaplaTaksit, fmtTL, TaksitTablo, ParaInput, paraToNumber } from './TaksitHesaplama';

const RED = '#C62828';

// Müşteriye gönderilen paylaşım linki: /taksit/:fiyat — sadece görüntüleme, giriş gerektirmez
const TaksitGoruntule = () => {
  const { fiyat } = useParams();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const nakit = parseFloat(fiyat) || 0;
  const [pesinat, setPesinat] = useState('');
  const pesinatNum = paraToNumber(pesinat);
  const kalan = nakit - pesinatNum;
  // Peşinat girildikçe taksit tablosu anlık güncellenir
  const sonuc = useMemo(() => hesaplaTaksit(nakit, pesinatNum), [nakit, pesinatNum]);

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
        <Typography variant="h5" fontWeight="bold" gutterBottom>Taksit Ödeme Seçenekleri</Typography>
        {nakit > 0 ? (
          <>
            <Paper sx={{ p: 2, mb: 2, borderRadius: 3, textAlign: 'center', bgcolor: '#fff' }}>
              {pesinatNum > 0 ? (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Nakit Fiyat <span style={{ textDecoration: 'line-through' }}>{fmtTL(nakit)}</span> − Peşinat {fmtTL(pesinatNum)}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: RED }}>{fmtTL(Math.max(kalan, 0))}</Typography>
                  <Typography variant="caption" color="text.secondary">Taksitler bu tutar üzerinden hesaplanmaktadır</Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">Nakit Fiyat</Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: RED }}>{fmtTL(nakit)}</Typography>
                </>
              )}
            </Paper>

            <Paper sx={{ p: 2, mb: 2, borderRadius: 3, bgcolor: '#fff' }}>
              <ParaInput label="Peşinat / Peşin Ödeme" value={pesinat}
                onChange={setPesinat}
                helperText={pesinatNum > 0 ? `Taksitlendirilecek kalan tutar: ${fmtTL(Math.max(kalan, 0))}` : 'İsteğe bağlı — peşinat girerseniz taksitler kalan tutar üzerinden hesaplanır'} />
            </Paper>

            {sonuc ? (
              <TaksitTablo sonuc={sonuc} isMobile={isMobile} />
            ) : (
              <Alert severity="warning">Peşinat tutarı nakit fiyata eşit veya daha büyük. Taksitlendirilecek tutar kalmadı.</Alert>
            )}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              * Tutarlar bilgilendirme amaçlıdır. Detaylı bilgi için bizimle iletişime geçin.
            </Typography>
          </>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography>Geçersiz fiyat bilgisi.</Typography>
          </Paper>
        )}
      </Box>

      <Box sx={{ bgcolor: '#1a1a1a', color: 'rgba(255,255,255,0.7)', py: 2, textAlign: 'center' }}>
        <Typography variant="body2">© {new Date().getFullYear()} Kaynar Motor</Typography>
      </Box>
    </Box>
  );
};

export default TaksitGoruntule;
