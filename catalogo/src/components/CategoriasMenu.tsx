'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { Categoria } from '@/lib/api';

interface Props {
  categorias: Categoria[];
}

export default function CategoriasMenu({ categorias }: Props) {
  const [open, setOpen]           = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);

  if (categorias.length === 0) return null;

  const padres  = categorias.filter(c => !c.id_categoria_padre);
  const hijosDe = (idPadre: number) => categorias.filter(c => c.id_categoria_padre === idPadre);

  const cerrar = () => { setOpen(false); setExpandido(null); };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Categorías" className="cat-trigger" style={{
        display:        'flex',
        alignItems:     'center',
        gap:             8,
        padding:        '0 0.9rem',
        height:          44,
        background:     'var(--color-primary)',
        color:          '#fff',
        border:          'none',
        cursor:         'pointer',
        fontSize:       '0.78rem',
        fontWeight:      700,
        letterSpacing:  '0.03em',
        textTransform:  'uppercase',
        flexShrink:      0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
        Categorías
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <>
          {/* Click-catcher invisible para cerrar al hacer clic afuera */}
          <div onClick={cerrar} style={{ position: 'fixed', inset: 0, zIndex: 79 }} />

          {/* Panel anclado debajo del botón */}
          <div style={{
            position:      'absolute',
            top:           'calc(100% + 8px)',
            left:           0,
            zIndex:         80,
            width:          280,
            maxHeight:      420,
            overflowY:      'auto',
            background:    'var(--color-card)',
            border:        '1px solid var(--color-border)',
            borderTop:     '2px solid var(--color-primary)',
            borderRadius:  'var(--radius-md)',
            boxShadow:     '0 12px 32px rgba(0,0,0,0.25)',
            animation:     'catPanelIn 0.15s ease',
          }}>
            <nav style={{ display: 'flex', flexDirection: 'column', padding: '0.4rem 0' }}>
              {padres.map(p => {
                const hijos      = hijosDe(p.id_categoria);
                const tieneHijos = hijos.length > 0;
                const abierto    = expandido === p.id_categoria;
                return (
                  <div key={p.id_categoria}>
                    {tieneHijos ? (
                      <button
                        onClick={() => setExpandido(abierto ? null : p.id_categoria)}
                        className="cat-menu-item"
                        style={{
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'space-between',
                          width:          '100%',
                          padding:        '0.6rem 1rem',
                          background:     'none',
                          border:          'none',
                          cursor:         'pointer',
                          fontSize:       '0.82rem',
                          fontWeight:      600,
                          color:          'var(--color-txt-2)',
                          textAlign:      'left',
                        }}
                      >
                        {p.nombre}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                          style={{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </button>
                    ) : (
                      <Link href={`/catalogo?categoria=${p.id_categoria}`} onClick={cerrar}
                        className="cat-menu-item"
                        style={{
                          display:        'block',
                          padding:        '0.6rem 1rem',
                          fontSize:       '0.82rem',
                          fontWeight:      600,
                          color:          'var(--color-txt-2)',
                          textDecoration: 'none',
                        }}
                      >
                        {p.nombre}
                      </Link>
                    )}

                    {tieneHijos && abierto && (
                      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-surface-deep)' }}>
                        <Link href={`/catalogo?categoria=${p.id_categoria}`} onClick={cerrar}
                          className="cat-menu-subitem"
                          style={{ padding: '0.5rem 1rem 0.5rem 1.75rem', fontSize: '0.78rem', fontWeight: 600,
                                   color: 'var(--color-primary)', textDecoration: 'none' }}>
                          Ver todo en {p.nombre}
                        </Link>
                        {hijos.map(h => (
                          <Link key={h.id_categoria} href={`/catalogo?categoria=${h.id_categoria}`} onClick={cerrar}
                            className="cat-menu-subitem"
                            style={{ padding: '0.5rem 1rem 0.5rem 1.75rem', fontSize: '0.78rem',
                                     color: 'var(--color-muted)', textDecoration: 'none' }}>
                            {h.nombre}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </>
      )}

      <style>{`
        .cat-trigger:hover     { filter: brightness(0.92); }
        .cat-menu-item:hover   { background: var(--color-surface-deep) !important; color: var(--color-txt) !important; }
        .cat-menu-subitem:hover{ color: var(--color-txt) !important; }
        @keyframes catPanelIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
