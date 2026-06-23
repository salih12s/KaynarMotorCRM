import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomThemeProvider, useCustomTheme } from './context/ThemeContext';

import Layout from './components/Layout';
import Login from './pages/Login';
import IsEmirleri from './pages/IsEmirleri';
import IsEmriForm from './pages/IsEmriForm';
import IsEmriDetay from './pages/IsEmriDetay';
import Aksesuarlar from './pages/Aksesuarlar';
import AksesuarStok from './pages/AksesuarStok';
import IkinciElMotor from './pages/IkinciElMotor';
import MotorStok from './pages/MotorStok';
import ETicaret from './pages/ETicaret';
import YedekParcalar from './pages/YedekParcalar';
import Raporlar from './pages/Raporlar';
import Kullanicilar from './pages/Kullanicilar';
import Yetkilendirme from './pages/Yetkilendirme';
import Musteriler from './pages/Musteriler';
import MotorDetay from './pages/MotorDetay';
import Veresiye from './pages/Veresiye';
import Vitrin from './pages/Vitrin';
import Storefront from './pages/Storefront';
import StorefrontDetay from './pages/StorefrontDetay';
import TaksitHesaplama from './pages/TaksitHesaplama';
import TaksitGoruntule from './pages/TaksitGoruntule';

// Route Guards
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin') return <Navigate to="/" />;
  return children;
};

const AksesuarRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.aksesuar_yetkisi) return <Navigate to="/" />;
  return children;
};

const MotorSatisRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.motor_satis_yetkisi) return <Navigate to="/" />;
  return children;
};

// Motor Stok: admin, motor yetkisi olan personel veya yatırımcı erişebilir
const MotorStokRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && user.rol !== 'yatirimci' && !user.motor_satis_yetkisi) return <Navigate to="/" />;
  return children;
};

// Raporlar: admin veya yatırımcı (yatırımcı sadece kendi raporunu görür)
const RaporRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && user.rol !== 'yatirimci') return <Navigate to="/" />;
  return children;
};

const EticaretRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.eticaret_yetkisi) return <Navigate to="/" />;
  return children;
};

const ServisRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.servis_yetkisi) return <Navigate to="/" />;
  return children;
};

const AksesuarStokRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.aksesuar_stok_yetkisi) return <Navigate to="/" />;
  return children;
};

// Vitrin: admin veya motor/aksesuar vitrin yetkisi olan personel
const VitrinRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.motor_vitrin_yetkisi && !user.aksesuar_vitrin_yetkisi) return <Navigate to="/" />;
  return children;
};

const YedekParcaRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.yedek_parca_yetkisi) return <Navigate to="/" />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (user.rol === 'admin') return <Navigate to="/" />;
    if (user.rol === 'yatirimci') return <Navigate to="/motor-stok" />;
    if (user.servis_yetkisi) return <Navigate to="/" />;
    if (user.aksesuar_yetkisi) return <Navigate to="/aksesuarlar" />;
    if (user.motor_satis_yetkisi) return <Navigate to="/ikinci-el-motor" />;
    if (user.eticaret_yetkisi) return <Navigate to="/eticaret" />;
    if (user.aksesuar_stok_yetkisi) return <Navigate to="/aksesuar-stok" />;
    if (user.yedek_parca_yetkisi) return <Navigate to="/yedek-parcalar" />;
    if (user.motor_vitrin_yetkisi || user.aksesuar_vitrin_yetkisi) return <Navigate to="/vitrin" />;
    return <Navigate to="/" />;
  }
  return children;
};

const NormalRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol === 'yatirimci') return <Navigate to="/motor-stok" />;
  if (user.rol !== 'admin' && !user.servis_yetkisi) {
    if (user.aksesuar_yetkisi) return <Navigate to="/aksesuarlar" />;
    if (user.motor_satis_yetkisi) return <Navigate to="/ikinci-el-motor" />;
    if (user.eticaret_yetkisi) return <Navigate to="/eticaret" />;
    if (user.aksesuar_stok_yetkisi) return <Navigate to="/aksesuar-stok" />;
    if (user.yedek_parca_yetkisi) return <Navigate to="/yedek-parcalar" />;
    if (user.motor_vitrin_yetkisi || user.aksesuar_vitrin_yetkisi) return <Navigate to="/vitrin" />;
  }
  return children;
};

// Giriş yapmış kullanıcıyı rolüne göre uygun panele yönlendiren hedef
const panelHedefi = (user) => {
  if (user.rol === 'admin') return '/servis';
  if (user.rol === 'yatirimci') return '/motor-stok';
  if (user.servis_yetkisi) return '/servis';
  if (user.aksesuar_yetkisi) return '/aksesuarlar';
  if (user.motor_satis_yetkisi) return '/ikinci-el-motor';
  if (user.eticaret_yetkisi) return '/eticaret';
  if (user.aksesuar_stok_yetkisi) return '/aksesuar-stok';
  if (user.yedek_parca_yetkisi) return '/yedek-parcalar';
  if (user.motor_vitrin_yetkisi || user.aksesuar_vitrin_yetkisi) return '/vitrin';
  return null; // Hiçbir yetki yok — yönlendirme döngüsünü önlemek için null
};

// Hiçbir modül yetkisi olmayan kullanıcıya gösterilen ekran (sonsuz yönlendirme döngüsünü engeller)
const YetkisizEkran = () => {
  const { user, logout } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#1a1a1a', color: '#fff', textAlign: 'center', padding: 24 }}>
      <img src="/KaynarMotor.png" alt="Kaynar Motor" width="80" height="89" style={{ width: 80, height: 89, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
      <h2 style={{ margin: 0 }}>Merhaba {user?.ad_soyad || ''}</h2>
      <p style={{ margin: 0, opacity: 0.8, maxWidth: 360 }}>Hesabınıza henüz bir yetki tanımlanmamış. Lütfen yönetici ile iletişime geçin.</p>
      <button onClick={() => logout()} style={{ padding: '10px 26px', background: '#C62828', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>Çıkış Yap</button>
    </div>
  );
};

// Kök adres (/): ziyaretçi vitrini görür, giriş yapan kullanıcı panele yönlenir
const RootRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Storefront />;
  const hedef = panelHedefi(user);
  if (!hedef) return <YetkisizEkran />; // yetkisiz kullanıcı: döngü yerine bilgi ekranı
  return <Navigate to={hedef} />;
};

const ThemedApp = () => {
  const { theme } = useCustomTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<RootRoute />} />
            {/* Giriş yapmış kullanıcıların da panelden dönebilmesi için herkese açık vitrin */}
            <Route path="/site" element={<Storefront />} />
            <Route path="/ilan/:id" element={<StorefrontDetay />} />
            {/* Müşteriye gönderilen taksit linki — herkese açık */}
            <Route path="/taksit/:fiyat" element={<TaksitGoruntule />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/servis" element={<ServisRoute><IsEmirleri /></ServisRoute>} />
              <Route path="/vitrin" element={<VitrinRoute><Vitrin /></VitrinRoute>} />
              <Route path="/is-emri/yeni" element={<ServisRoute><IsEmriForm /></ServisRoute>} />
              <Route path="/is-emri/:id" element={<ServisRoute><IsEmriDetay /></ServisRoute>} />
              <Route path="/is-emri/:id/duzenle" element={<ServisRoute><IsEmriForm /></ServisRoute>} />
              <Route path="/aksesuarlar" element={<AksesuarRoute><Aksesuarlar /></AksesuarRoute>} />
              <Route path="/aksesuar-stok" element={<AksesuarStokRoute><AksesuarStok /></AksesuarStokRoute>} />
              <Route path="/ikinci-el-motor" element={<MotorSatisRoute><IkinciElMotor /></MotorSatisRoute>} />
              <Route path="/motor-stok" element={<MotorStokRoute><MotorStok /></MotorStokRoute>} />
              <Route path="/motor/:id" element={<MotorSatisRoute><MotorDetay /></MotorSatisRoute>} />
              <Route path="/eticaret" element={<EticaretRoute><ETicaret /></EticaretRoute>} />
              <Route path="/yedek-parcalar" element={<YedekParcaRoute><YedekParcalar /></YedekParcaRoute>} />
              <Route path="/taksit-hesaplama" element={<TaksitHesaplama />} />
              <Route path="/veresiye" element={<AdminRoute><Veresiye /></AdminRoute>} />
              <Route path="/raporlar" element={<RaporRoute><Raporlar /></RaporRoute>} />
              <Route path="/kullanicilar" element={<AdminRoute><Kullanicilar /></AdminRoute>} />
              <Route path="/yetkilendirme" element={<AdminRoute><Yetkilendirme /></AdminRoute>} />
              <Route path="/musteriler" element={<AdminRoute><Musteriler /></AdminRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

function App() {
  return (
    <CustomThemeProvider>
      <ThemedApp />
    </CustomThemeProvider>
  );
}

export default App;
