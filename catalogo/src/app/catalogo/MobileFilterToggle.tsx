'use client';
import { useState } from 'react';
import FiltrosCatalogo from './FiltrosCatalogo';
import type { Categoria, Marca } from '@/lib/api';

interface Props {
  categorias:    Categoria[];
  marcas:        Marca[];
  colores:       string[];
  filtrosActivos:{ buscar?: string; categoria?: string; marca?: string; color?: string; orden?: string };
}

export default function MobileFilterToggle({ categorias, marcas, colores, filtrosActivos }: Props) {
  const [open, setOpen] = useState(false);
  const hasActive = filtrosActivos.categoria || filtrosActivos.marca || filtrosActivos.color || filtrosActivos.buscar;

  return (
    <div className="mf-wrap">
      <button onClick={() => setOpen(v => !v)} style={{
        display:       'flex',
        alignItems:    'center',
        gap:            6,
        background:    hasActive ? 'rgba(225,29,72,0.12)' : 'var(--color-card)',
        border:        `1px solid ${hasActive ? 'rgba(225,29,72,0.4)' : 'var(--color-border)'}`,
        borderRadius:  'var(--radius-sm)',
        color:         hasActive ? 'var(--color-primary)' : 'var(--color-muted)',
        fontSize:      '0.78rem',
        fontWeight:     700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        padding:       '0.55rem 1rem',
        cursor:        'pointer',
        transition:    'all 0.15s',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
        Filtros{hasActive ? ' ●' : ''}
      </button>

      {open && (
        <div style={{
          marginTop:    8,
          background:   'var(--color-card)',
          border:       '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding:      '1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{
              fontWeight:    700,
              fontSize:     '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         'var(--color-primary)',
              display:       'flex',
              alignItems:    'center',
              gap:            6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)',
                             boxShadow: '0 0 6px var(--color-primary)', display: 'inline-block' }} />
              Filtros AI
            </p>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-muted)', fontSize: '1.4rem', lineHeight: 1, padding: '0 4px',
            }}>×</button>
          </div>
          <FiltrosCatalogo
            categorias={categorias}
            marcas={marcas}
            colores={colores}
            filtrosActivos={filtrosActivos}
          />
        </div>
      )}

      <style>{`
        .mf-wrap { display: none; }
        @media (max-width: 860px) { .mf-wrap { display: block; margin-bottom: 1rem; } }
      `}</style>
    </div>
  );
}
