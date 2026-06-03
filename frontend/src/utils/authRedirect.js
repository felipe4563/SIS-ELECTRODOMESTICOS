import { empresaService } from '../services/configuracion.service';

export async function redirigirPostAuth(ability, navigate, destino = '/dashboard') {
  if (!ability.can('ver', 'configuracion')) {
    navigate(destino, { replace: true });
    return;
  }
  try {
    const { data } = await empresaService.get();
    const empresa = data?.empresa;
    if (!empresa?.razon_social || !empresa?.nit) {
      navigate('/configuracion/wizard', { replace: true });
    } else {
      navigate('/configuracion', { replace: true });
    }
  } catch {
    navigate(destino, { replace: true });
  }
}
