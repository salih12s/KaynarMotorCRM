import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, IconButton, Box, Divider, Collapse, useMediaQuery, useTheme, Avatar
} from '@mui/material';
import {
  Menu as MenuIcon, Build as BuildIcon, People as PeopleIcon, TwoWheeler as MotorIcon,
  ShoppingCart as ShopIcon, Inventory as StokIcon, Store as StoreIcon, Sell as SellIcon,
  Assessment as ReportIcon, SupervisorAccount as AdminIcon, ExpandLess, ExpandMore,
  Logout as LogoutIcon, Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useCustomTheme } from '../context/ThemeContext';
import { authService } from '../services/api';

const DRAWER_WIDTH = 240;

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aksesuarOpen, setAksesuarOpen] = useState(false);
  const [motorOpen, setMotorOpen] = useState(false);
  const { setDefaultTheme, setAksesuarTheme, setMotorTheme, setEticaretTheme, setYedekParcaTheme } = useCustomTheme();

  const pathname = location.pathname;

  useEffect(() => {
    if (pathname === '/aksesuarlar' || pathname === '/aksesuar-stok') {
      setAksesuarTheme();
    } else if (pathname === '/ikinci-el-motor' || pathname === '/motor-stok') {
      setMotorTheme();
    } else if (pathname === '/eticaret') {
      setEticaretTheme();
    } else if (pathname === '/yedek-parcalar') {
      setYedekParcaTheme();
    } else {
      setDefaultTheme();
    }
  }, [pathname, setDefaultTheme, setAksesuarTheme, setMotorTheme, setEticaretTheme, setYedekParcaTheme]);

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const isAdmin = user?.rol === 'admin';
  const hasAksesuar = user?.aksesuar_yetkisi;
  const hasMotor = user?.motor_satis_yetkisi;
  const hasEticaret = user?.eticaret_yetkisi;
  const hasServis = user?.servis_yetkisi;
  const hasAksesuarStok = user?.aksesuar_stok_yetkisi;
  const hasYedekParca = user?.yedek_parca_yetkisi;
  const isNormalPersonel = !isAdmin && !hasAksesuar && !hasMotor && !hasEticaret && !hasServis && !hasAksesuarStok && !hasYedekParca;

  const getPageTitle = () => {
    if (pathname === '/') return 'Servis';
    if (pathname === '/ikinci-el-motor') return 'Motor Satış';
    if (pathname === '/motor-stok') return 'Motor Stok';
    if (pathname === '/aksesuarlar') return 'Aksesuarlar';
    if (pathname === '/aksesuar-stok') return 'Aksesuar Stok';
    if (pathname === '/eticaret') return 'E-Ticaret';
    if (pathname === '/yedek-parcalar') return 'Yedek Parça';
    if (pathname === '/raporlar') return 'Raporlar';
    if (pathname === '/musteriler') return 'Müşteriler';
    if (pathname === '/kullanicilar') return 'Kullanıcılar';
    if (pathname.startsWith('/is-emri/') && pathname.includes('duzenle')) return 'İş Emri Düzenle';
    if (pathname === '/is-emri/yeni') return 'Yeni İş Emri';
    if (pathname.startsWith('/is-emri/')) return 'İş Emri Detay';
    return '';
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

  const menuItems = [
    {
      title: 'Motorsiklet', icon: <MotorIcon />, color: '#C62828', show: isAdmin || hasMotor, key: 'motor',
      subItems: [
        { title: 'Motor Satış', path: '/ikinci-el-motor', icon: <SellIcon /> },
        { title: 'Motor Stok', path: '/motor-stok', icon: <StokIcon /> },
      ]
    },
    { title: 'Servis', path: '/', icon: <BuildIcon />, show: isAdmin || hasServis, color: '#C62828' },
    {
      title: 'Aksesuarlar', icon: <ShopIcon />, color: '#C62828', show: isAdmin || hasAksesuar || hasAksesuarStok,
      subItems: [
        ...(isAdmin || hasAksesuar ? [{ title: 'Aksesuar Satış', path: '/aksesuarlar', icon: <SellIcon /> }] : []),
        ...(isAdmin || hasAksesuarStok ? [{ title: 'Aksesuar Stok', path: '/aksesuar-stok', icon: <StokIcon /> }] : []),
      ]
    },
    { title: 'E-Ticaret', path: '/eticaret', icon: <StoreIcon />, show: isAdmin || hasEticaret, color: '#C62828' },
    { title: 'Yedek Parça', path: '/yedek-parcalar', icon: <SettingsIcon />, show: isAdmin || hasYedekParca, color: '#C62828' },
    { title: 'Raporlar', path: '/raporlar', icon: <ReportIcon />, show: isAdmin, color: '#C62828' },
    { title: 'Müşteriler', path: '/musteriler', icon: <PeopleIcon />, show: isAdmin, color: '#C62828' },
    { title: 'Kullanıcılar', path: '/kullanicilar', icon: <AdminIcon />, show: isAdmin, color: '#C62828' },
  ];

  const isActive = (path) => pathname === path;
  const isSubActive = (item) => item.subItems?.some(s => pathname === s.path);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a1a', color: 'white', overflow: 'hidden' }}>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: 1 }}>
          <span>KAYNAR </span><span style={{ color: '#C62828' }}>MOTOR</span>
        </Typography>
      </Box>
      <List sx={{ flex: 1, pt: 0, pb: 0 }}>
        {menuItems.filter(item => item.show).map((item, index) => (
          <React.Fragment key={index}>
            {item.subItems ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => item.key === 'motor' ? setMotorOpen(!motorOpen) : setAksesuarOpen(!aksesuarOpen)}
                    sx={{
                      color: 'white', py: 1.5,
                      borderLeft: isSubActive(item) ? '4px solid white' : '4px solid transparent',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.title} primaryTypographyProps={{ fontWeight: isSubActive(item) ? 'bold' : 'normal' }} />
                    {(item.key === 'motor' ? motorOpen : aksesuarOpen) ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={item.key === 'motor' ? motorOpen : aksesuarOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((sub, si) => (
                      <ListItemButton
                        key={si}
                        onClick={() => handleNavigate(sub.path)}
                        sx={{
                          pl: 4, py: 1, color: 'white',
                          borderLeft: isActive(sub.path) ? '4px solid white' : '4px solid transparent',
                          bgcolor: isActive(sub.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                        }}
                      >
                        <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 30 }}>{sub.icon}</ListItemIcon>
                        <ListItemText primary={sub.title} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isActive(sub.path) ? 'bold' : 'normal' }} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    color: 'white', py: 1.5,
                    borderLeft: isActive(item.path) ? '4px solid white' : '4px solid transparent',
                    bgcolor: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.title} primaryTypographyProps={{ fontWeight: isActive(item.path) ? 'bold' : 'normal' }} />
                </ListItemButton>
              </ListItem>
            )}
          </React.Fragment>
        ))}
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <img src="/KaynarMotor.png" alt="Kaynar Motor" style={{ width: '80%', maxWidth: 160, borderRadius: 8, filter: 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.3))'}} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile ? (
        <>
          <IconButton onClick={() => setMobileOpen(!mobileOpen)} sx={{ position: 'fixed', top: 8, left: 8, zIndex: 1300, bgcolor: theme.palette.primary.main, color: 'white', '&:hover': { bgcolor: theme.palette.primary.dark } }}>
            <MenuIcon />
          </IconButton>
          <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none', borderRadius: 0 } }}
          >
            {drawer}
          </Drawer>
        </>
      ) : (
        <Drawer variant="permanent"
          sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none', borderRadius: 0 } }}
        >
          {drawer}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f5f5f5', width: isMobile ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)` }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 1.5, md: 3 }, pl: { xs: 6, md: 3 }, pt: { xs: 1, md: 2 }, pb: 1, bgcolor: 'white', borderBottom: '1px solid #eee', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant={isMobile ? 'subtitle1' : 'h5'} fontWeight="bold" noWrap>{getPageTitle()}</Typography>
            {!isMobile && <Typography variant="body2" color="text.secondary">{dateStr}</Typography>}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {!isMobile && <Typography variant="body2" fontWeight="500">{user?.ad_soyad}</Typography>}
            <Avatar sx={{ width: { xs: 30, md: 36 }, height: { xs: 30, md: 36 }, bgcolor: theme.palette.primary.main, fontSize: { xs: 13, md: 15 } }}>
              {user?.ad_soyad?.charAt(0) || 'U'}
            </Avatar>
            <IconButton onClick={handleLogout} size="small" sx={{ color: '#c62828' }} title="Çıkış Yap">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
