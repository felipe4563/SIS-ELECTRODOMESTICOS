'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import type { Categoria } from '@/lib/api';

interface Props {
  categorias: Categoria[];
}

export default function CategoriasMenu({ categorias }: Props) {
  const [open, setOpen]           = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  if (categorias.length === 0) return null;

  const padres  = categorias.filter(c => !c.id_categoria_padre);
  const hijosDe = (idPadre: number) => categorias.filter(c => c.id_categoria_padre === idPadre);

  const cerrar = () => { setOpen(false); setExpandido(null); };

  // Mide la posición real de la fila (tomando en cuenta el scroll del panel)
  // para anclar el flyout justo a su altura, en vez de calcularlo a ciegas.
  const activar = (id: number, el: HTMLElement) => {
    const panelRect = panelRef.current?.getBoundingClientRect();
    const rowRect   = el.getBoundingClientRect();
    if (panelRect) setFlyoutTop(rowRect.top - panelRect.top);
    setExpandido(id);
  };

  const hijosExpandido = expandido ? hijosDe(expandido) : [];
  const padreExpandido = padres.find(p => p.id_categoria === expandido);

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

          {/* Panel anclado debajo del botón — solo la lista, con su propio
              scroll vertical; el flyout de subcategorías vive AFUERA de
              este contenedor (ver más abajo) para que el overflow del
              scroll no lo recorte ni lo empuje de lugar. */}
          <div ref={panelRef} style={{
            position:      'absolute',
            top:           'calc(100% + 8px)',
            left:           0,
            zIndex:         80,
            width:          280,
            maxHeight:      420,
            overflowY:      'auto',
            overflowX:      'hidden',
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
                return tieneHijos ? (
                  <button
                    key={p.id_categoria}
                    onClick={(e) => abierto ? setExpandido(null) : activar(p.id_categoria, e.currentTarget)}
                    onMouseEnter={(e) => activar(p.id_categoria, e.currentTarget)}
                    className="cat-menu-item"
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      width:          '100%',
                      padding:        '0.6rem 1rem',
                      background:     abierto ? 'var(--color-surface-deep)' : 'none',
                      color:          abierto ? 'var(--color-primary)' : 'var(--color-txt-2)',
                      border:          'none',
                      cursor:         'pointer',
                      fontSize:       '0.82rem',
                      fontWeight:      600,
                      textAlign:      'left',
                    }}
                  >
                    {p.nombre}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                ) : (
                  <Link key={p.id_categoria} href={`/catalogo?categoria=${p.id_categoria}`} onClick={cerrar}
                    onMouseEnter={() => setExpandido(null)}
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
                );
              })}
            </nav>
          </div>

          {/* Flyout de subcategorías — panel aparte, al costado del panel
              principal, anclado a la altura real de la fila activa. */}
          {padreExpandido && (
            <div style={{
              position:     'absolute',
              top:          `calc(100% + 8px + ${flyoutTop}px)`,
              left:         280 + 8,
              zIndex:        81,
              width:         240,
              maxHeight:     320,
              overflowY:     'auto',
              background:   'var(--color-card)',
              border:       '1px solid var(--color-border)',
              borderTop:    '2px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow:    '0 12px 32px rgba(0,0,0,0.25)',
              animation:    'catPanelIn 0.15s ease',
              display:      'flex',
              flexDirection:'column',
              padding:      '0.4rem 0',
            }}>
              <Link href={`/catalogo?categoria=${padreExpandido.id_categoria}`} onClick={cerrar}
                className="cat-menu-subitem"
                style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: 700,
                         color: 'var(--color-primary)', textDecoration: 'none' }}>
                Ver todo en {padreExpandido.nombre}
              </Link>
              {hijosExpandido.map(h => (
                <Link key={h.id_categoria} href={`/catalogo?categoria=${h.id_categoria}`} onClick={cerrar}
                  className="cat-menu-subitem"
                  style={{ padding: '0.6rem 1rem', fontSize: '0.8rem',
                           color: 'var(--color-txt-2)', textDecoration: 'none' }}>
                  {h.nombre}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        .cat-trigger:hover     { filter: brightness(0.92); }
        .cat-menu-item:hover   { background: var(--color-surface-deep) !important; color: var(--color-txt) !important; }
        .cat-menu-subitem:hover{ background: var(--color-surface-deep) !important; color: var(--color-txt) !important; }
        @keyframes catPanelIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
