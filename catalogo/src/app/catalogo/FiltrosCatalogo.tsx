'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Categoria, Marca } from '@/lib/api';

interface Props {
  categorias:    Categoria[];
  marcas:        Marca[];
  colores:       string[];
  filtrosActivos:{ buscar?: string; categoria?: string; marca?: string; color?: string; orden?: string };
}

export default function FiltrosCatalogo({ categorias, marcas, colores, filtrosActivos }: Props) {
  const router = useRouter();
  const sp     = useSearchParams();

  const go = (key: string, value: string | null) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else        params.delete(key);
    params.delete('page');
    router.push(`/catalogo?${params.toString()}`);
  };

  const hasFiltros = filtrosActivos.categoria || filtrosActivos.marca || filtrosActivos.color || filtrosActivos.buscar;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Búsqueda técnica */}
      <div>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--color-muted)', marginBottom: 8 }}>
          Búsqueda técnica
        </p>
        <form onSubmit={e => {
          e.preventDefault();
          const v = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value;
          go('buscar', v || null);
        }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                          color: 'var(--color-muted)', pointerEvents: 'none' }}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input name="q" type="search" defaultValue={filtrosActivos.buscar}
              placeholder="Protocolo..."
              style={{ paddingLeft: '2rem', height: 36, fontSize: '0.8rem', background: 'var(--color-bg)' }} />
          </div>
        </form>
      </div>

      {/* Rango visual */}
      <div>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--color-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>Rango de poder</span>
          <span style={{ color: 'var(--color-primary)' }}>Máx.</span>
        </p>
        <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, position: 'relative', margin: '0.75rem 0' }}>
          <div style={{ position: 'absolute', left: 0, width: '75%', height: '100%',
                        background: 'linear-gradient(90deg, #b80035, var(--color-primary))', borderRadius: 2 }} />
          <div style={{ position: 'absolute', left: '75%', top: '50%', transform: 'translate(-50%, -50%)',
                        width: 14, height: 14, borderRadius: '50%', background: 'var(--color-primary)',
                        boxShadow: '0 0 8px rgba(225,29,72,0.6)', cursor: 'pointer' }} />
        </div>
      </div>

      {/* Categorías */}
      {categorias.length > 0 && (
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'var(--color-muted)', marginBottom: 10 }}>
            Sistemas de control
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(([{ id: null as string | null, nombre: 'Todos', total: null as number | null }] as { id: string | null; nombre: string; total: number | null }[]).concat(
              categorias.filter(c => c.total_productos > 0).map(c => ({ id: String(c.id_categoria), nombre: c.nombre, total: c.total_productos }))
            )).map(cat => {
              const active = cat.id === null ? !filtrosActivos.categoria : filtrosActivos.categoria === cat.id;
              return (
                <button key={cat.nombre}
                  onClick={() => go('categoria', cat.id)}
                  style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:          8,
                    background:  'none',
                    border:      'none',
                    cursor:      'pointer',
                    padding:     '0.35rem 0',
                    color:        active ? '#fff' : 'var(--color-muted)',
                    fontSize:    '0.82rem',
                    fontWeight:   active ? 700 : 400,
                    textAlign:   'left',
                    width:       '100%',
                    transition:  'color 0.15s',
                  }}>
                  <span style={{
                    width:        14,
                    height:       14,
                    borderRadius: '2px',
                    border:       `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border-2)'}`,
                    background:   active ? 'var(--color-primary)' : 'transparent',
                    flexShrink:   0,
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent:'center',
                    transition:   'all 0.15s',
                  }}>
                    {active && (
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5">
                        <polyline points="2,6 5,9 10,3"/>
                      </svg>
                    )}
                  </span>
                  {cat.nombre}
                  {cat.total !== null && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--color-muted)' }}>
                      {cat.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Marcas */}
      {marcas.length > 0 && (
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'var(--color-muted)', marginBottom: 10 }}>
            Fabricante
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {marcas.map(m => {
              const active = filtrosActivos.marca === m.nombre;
              return (
                <button key={m.id_marca}
                  onClick={() => go('marca', active ? null : m.nombre)}
                  style={{
                    padding:      '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize:     '0.72rem',
                    fontWeight:    700,
                    border:       '1px solid',
                    borderColor:   active ? 'var(--color-primary)' : 'var(--color-border)',
                    background:    active ? 'rgba(225,29,72,0.15)' : 'transparent',
                    color:         active ? 'var(--color-primary)' : 'var(--color-muted)',
                    cursor:       'pointer',
                    transition:   'all 0.15s',
                  }}>
                  {m.nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Colores */}
      {colores.length > 0 && (
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'var(--color-muted)', marginBottom: 10 }}>
            Color
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {colores.map(c => {
              const active = filtrosActivos.color === c;
              return (
                <button key={c}
                  onClick={() => go('color', active ? null : c)}
                  style={{
                    padding:      '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize:     '0.72rem',
                    fontWeight:    700,
                    border:       '1px solid',
                    borderColor:   active ? 'var(--color-primary)' : 'var(--color-border)',
                    background:    active ? 'rgba(225,29,72,0.15)' : 'transparent',
                    color:         active ? 'var(--color-primary)' : 'var(--color-muted)',
                    cursor:       'pointer',
                    transition:   'all 0.15s',
                  }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasFiltros && (
        <button onClick={() => router.push('/catalogo')} style={{
          background:    'none',
          border:        '1px solid rgba(225,29,72,0.3)',
          borderRadius:  'var(--radius-sm)',
          padding:       '0.5rem',
          fontSize:      '0.7rem',
          fontWeight:     700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color:         'var(--color-primary)',
          cursor:        'pointer',
          width:         '100%',
          transition:    'background 0.15s',
        }}>
          × Limpiar filtros
        </button>
      )}
    </div>
  );
}
