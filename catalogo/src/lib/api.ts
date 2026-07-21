const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
export const UPLOADS = process.env.NEXT_PUBLIC_UPLOADS_URL ?? 'http://localhost:3001';

export function imgUrl(url?: string | null): string {
  if (!url) return '/placeholder.svg';
  if (url.startsWith(UPLOADS)) return url.slice(UPLOADS.length);
  if (url.startsWith('http://localhost')) {
    const withoutOrigin = url.replace(/^http:\/\/localhost:\d+/, '');
    return withoutOrigin;
  }
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? url : `/${url}`;
}

export function fmtPrecio(n: number | string): string {
  return `Bs ${Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
}

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${API}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export interface Empresa {
  razon_social: string;
  nombre_comercial: string;
  direccion: string;
  telefono: string;
  email: string;
  logo_url: string;
}

export interface Categoria {
  id_categoria: number;
  nombre: string;
  imagen_url?: string | null;
  total_productos: number;
}

export interface Marca {
  id_marca: number;
  nombre: string;
  logo_url: string | null;
}

export interface Producto {
  id_producto: number;
  codigo_interno: string;
  producto: string;
  imagen_url: string | null;
  modelo: string | null;
  color: string | null;
  capacidad: string | null;
  precio_publico: number;
  marca: string | null;
  categoria: string | null;
  stock_total: number;
  disponible: boolean;
}

export interface ProductoImagen {
  imagen_url: string;
  es_principal: number;
}

export interface ProductoDetalle extends Producto {
  caracteristicas: string | null;
  detalle: string | null;
  disponibilidad: string;
  imagenes: ProductoImagen[];
  promociones: Promocion[];
  combos: Combo[];
  empresa: Empresa | null;
}

export interface Promocion {
  id_promocion?: number;
  nombre: string;
  descripcion: string | null;
  tipo_descuento: 'PORCENTAJE' | 'MONTO_FIJO';
  valor_descuento: number;
  aplica_a?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface Combo {
  id_combo?: number;
  nombre: string;
  descripcion: string | null;
  precio_combo: number;
  imagen_url: string | null;
  fecha_fin?: string | null;
  productos: { producto: string; imagen_url: string | null; precio_publico: number; cantidad: number }[];
}

export interface Paginacion {
  total: number;
  pagina: number;
  limite: number;
  paginas: number;
}

export const api = {
  empresa:    ()             => get<Empresa>('/public/empresa'),
  categorias: ()             => get<{ categorias: Categoria[] }>('/public/categorias'),
  marcas:     (p?: { categoria?: number }) =>
                               get<{ marcas: Marca[] }>('/public/marcas', p as Record<string, number>),
  colores:    (p?: { categoria?: number }) =>
                               get<{ colores: string[] }>('/public/colores', p as Record<string, number>),
  productos:  (p?: Record<string, string | number>) =>
                               get<{ productos: Producto[]; paginacion: Paginacion }>('/public/productos', p),
  producto:   (codigo: string) => get<ProductoDetalle>(`/public/producto/${codigo}`),
  promociones: ()            => get<{ promociones: Promocion[] }>('/public/promociones'),
  combos:     ()             => get<{ combos: Combo[] }>('/public/combos'),
};
