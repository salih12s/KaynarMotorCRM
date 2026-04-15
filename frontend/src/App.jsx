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

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (user.rol === 'admin') return <Navigate to="/" />;
    if (user.aksesuar_yetkisi && !user.motor_satis_yetkisi) return <Navigate to="/aksesuarlar" />;
    if (user.motor_satis_yetkisi && !user.aksesuar_yetkisi) return <Navigate to="/ikinci-el-motor" />;
    return <Navigate to="/" />;
  }
  return children;
};

const NormalRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.rol !== 'admin') {
    const hasAksesuar = user.aksesuar_yetkisi;
    const hasMotor = user.motor_satis_yetkisi;
    if (hasAksesuar && !hasMotor) return <Navigate to="/aksesuarlar" />;
    if (hasMotor && !hasAksesuar) return <Navigate to="/ikinci-el-motor" />;
    if (hasAksesuar && hasMotor) return <Navigate to="/aksesuarlar" />;
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
              <Route path="/" element={<IsEmirleri />} />
              <Route path="/is-emri/yeni" element={<IsEmriForm />} />
              <Route path="/is-emri/:id" element={<IsEmriDetay />} />
              <Route path="/is-emri/:id/duzenle" element={<IsEmriForm />} />
              <Route path="/aksesuarlar" element={<Aksesuarlar />} />
              <Route path="/aksesuar-stok" element={<AksesuarStok />} />
              <Route path="/ikinci-el-motor" element={<IkinciElMotor />} />
              <Route path="/motor-stok" element={<MotorStok />} />
              <Route path="/motor/:id" element={<MotorDetay />} />
              <Route path="/eticaret" element={<ETicaret />} />
              <Route path="/yedek-parcalar" element={<YedekParcalar />} />
              <Route path="/raporlar" element={<AdminRoute><Raporlar /></AdminRoute>} />
              <Route path="/kullanicilar" element={<AdminRoute><Kullanicilar /></AdminRoute>} />
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
