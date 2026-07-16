'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Categoria, Marca } from '@/lib/api';

interface Props {
  categorias:    Categoria[];
  marcas:        Marca[];
  colores:       string[];
  filtrosActivos:{ buscar?: string; categoria?: string; marca?: string; color?: string; orden?: string };
}

type Panel = 'categoria' | 'marca' | 'color' | null;

export default function FiltrosHorizontal({ categorias, marcas, colores, filtrosActivos }: Props) {
  const router          = useRouter();
  const sp              = useSearchParams();
  const [abierto, setAbierto] = useState<Panel>(null);

  const go = (key: string, value: string | null) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else        params.delete(key);
    params.delete('page');
    router.push(`/catalogo?${params.toString()}`);
    setAbierto(null);
  };

  const toggle = (panel: Panel) => setAbierto(prev => prev === panel ? null : panel);

  const hasFiltros      = filtrosActivos.categoria || filtrosActivos.marca || filtrosActivos.color;
  const catActiva       = categorias.find(c => String(c.id_categoria) === filtrosActivos.categoria);
  const totalFiltros    = [filtrosActivos.categoria, filtrosActivos.marca, filtrosActivos.color].filter(Boolean).length;

  const triggerStyle = (panel: Panel, active: boolean) => ({
    display:       'inline-flex',
    alignItems:    'center',
    gap:            6,
    padding:       '0.5rem 1rem',
    borderRadius:  'var(--radius-sm)',
    fontSize:      '0.75rem',
    fontWeight:    700 as const,
    letterSpacing: '0.04em',
    cursor:        'pointer',
    transition:    'all 0.15s',
    border:        `1.5px solid ${abierto === panel ? 'var(--color-primary)' : active ? 'rgba(225,29,72,0.45)' : 'var(--color-border)'}`,
    background:     abierto === panel ? 'rgba(225,29,72,0.12)' : active ? 'rgba(225,29,72,0.07)' : 'var(--color-card)',
    color:          abierto === panel || active ? 'var(--color-primary)' : 'var(--color-muted)',
    whiteSpace:    'nowrap' as const,
  });

  const chipStyle = (active: boolean) => ({
    display:      'inline-flex',
    alignItems:   'center',
    gap:           4,
    padding:      '0.3rem 0.85rem',
    borderRadius: 'var(--radius-full)',
    fontSize:     '0.72rem',
    fontWeight:   active ? 700 as const : 500 as const,
    cursor:       'pointer',
    border:       `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    background:    active ? 'rgba(225,29,72,0.15)' : 'transparent',
    color:         active ? 'var(--color-primary)' : 'var(--color-muted)',
    transition:   'all 0.15s',
  });

  return (
    <div style={{ marginBottom: '1.5rem' }}>

      {/* ── Fila de triggers ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Categoría */}
        {categorias.length > 0 && (
          <button onClick={() => toggle('categoria')} style={triggerStyle('categoria', !!filtrosActivos.categoria)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            {catActiva ? catActiva.nombre : 'Categoría'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: abierto === 'categoria' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        )}

        {/* Marca */}
        {marcas.length > 0 && (
          <button onClick={() => toggle('marca')} style={triggerStyle('marca', !!filtrosActivos.marca)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            {filtrosActivos.marca ?? 'Marca'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: abierto === 'marca' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        )}

        {/* Color */}
        {colores.length > 0 && (
          <button onClick={() => toggle('color')} style={triggerStyle('color', !!filtrosActivos.color)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/>
              <circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/>
              <path d="M12 22c-4.42 0-8-1.79-8-4 0-1.58 1.76-2.98 4.4-3.64"/>
              <path d="M20 17.58A5 5 0 0 1 21 19c0 2.21-3.58 4-8 4"/>
            </svg>
            {filtrosActivos.color ?? 'Color'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: abierto === 'color' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        )}

        {/* Separador + conteo */}
        {totalFiltros > 0 && (
          <>
            <span style={{ width: 1, height: 24, background: 'var(--color-border)', margin: '0 2px' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 700,
                           background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.25)',
                           borderRadius: 'var(--radius-full)', padding: '0.2rem 0.6rem' }}>
              {totalFiltros} activo{totalFiltros > 1 ? 's' : ''}
            </span>
            <button onClick={() => router.push('/catalogo')} style={{
              background:   'none',
              border:       '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding:      '0.4rem 0.75rem',
              fontSize:     '0.7rem',
              fontWeight:   700,
              color:        'var(--color-muted)',
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              gap:           4,
              transition:   'all 0.15s',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Limpiar
            </button>
          </>
        )}
      </div>

      {/* ── Paneles desplegables ── */}
      {abierto && (
        <div className="filtro-panel" onClick={e => e.stopPropagation()}>

          {/* Panel Categoría */}
          {abierto === 'categoria' && (
            <>
              <p className="filtro-panel-label">Categoría</p>
              <div className="filtro-panel-chips">
                <button onClick={() => go('categoria', null)} style={chipStyle(!filtrosActivos.categoria)}>
                  Todos
                </button>
                {categorias.filter(c => c.total_productos > 0).map(c => (
                  <button key={c.id_categoria} onClick={() => go('categoria', String(c.id_categoria))}
                    style={chipStyle(filtrosActivos.categoria === String(c.id_categoria))}>
                    {c.nombre}
                    <span style={{ fontSize: '0.62rem', opacity: 0.6 }}>{c.total_productos}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Panel Marca */}
          {abierto === 'marca' && (
            <>
              <p className="filtro-panel-label">Marca / Fabricante</p>
              <div className="filtro-panel-chips">
                {marcas.map(m => (
                  <button key={m.id_marca}
                    onClick={() => go('marca', filtrosActivos.marca === m.nombre ? null : m.nombre)}
                    style={chipStyle(filtrosActivos.marca === m.nombre)}>
                    {m.nombre}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Panel Color */}
          {abierto === 'color' && (
            <>
              <p className="filtro-panel-label">Color</p>
              <div className="filtro-panel-chips">
                {colores.map(c => (
                  <button key={c}
                    onClick={() => go('color', filtrosActivos.color === c ? null : c)}
                    style={chipStyle(filtrosActivos.color === c)}>
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}

        </div>
      )}

      <style>{`
        .filtro-panel {
          margin-top: 8px;
          background:   var(--color-card);
          border:       1px solid var(--color-border);
          border-top:   2px solid var(--color-primary);
          border-radius: 0 0 var(--radius-md) var(--radius-md);
          padding:      1rem 1.25rem 1.25rem;
          animation:    panelIn 0.15s ease;
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .filtro-panel-label {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 0.75rem;
        }
        .filtro-panel-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          max-height: 200px;
          overflow-y: auto;
        }
        .filtro-panel-chips::-webkit-scrollbar { width: 4px; }
        .filtro-panel-chips::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
      `}</style>
    </div>
  );
}
