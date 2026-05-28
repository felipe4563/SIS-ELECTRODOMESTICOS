import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { empresaService } from '../services/configuracion.service';
import { useAuth } from './AuthContext';

const BACKEND = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

const EmpresaContext = createContext(null);

export function buildLogoUrl(logoUrl) {
  if (!logoUrl) return '/logo.png';
  if (logoUrl.startsWith('http')) return logoUrl;
  return BACKEND + logoUrl;
}

export function EmpresaProvider({ children }) {
  const { usuario } = useAuth();
  const [empresa, setEmpresa] = useState(null);

  const cargar = useCallback(() => {
    if (!usuario) return;
    empresaService.get()
      .then(({ data }) => setEmpresa(data.empresa))
      .catch(() => {});
  }, [usuario]);

  useEffect(() => { cargar(); }, [cargar]);

  const logoUrl = buildLogoUrl(empresa?.logo_url);

  return (
    <EmpresaContext.Provider value={{ empresa, logoUrl, recargar: cargar, setEmpresa }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export const useEmpresa = () => useContext(EmpresaContext);
