'use client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OrdenSelect({ ordenActivo }: { ordenActivo?: string }) {
  const router = useRouter();
  const sp     = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(sp.toString());
    params.set('orden', e.target.value);
    params.delete('page');
    router.push(`/catalogo?${params.toString()}`);
  };

  return (
    <select defaultValue={ordenActivo ?? 'nuevo'} onChange={handleChange} style={{ minWidth: 160 }}>
      <option value="nuevo">Más nuevos</option>
      <option value="nombre">Nombre A-Z</option>
      <option value="precio_asc">Precio ↑</option>
      <option value="precio_desc">Precio ↓</option>
    </select>
  );
}
