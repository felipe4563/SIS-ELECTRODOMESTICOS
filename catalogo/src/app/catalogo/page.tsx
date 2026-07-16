import type { Metadata } from 'next';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FiltrosHorizontal from './FiltrosHorizontal';
import OrdenSelect from './OrdenSelect';
import CatalogoClient from './CatalogoClient';

export const metadata: Metadata = { title: 'Catálogo — Mega Electra' };
export const revalidate = 60;

interface Props {
  searchParams: Promise<{ buscar?: string; categoria?: string; marca?: string; color?: string; orden?: string; page?: string }>;
}

export default async function CatalogoPage({ searchParams }: Props) {
  const sp     = await searchParams;
  const pagina = Number(sp.page ?? 1);

  const catParam = sp.categoria ? { categoria: Number(sp.categoria) } : undefined;

  const [empresaRes, categoriasRes, marcasRes, coloresRes, productosRes] = await Promise.allSettled([
    api.empresa(),
    api.categorias(),
    api.marcas(catParam),
    api.colores(catParam),
    api.productos({
      limit: 12, page: pagina,
      ...(sp.buscar    && { buscar:    sp.buscar }),
      ...(sp.categoria && { categoria: sp.categoria }),
      ...(sp.marca     && { marca:     sp.marca }),
      ...(sp.color     && { color:     sp.color }),
      ...(sp.orden     && { orden:     sp.orden }),
    }),
  ]);

  const empresa    = empresaRes.status    === 'fulfilled' ? empresaRes.value               : null;
  const categorias = categoriasRes.status === 'fulfilled' ? categoriasRes.value.categorias : [];
  const marcas     = marcasRes.status     === 'fulfilled' ? marcasRes.value.marcas         : [];
  const colores    = coloresRes.status    === 'fulfilled' ? coloresRes.value.colores       : [];
  const resultado  = productosRes.status  === 'fulfilled' ? productosRes.value             : null;
  const productos  = resultado?.productos ?? [];
  const paginacion = resultado?.paginacion;

  return (
    <>
      <Navbar empresa={empresa} />
      <main style={{ flex: 1 }}>

        {/* Page header */}
        <div style={{
          background:  'var(--color-bg-2)',
          borderBottom:'1px solid var(--color-border)',
          padding:     '1.5rem 0',
        }}>
          <div className="container-max">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem',
                          color: 'var(--color-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <a href="/" style={{ textDecoration: 'none', color: 'var(--color-muted)', transition: 'color 0.15s' }}
                className="nav-link">Inicio</a>
              <span>/</span>
              <span style={{ color: '#fff' }}>Catálogo</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Catálogo</h1>
                {paginacion && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: 2 }}>
                    {paginacion.total} producto{paginacion.total !== 1 ? 's' : ''} encontrado{paginacion.total !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container-max" style={{ padding: '2rem 1.5rem' }}>

          {/* Toolbar: búsqueda + orden */}
          <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <form method="get" action="/catalogo" style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0 }}>
              {sp.categoria && <input type="hidden" name="categoria" value={sp.categoria} />}
              {sp.marca     && <input type="hidden" name="marca"     value={sp.marca}     />}
              <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                              color: 'var(--color-muted)', pointerEvents: 'none' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input name="buscar" type="search" defaultValue={sp.buscar}
                  placeholder="Buscar producto..."
                  style={{ paddingLeft: '2.25rem', height: 40 }} />
              </div>
              <button type="submit" className="btn-primary" style={{ height: 40, padding: '0 1.25rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Buscar
              </button>
            </form>
            <div className="orden-wrap">
              <OrdenSelect ordenActivo={sp.orden} />
            </div>
          </div>

          {/* Filtros horizontales desplegables */}
          <FiltrosHorizontal
            categorias={categorias}
            marcas={marcas}
            colores={colores}
            filtrosActivos={{ buscar: sp.buscar, categoria: sp.categoria, marca: sp.marca, color: sp.color, orden: sp.orden }}
          />

          {/* Grid de productos — ancho completo */}
          <CatalogoClient
            productos={productos}
            telefono={empresa?.telefono ?? null}
          />

          {/* Paginación */}
          {paginacion && paginacion.paginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '3rem', flexWrap: 'wrap' }}>
              {Array.from({ length: paginacion.paginas }, (_, i) => i + 1).map(n => {
                const params = new URLSearchParams();
                if (sp.buscar)    params.set('buscar',    sp.buscar);
                if (sp.categoria) params.set('categoria', sp.categoria);
                if (sp.marca)     params.set('marca',     sp.marca);
                if (sp.color)     params.set('color',     sp.color);
                if (sp.orden)     params.set('orden',     sp.orden);
                params.set('page', String(n));
                const active = n === pagina;
                return (
                  <a key={n} href={`/catalogo?${params.toString()}`} style={{
                    display:        'inline-flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    width:           38,
                    height:          38,
                    borderRadius:   'var(--radius-sm)',
                    fontSize:       '0.82rem',
                    fontWeight:      700,
                    textDecoration: 'none',
                    border:         '1.5px solid',
                    borderColor:     active ? 'var(--color-primary)' : 'var(--color-border)',
                    background:      active ? 'var(--color-primary)' : 'transparent',
                    color:           active ? '#fff' : 'var(--color-muted)',
                    transition:     'all 0.15s',
                    letterSpacing:  '0.02em',
                  }}>
                    {n}
                  </a>
                );
              })}
            </div>
          )}

          {/* Cargar más */}
          {productos.length >= 12 && paginacion && pagina < paginacion.paginas && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <a href={`/catalogo?${(() => {
                const p = new URLSearchParams();
                if (sp.buscar)    p.set('buscar',    sp.buscar);
                if (sp.categoria) p.set('categoria', sp.categoria);
                if (sp.marca)     p.set('marca',     sp.marca);
                if (sp.color)     p.set('color',     sp.color);
                if (sp.orden)     p.set('orden',     sp.orden);
                p.set('page', String(pagina + 1));
                return p.toString();
              })()}`} className="btn-outline" style={{ padding: '0.75rem 2.5rem', display: 'inline-flex' }}>
                Cargar más datos
              </a>
            </div>
          )}

        </div>
      </main>
      <Footer empresa={empresa} />

      <style>{`
        @media (max-width: 520px) {
          .orden-wrap { width: 100%; }
          .orden-wrap select { width: 100%; }
        }
      `}</style>
    </>
  );
}
