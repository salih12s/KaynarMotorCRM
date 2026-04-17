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
import Musteriler from './pages/Musteriler';
import MotorDetay from './pages/MotorDetay';

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
    if (user.servis_yetkisi) return <Navigate to="/" />;
    if (user.aksesuar_yetkisi) return <Navigate to="/aksesuarlar" />;
    if (user.motor_satis_yetkisi) return <Navigate to="/ikinci-el-motor" />;
    if (user.eticaret_yetkisi) return <Navigate to="/eticaret" />;
    if (user.aksesuar_stok_yetkisi) return <Navigate to="/aksesuar-stok" />;
    if (user.yedek_parca_yetkisi) return <Navigate to="/yedek-parcalar" />;
    return <Navigate to="/" />;
  }
  return children;
};

const NormalRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin' && !user.servis_yetkisi) {
    if (user.aksesuar_yetkisi) return <Navigate to="/aksesuarlar" />;
    if (user.motor_satis_yetkisi) return <Navigate to="/ikinci-el-motor" />;
    if (user.eticaret_yetkisi) return <Navigate to="/eticaret" />;
    if (user.aksesuar_stok_yetkisi) return <Navigate to="/aksesuar-stok" />;
    if (user.yedek_parca_yetkisi) return <Navigate to="/yedek-parcalar" />;
  }
  return children;
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
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<ServisRoute><IsEmirleri /></ServisRoute>} />
              <Route path="/is-emri/yeni" element={<ServisRoute><IsEmriForm /></ServisRoute>} />
              <Route path="/is-emri/:id" element={<ServisRoute><IsEmriDetay /></ServisRoute>} />
              <Route path="/is-emri/:id/duzenle" element={<ServisRoute><IsEmriForm /></ServisRoute>} />
              <Route path="/aksesuarlar" element={<AksesuarRoute><Aksesuarlar /></AksesuarRoute>} />
              <Route path="/aksesuar-stok" element={<AksesuarStokRoute><AksesuarStok /></AksesuarStokRoute>} />
              <Route path="/ikinci-el-motor" element={<MotorSatisRoute><IkinciElMotor /></MotorSatisRoute>} />
              <Route path="/motor-stok" element={<MotorSatisRoute><MotorStok /></MotorSatisRoute>} />
              <Route path="/motor/:id" element={<MotorSatisRoute><MotorDetay /></MotorSatisRoute>} />
              <Route path="/eticaret" element={<EticaretRoute><ETicaret /></EticaretRoute>} />
              <Route path="/yedek-parcalar" element={<YedekParcaRoute><YedekParcalar /></YedekParcaRoute>} />
              <Route path="/raporlar" element={<AdminRoute><Raporlar /></AdminRoute>} />
              <Route path="/kullanicilar" element={<AdminRoute><Kullanicilar /></AdminRoute>} />
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
