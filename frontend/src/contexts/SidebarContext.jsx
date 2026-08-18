import { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [colapsado, setColapsado] = useState(() => localStorage.getItem('sidebar_colapsado') === '1');

  useEffect(() => {
    localStorage.setItem('sidebar_colapsado', colapsado ? '1' : '0');
  }, [colapsado]);

  return (
    <SidebarContext.Provider value={{ colapsado, setColapsado }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar debe usarse dentro de SidebarProvider');
  return ctx;
}
