import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AppBar, Box, Button, ButtonBase, CircularProgress, Collapse, Dialog, IconButton, Toolbar, Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrevIcon from '@mui/icons-material/ArrowBackIosNew';
import NextIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LoginIcon from '@mui/icons-material/Login';
import PhoneIcon from '@mui/icons-material/Phone';
import PlayIcon from '@mui/icons-material/PlayCircleOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { vitrinService } from '../services/api';
import { hesaplaTaksit } from './TaksitHesaplama';
import {
  VitrinTema, RENK, YAZI, ODAK, tlYaz, waLink, videoKaynak, enUzunTaksit,
  iletisimKisileri, KisiDugmeleri, IlanKarti, ilanIzgarasi
} from '../components/VitrinOrtak';

const bolumBasligi = { fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 24, md: 28 }, lineHeight: 1.1, mb: 1.5 };
const sahneDugmesi = { position: 'absolute', color: '#fff', bgcolor: 'rgba(0,0,0,.5)', '&:hover': { bgcolor: 'rgba(0,0,0,.75)' }, ...ODAK };

const StorefrontDetay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [detay, setDetay] = useState(null);
  const [iletisim, setIletisim] = useState(null);
  const [digerleri, setDigerleri] = useState([]);
  const [gorselIdx, setGorselIdx] = useState(0);
  const [yuklenenGorsel, setYuklenenGorsel] = useState(null);
  const [hataliGorsel, setHataliGorsel] = useState(null);
  const [buyukGorsel, setBuyukGorsel] = useState(false);
  const [taksitAcik, setTaksitAcik] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dokunmaX = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setDetay(null); setDigerleri([]);
    setGorselIdx(0); setTaksitAcik(false); setBuyukGorsel(false);
    window.scrollTo(0, 0);
    Promise.allSettled([vitrinService.getById(id), vitrinService.getIletisim()])
      .then(([detayRes, iletisimRes]) => {
        if (!active) return;
        if (detayRes.status !== 'fulfilled') throw new Error('İlan bulunamadı');
        const urun = detayRes.value.data;
        setDetay(urun);
        if (iletisimRes.status === 'fulfilled') {
          setIletisim(iletisimRes.value.data.find((r) => r.kategori === urun.kategori) || null);
        }
        // Aynı türden diğer ilanlar (önce aynı segmenttekiler)
        const params = { kategori: urun.kategori };
        if (urun.kategori === 'motor') params.durum = urun.motor_durumu;
        vitrinService.getAll(params)
          .then((res) => {
            if (!active) return;
            const diger = res.data.filter((u) => u.id !== urun.id);
            diger.sort((a, b) => Number(b.segment === urun.segment) - Number(a.segment === urun.segment));
            setDigerleri(diger.slice(0, urun.kategori === 'motor' ? 3 : 4));
          })
          .catch(() => { /* diğer ilanlar isteğe bağlı; sessiz geç */ });
      })
      .catch(() => active && setError('Bu ilan yayından kaldırılmış olabilir.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  // Sekme başlığında ilan adı görünsün
  useEffect(() => {
    if (!detay) return undefined;
    const onceki = document.title;
    document.title = `${detay.baslik} | Kaynar Motor`;
    return () => { document.title = onceki; };
  }, [detay]);

  const gorseller = useMemo(() => {
    if (detay?.gorsel_idler?.length) return detay.gorsel_idler;
    return detay?.kapak_gorsel_id ? [detay.kapak_gorsel_id] : [];
  }, [detay]);
  const aktifGorsel = gorseller[gorselIdx];
  const aktifGorselYuklendi = yuklenenGorsel === aktifGorsel;
  const aktifGorselHatali = hataliGorsel === aktifGorsel;
  const cokGorsel = gorseller.length > 1;
  const video = useMemo(() => videoKaynak(detay?.video_url), [detay]);

  const gorselDegistir = useCallback((yon) => {
    setGorselIdx((i) => (gorseller.length ? (i + yon + gorseller.length) % gorseller.length : 0));
  }, [gorseller.length]);

  // Sol/sağ ok tuşlarıyla görseller arasında gezinme
  useEffect(() => {
    if (!cokGorsel) return undefined;
    const tus = (e) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') gorselDegistir(-1);
      if (e.key === 'ArrowRight') gorselDegistir(1);
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [cokGorsel, gorselDegistir]);

  // Telefonda parmakla kaydırma
  const dokunmaBasla = (e) => { dokunmaX.current = e.touches[0].clientX; };
  const dokunmaBitir = (e) => {
    if (dokunmaX.current === null || !cokGorsel) return;
    const fark = e.changedTouches[0].clientX - dokunmaX.current;
    dokunmaX.current = null;
    if (Math.abs(fark) > 40) gorselDegistir(fark < 0 ? 1 : -1);
  };

  const motor = detay?.kategori === 'motor';
  const sifir = detay?.motor_durumu === 'sifir';
  const fiyat = Number(detay?.fiyat) || 0;
  const taksitler = useMemo(() => hesaplaTaksit(fiyat), [fiyat]);
  const uzunTaksit = enUzunTaksit(fiyat);
  const kisiler = iletisimKisileri(iletisim);
  const aranacakKisi = kisiler.find((k) => k.tel);

  const ozellikler = useMemo(() => (detay ? [
    detay.marka && { label: 'Marka', value: detay.marka },
    detay.model && { label: 'Model', value: detay.model },
    detay.yil && { label: 'Yıl', value: String(detay.yil) },
    motor && { label: 'Durum', value: sifir ? 'Sıfır' : 'İkinci el' },
    motor && !sifir && (detay.km !== null && detay.km !== undefined && detay.km !== '') && { label: 'Kilometre', value: `${Number(detay.km).toLocaleString('tr-TR')} km` },
    detay.motor_cc && { label: 'Motor hacmi', value: `${detay.motor_cc} cc` },
    detay.segment && { label: 'Tip', value: detay.segment },
    detay.hasar_kaydi && { label: 'Hasar kaydı', value: detay.hasar_kaydi },
    detay.ilan_no != null && { label: 'İlan no', value: `ILN-${String(detay.ilan_no).padStart(4, '0')}` },
  ].filter(Boolean) : []), [detay, motor, sifir]);

  const geriDon = () => {
    if (location.state?.storefront) navigate('/site', { state: location.state });
    else if (window.history.length > 1) navigate(-1);
    else navigate('/site');
  };

  const gorselOklari = (konum) => cokGorsel && (
    <>
      <IconButton aria-label="Önceki görsel" onClick={(e) => { e.stopPropagation(); gorselDegistir(-1); }} sx={{ ...sahneDugmesi, left: konum }}><PrevIcon /></IconButton>
      <IconButton aria-label="Sonraki görsel" onClick={(e) => { e.stopPropagation(); gorselDegistir(1); }} sx={{ ...sahneDugmesi, right: konum }}><NextIcon /></IconButton>
    </>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: RENK.zemin, color: RENK.murekkep, fontFamily: YAZI.govde, overflowX: 'hidden', pb: { xs: aranacakKisi ? 11 : 4, md: 6 } }}>
      <AppBar position="sticky" sx={{ bgcolor: RENK.asfalt, borderRadius: 0 }} elevation={0}>
        <Toolbar sx={{ px: { xs: 1.5, md: 3 }, gap: 1.5, minHeight: { xs: 56, md: 64 } }}>
          <Box onClick={() => navigate('/site')} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
            <img src="/KaynarMotor.png" alt="" width="32" height="36"
              style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <Typography fontWeight={700} sx={{ letterSpacing: 1, whiteSpace: 'nowrap', fontSize: { xs: 15, md: 20 } }}>
              KAYNAR <span style={{ color: RENK.kirmizi }}>MOTOR</span>
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" color="error" disableElevation startIcon={<LoginIcon />} onClick={() => navigate('/login')}>Servise Git</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 2.5 } }}>
        <Button startIcon={<ArrowBackIcon />} onClick={geriDon} color="inherit" sx={{ mb: { xs: 1, md: 1.5 }, ml: -1, fontWeight: 600 }}>
          İlanlara dön
        </Button>

        {loading ? (
          <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center' }} role="status" aria-label="İlan yükleniyor"><CircularProgress color="error" /></Box>
        ) : error ? (
          <Box sx={{ py: { xs: 5, md: 9 }, maxWidth: '46ch' }}>
            <Typography component="h1" sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: 32, lineHeight: 1.1 }}>İlan açılamadı</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>{error}</Typography>
            <Button variant="contained" color="error" disableElevation onClick={() => navigate('/site')} sx={{ mt: 2.5 }}>Diğer ilanlara bak</Button>
          </Box>
        ) : detay && (
          <>
            <Box sx={{
              display: 'grid', alignItems: 'start', gap: { xs: 2, md: 4 },
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 400px' },
            }}>
              {/* Her sütun kendi yüksekliğine göre akar; kısa iletişim kartı özellikleri aşağı itmez. */}
              <Box sx={{ display: { xs: 'contents', md: 'flex' }, flexDirection: 'column', gap: { md: 4 }, minWidth: 0 }}>
              {/* ---- Görseller ---- */}
              <Box sx={{ gridRow: { xs: 1, md: 'auto' }, minWidth: 0 }}>
                <Box onTouchStart={dokunmaBasla} onTouchEnd={dokunmaBitir}
                  sx={{
                    position: 'relative', bgcolor: RENK.asfalt, borderRadius: 3, overflow: 'hidden',
                    aspectRatio: { xs: '4 / 3', md: '3 / 2' }, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {aktifGorsel && !aktifGorselHatali ? (
                    <>
                      {!aktifGorselYuklendi && <CircularProgress size={34} sx={{ position: 'absolute', color: '#fff' }} />}
                      <ButtonBase onClick={() => setBuyukGorsel(true)} aria-label="Görseli büyüt"
                        sx={{ width: '100%', height: '100%', cursor: 'zoom-in', '&:focus-visible': { outline: `3px solid ${RENK.kirmiziAcik}`, outlineOffset: -3 } }}>
                        <img
                          key={aktifGorsel}
                          src={vitrinService.gorselUrl(aktifGorsel)}
                          alt={`${detay.baslik}, ${gorselIdx + 1}. görsel`}
                          onLoad={() => { setYuklenenGorsel(aktifGorsel); setHataliGorsel(null); }}
                          onError={() => setHataliGorsel(aktifGorsel)}
                          style={{
                            display: 'block', opacity: aktifGorselYuklendi ? 1 : 0, width: '100%', height: '100%',
                            objectFit: 'contain', transition: 'opacity .15s ease',
                          }}
                        />
                      </ButtonBase>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', color: 'rgba(255,255,255,.7)', px: 2 }}>
                      <Box component="img" src="/KaynarMotor.png" alt="" sx={{ width: 90, opacity: .45, filter: 'brightness(0) invert(1)' }} />
                      <Typography variant="body2" sx={{ mt: 1 }}>{aktifGorselHatali ? 'Görsel yüklenemedi' : 'Bu ilanın görseli yok'}</Typography>
                    </Box>
                  )}
                  {gorselOklari(10)}
                  {cokGorsel && (
                    <Box sx={{ position: 'absolute', right: 12, bottom: 12, px: 1, py: 0.5, borderRadius: 1, bgcolor: 'rgba(0,0,0,.65)', color: '#fff', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {gorselIdx + 1} / {gorseller.length}
                    </Box>
                  )}
                </Box>
                {cokGorsel && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.25, overflowX: 'auto', pb: 0.5 }}>
                    {gorseller.map((g, i) => (
                      <ButtonBase key={g} onClick={() => setGorselIdx(i)} aria-label={`${i + 1}. görsel`} aria-current={i === gorselIdx}
                        sx={{
                          flexShrink: 0, width: 92, aspectRatio: '4 / 3', borderRadius: 1.5, overflow: 'hidden', bgcolor: RENK.asfalt,
                          outline: i === gorselIdx ? `3px solid ${RENK.kirmiziAcik}` : 'none', outlineOffset: -3,
                          opacity: i === gorselIdx ? 1 : 0.7, '&:hover': { opacity: 1 }, ...ODAK,
                        }}>
                        <Box component="img" src={vitrinService.gorselUrl(g)} alt="" loading="lazy"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/KaynarMotor.png'; }}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </ButtonBase>
                    ))}
                  </Box>
                )}
              </Box>

              {detay.aciklama && (
                <Box component="section" sx={{ gridRow: { xs: 3, md: 'auto' }, minWidth: 0 }}>
                  <Typography component="h2" sx={bolumBasligi}>Açıklama</Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, maxWidth: '68ch', fontSize: 16 }}>{detay.aciklama}</Typography>
                </Box>
              )}
              </Box>

              <Box sx={{ display: { xs: 'contents', md: 'flex' }, flexDirection: 'column', gap: { md: 4 }, minWidth: 0 }}>
              {/* ---- Fiyat ve iletişim paneli ---- */}
              <Box sx={{
                gridRow: { xs: 2, md: 'auto' },
                bgcolor: RENK.yuzey, border: `1px solid ${RENK.cizgi}`, borderRadius: 3, p: { xs: 2, md: 3 },
              }}>
                {motor && (
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
                    {sifir ? 'Sıfır motor' : 'İkinci el motor'}
                  </Typography>
                )}
                <Typography component="h1" sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 28, md: 34 }, lineHeight: 1.08 }}>
                  {detay.baslik}
                </Typography>

                <Typography sx={{ mt: 2, fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 44, md: 52 }, lineHeight: 1, color: fiyat > 0 ? RENK.kirmiziAcik : 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                  {fiyat > 0 ? tlYaz(fiyat) : 'Fiyat için arayın'}
                </Typography>

                {uzunTaksit && (
                  <Box sx={{ mt: 1 }}>
                    <ButtonBase onClick={() => setTaksitAcik((v) => !v)} aria-expanded={taksitAcik}
                      sx={{ fontFamily: 'inherit', fontSize: 15, color: 'text.secondary', borderRadius: 1, textAlign: 'left', ...ODAK }}>
                      <span>{uzunTaksit.ay} taksitle ayda <strong style={{ color: RENK.murekkep, fontVariantNumeric: 'tabular-nums' }}>{tlYaz(uzunTaksit.aylik)}</strong></span>
                      <ExpandMoreIcon fontSize="small" sx={{ ml: 0.25, transition: 'transform .2s ease', transform: taksitAcik ? 'rotate(180deg)' : 'none' }} />
                    </ButtonBase>
                    <Collapse in={taksitAcik}>
                      <Box sx={{ mt: 1.25, fontVariantNumeric: 'tabular-nums' }}>
                        {taksitler.map((t) => (
                          <Box key={t.ay} sx={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', columnGap: 1, py: 0.9, borderTop: `1px solid ${RENK.cizgi}`, fontSize: 14.5 }}>
                            <span>{t.ay} ay</span>
                            <strong>ayda {tlYaz(t.aylik)}</strong>
                            <Box component="span" sx={{ color: 'text.secondary' }}>toplam {tlYaz(t.toplam)}</Box>
                          </Box>
                        ))}
                        <Button size="small" color="inherit" onClick={() => window.open(`/taksit/${Math.round(fiyat)}`, '_blank')}
                          sx={{ mt: 0.5, ml: -0.5, fontWeight: 600 }}>
                          Peşinatla hesapla
                        </Button>
                      </Box>
                    </Collapse>
                  </Box>
                )}

                <Box sx={{ mt: 2.5, pt: 2.5, borderTop: `1px solid ${RENK.cizgi}` }}>
                  {kisiler.length > 0 ? kisiler.map((k, i) => (
                    <Box key={`${k.ad}-${k.tel}`} sx={{ mt: i ? 2 : 0 }}>
                      {k.ad && <Typography sx={{ fontWeight: 600, mb: 0.75 }}>{k.ad}</Typography>}
                      <KisiDugmeleri kisi={k} boyut="large" tamGenislik />
                    </Box>
                  )) : (
                    <Typography color="text.secondary">Bilgi almak için mağazamıza uğrayabilirsiniz.</Typography>
                  )}
                  {detay.rubik_link && (
                    <Button fullWidth size="large" variant="contained" color="secondary" disableElevation startIcon={<CreditCardIcon />}
                      href={detay.rubik_link} target="_blank" rel="noopener noreferrer" sx={{ mt: 2 }}>
                      Kartla sipariş ver
                    </Button>
                  )}
                </Box>
              </Box>

              {/* ---- Özellikler iletişim kartının hemen altında ---- */}
              {ozellikler.length > 0 && (
                <Box component="section" sx={{ gridRow: { xs: 4, md: 'auto' }, minWidth: 0 }}>
                  <Typography component="h2" sx={bolumBasligi}>Özellikler</Typography>
                  <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: '1fr', borderTop: `1px solid ${RENK.cizgi}` }}>
                    {ozellikler.map((o) => (
                      <Box key={o.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, minWidth: 0, py: 1.25, borderBottom: `1px solid ${RENK.cizgi}` }}>
                        <Box component="dt" sx={{ color: 'text.secondary' }}>{o.label}</Box>
                        <Box component="dd" sx={{ m: 0, minWidth: 0, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{o.value}</Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              </Box>
            </Box>

            {(detay.video_dosya_id || video) && (
              <Box component="section" sx={{ mt: { xs: 4, md: 5 }, mb: { xs: 4, md: 5 } }}>
                    <Typography component="h2" sx={bolumBasligi}>Video</Typography>
                    {detay.video_dosya_id ? (
                      <Box component="video" controls preload="metadata" playsInline poster={detay.kapak_gorsel_id ? vitrinService.gorselUrl(detay.kapak_gorsel_id) : undefined}
                        sx={{ width: '100%', maxHeight: 480, display: 'block', bgcolor: '#000', borderRadius: 3 }}>
                        <source src={vitrinService.videoUrl(detay.video_dosya_id)} />
                      </Box>
                    ) : video.tip === 'embed' ? (
                      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 3, overflow: 'hidden', bgcolor: '#000' }}>
                        <iframe src={video.src} title="Tanıtım videosu" loading="lazy" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                      </Box>
                    ) : video.tip === 'file' ? (
                      <Box component="video" controls preload="metadata" playsInline sx={{ width: '100%', maxHeight: 480, display: 'block', bgcolor: '#000', borderRadius: 3 }}><source src={video.src} /></Box>
                    ) : (
                      <Button size="large" variant="outlined" color="inherit" startIcon={<PlayIcon />} href={video.src} target="_blank" rel="noopener noreferrer">Videoyu aç</Button>
                    )}
              </Box>
            )}

            {digerleri.length > 0 && (
              <Box component="section" sx={{ mt: { xs: 2, md: 5 }, pt: { xs: 3, md: 5 }, borderTop: `1px solid ${RENK.cizgi}` }}>
                <Typography component="h2" sx={{ ...bolumBasligi, mb: 2.5 }}>
                  {motor ? `Diğer ${sifir ? 'sıfır' : 'ikinci el'} motorlar` : 'Diğer ürünler'}
                </Typography>
                <Box sx={ilanIzgarasi(motor)}>
                  {digerleri.map((u) => (
                    <IlanKarti key={u.id} u={u} kucuk onClick={() => navigate(`/ilan/${u.id}`, { state: location.state })} />
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Telefonda ekranın altında sabit duran arama çubuğu */}
      {detay && aranacakKisi && (
        <Box sx={{
          display: { xs: 'flex', md: 'none' }, gap: 1, position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10,
          bgcolor: RENK.yuzey, borderTop: `1px solid ${RENK.cizgi}`, px: 1.5, pt: 1.25,
          pb: 'calc(10px + env(safe-area-inset-bottom))',
        }}>
          <Button fullWidth size="large" variant="contained" color="error" disableElevation startIcon={<PhoneIcon />} href={`tel:${aranacakKisi.tel}`}>
            Ara
          </Button>
          {waLink(aranacakKisi.tel) && (
            <Button fullWidth size="large" variant="outlined" startIcon={<WhatsAppIcon />}
              href={waLink(aranacakKisi.tel)} target="_blank" rel="noopener noreferrer"
              sx={{ color: RENK.whatsapp, borderColor: RENK.whatsapp, '&:hover': { borderColor: RENK.whatsapp } }}>
              WhatsApp
            </Button>
          )}
        </Box>
      )}

      {/* Tam ekran görsel */}
      <Dialog fullScreen open={buyukGorsel && !!aktifGorsel} onClose={() => setBuyukGorsel(false)}
        PaperProps={{ sx: { bgcolor: '#000', borderRadius: 0 } }}>
        <Box onTouchStart={dokunmaBasla} onTouchEnd={dokunmaBitir} onClick={() => setBuyukGorsel(false)}
          sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          {aktifGorsel && (
            <img src={vitrinService.gorselUrl(aktifGorsel)} alt={detay ? `${detay.baslik}, ${gorselIdx + 1}. görsel` : ''}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
          )}
          <IconButton aria-label="Kapat" onClick={() => setBuyukGorsel(false)} sx={{ ...sahneDugmesi, top: 12, right: 12 }}><CloseIcon /></IconButton>
          {gorselOklari(12)}
        </Box>
      </Dialog>
    </Box>
  );
};

// Vitrin teması yalnızca müşteri sayfalarını sarar; yönetim paneli etkilenmez
const StorefrontDetaySayfa = () => <VitrinTema><StorefrontDetay /></VitrinTema>;

export default StorefrontDetaySayfa;
