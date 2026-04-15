import React, { createContext, useState, useContext, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';

const ThemeContext = createContext(null);

const themeConfigs = {
  default: { primary: '#C62828', secondary: '#1a1a1a', name: 'Servis' },
  aksesuar: { primary: '#C62828', secondary: '#1a1a1a', name: 'Aksesuar' },
  motor: { primary: '#C62828', secondary: '#1a1a1a', name: '2. El Motor' },
  eticaret: { primary: '#C62828', secondary: '#1a1a1a', name: 'E-Ticaret' },
  yedekParca: { primary: '#C62828', secondary: '#1a1a1a', name: 'Yedek Parça' },
};

export const CustomThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('default');

  const setDefaultTheme = () => setCurrentTheme('default');
  const setAksesuarTheme = () => setCurrentTheme('aksesuar');
  const setMotorTheme = () => setCurrentTheme('motor');
  const setEticaretTheme = () => setCurrentTheme('eticaret');
  const setYedekParcaTheme = () => setCurrentTheme('yedekParca');

  const theme = useMemo(() => {
    const config = themeConfigs[currentTheme] || themeConfigs.default;
    return createTheme({
      palette: {
        primary: { main: config.primary },
        secondary: { main: config.secondary },
      },
      typography: {
        fontFamily: '"Roboto", "Segoe UI", sans-serif',
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: { textTransform: 'none', borderRadius: 8 },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: { borderRadius: 12 },
          },
        },
      },
    });
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{
      theme, currentTheme, themeConfigs,
      setDefaultTheme, setAksesuarTheme, setMotorTheme, setEticaretTheme, setYedekParcaTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useCustomTheme = () => useContext(ThemeContext);
export default ThemeContext;
