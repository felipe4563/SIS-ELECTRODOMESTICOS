import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  tema: 'dark',
  toggleTema: () => {},
});

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => {
    try {
      const saved = localStorage.getItem('tema');
      if (saved) return saved;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (tema === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try { localStorage.setItem('tema', tema); } catch { /* localStorage no disponible */ }
  }, [tema]);

  const toggleTema = () =>
    setTema(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ tema, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);