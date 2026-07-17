'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Producto } from '@/lib/api';
import { imgUrl } from '@/lib/api';

interface Props {
  productos: Producto[];
  telefono?: string | null;
}

function CardSelectable({
  p,
  selected,
  onToggle,
}: {
  p: Producto;
  selected: boolean;
  onToggle: (p: Producto) => void;
}) {
  const agotado = !p.disponible;
  const img = imgUrl(p.imagen_url);

  return (
    <article
      style={{
        background:    selected ? 'rgba(225,29,72,0.06)' : 'var(--color-card)',
        border:        `1px solid ${selected ? 'rgba(225,29,72,0.55)' : 'var(--color-border)'}`,
        borderRadius:  'var(--radius-md)',
        overflow:      'hidden',
        position:      'relative',
        transition:    'border-color 0.2s, box-shadow 0.2s, background 0.2s',
        display:       'flex',
        flexDirection: 'column',
        cursor:        'pointer',
        boxShadow:     selected ? '0 0 0 2px rgba(225,29,72,0.2)' : 'none',
      }}
      onClick={() => onToggle(p)}
    >
      {/* Checkbox top-right */}
      <span style={{
        position:       'absolute',
        top:             10,
        right:           10,
        zIndex:          3,
        width:           20,
        height:          20,
        borderRadius:   '4px',
        border:         `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border-2)'}`,
        background:      selected ? 'var(--color-primary)' : 'var(--color-card)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        transition:     'all 0.15s',
      }}>
        {selected && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5">
            <polyline points="2,6 5,9 10,3" />
          </svg>
        )}
      </span>

      {/* Image */}
      <div style={{
        position:    'relative',
        width:       '100%',
        aspectRatio: '4/3',
        background:  'var(--color-card-2)',
        overflow:    'hidden',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <Image
          src={img}
          alt={p.producto}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          style={{
            objectFit: 'contain',
            padding:   '1rem',
            filter:     'none',
          }}
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
        />
      </div>

      {/* Info */}
      <div style={{ padding: '0.9rem 1rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {p.marca && (
          <p style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--color-primary)',
                      textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {p.marca}
          </p>
        )}
        <h3 style={{
          fontFamily:      'var(--font-headline)',
          fontWeight:       600,
          fontSize:        '0.88rem',
          color:           'var(--color-txt)',
          lineHeight:       1.35,
          display:         '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow:        'hidden',
          flex:             1,
        }}>
          {p.producto}
        </h3>

        {/* Tags: modelo, color, categoría */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {p.modelo && (
            <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)',
                           background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                           borderRadius: '3px', padding: '1px 6px' }}>
              {p.modelo}
            </span>
          )}
          {p.color && (
            <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)',
                           background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                           borderRadius: '3px', padding: '1px 6px' }}>
              {p.color}
            </span>
          )}
          {p.capacidad && (
            <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)',
                           background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                           borderRadius: '3px', padding: '1px 6px' }}>
              {p.capacidad}
            </span>
          )}
        </div>

        {/* Botón */}
        <div style={{
          marginTop:      8,
          width:          '100%',
          padding:        '0.5rem',
          background:     selected ? 'rgba(225,29,72,0.2)' : 'rgba(225,29,72,0.1)',
          border:         `1px solid ${selected ? 'rgba(225,29,72,0.5)' : 'rgba(225,29,72,0.25)'}`,
          color:          selected ? '#fff' : 'var(--color-primary)',
          fontSize:       '0.68rem',
          fontWeight:      700,
          letterSpacing:  '0.07em',
          textTransform:  'uppercase',
          textAlign:      'center',
          borderRadius:   'var(--radius-sm)',
          transition:     'all 0.15s',
          userSelect:     'none',
        }}>
          {selected ? '✓ Agregado a cotizar' : '+ Agregar a cotizar'}
        </div>

        {/* Ver detalle botón */}
        <Link
          href={`/producto/${p.codigo_interno}`}
          onClick={e => e.stopPropagation()}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:             5,
            marginTop:       6,
            width:          '100%',
            padding:        '0.45rem',
            border:         '1px solid var(--color-border)',
            borderRadius:   'var(--radius-sm)',
            background:     'transparent',
            color:          'var(--color-muted)',
            fontSize:       '0.68rem',
            fontWeight:      600,
            letterSpacing:  '0.05em',
            textTransform:  'uppercase',
            textDecoration: 'none',
            transition:     'border-color 0.15s, color 0.15s',
          }}
          className="ver-detalle-btn"
        >
          Ver detalle
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </article>
  );
}

export default function CatalogoClient({ productos, telefono }: Props) {
  const [seleccionados, setSeleccionados] = useState<Producto[]>([]);

  const toggle = (p: Producto) => {
    setSeleccionados(prev => {
      const existe = prev.find(x => x.id_producto === p.id_producto);
      if (existe) return prev.filter(x => x.id_producto !== p.id_producto);
      if (prev.length >= 10) return prev;
      return [...prev, p];
    });
  };

  const cotizarWhatsApp = () => {
    if (!telefono || seleccionados.length === 0) return;

    const lista = seleccionados
      .map((p, i) => {
        let linea = `${i + 1}. *${p.producto}*`;
        if (p.modelo)   linea += ` — Modelo: ${p.modelo}`;
        if (p.color)    linea += ` — Color: ${p.color}`;
        if (p.capacidad) linea += ` — ${p.capacidad}`;
        return linea;
      })
      .join('\n');

    const texto =
      `Hola! 👋 Me gustaría cotizar los siguientes productos:\n\n${lista}\n\n¿Me puede indicar precios y disponibilidad? ¡Gracias!`;

    let phone = telefono.replace(/\D/g, '');
    if (!phone.startsWith('591')) phone = '591' + phone;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  if (productos.length === 0) {
    return (
      <div style={{
        textAlign:   'center',
        padding:     '5rem 2rem',
        background:  'var(--color-card)',
        border:      '1px solid var(--color-border)',
        borderRadius:'var(--radius-md)',
      }}>
        <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</p>
        <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1.1rem',
                    marginBottom: 8, color: 'var(--color-txt)' }}>
          Sin resultados
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
          No se encontraron productos con esos filtros.
        </p>
        <a href="/catalogo" className="btn-primary">Ver todos los productos</a>
      </div>
    );
  }

  return (
    <>
      <div className="productos-grid" style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))',
        gap:                 '1rem',
        paddingBottom:        seleccionados.length > 0 ? '5rem' : 0,
      }}>
        {productos.map(p => (
          <CardSelectable
            key={p.id_producto}
            p={p}
            selected={!!seleccionados.find(x => x.id_producto === p.id_producto)}
            onToggle={toggle}
          />
        ))}
      </div>

      {/* ── Barra de cotización flotante ── */}
      {seleccionados.length > 0 && (
        <div className="cotizar-bar" style={{
          position:   'fixed',
          bottom:      0,
          left:        0,
          right:       0,
          zIndex:      200,
          background: 'var(--color-surface-deep)',
          borderTop:  '1px solid rgba(225,29,72,0.4)',
          padding:    '0.85rem 1.5rem',
          display:    'flex',
          alignItems: 'center',
          gap:         12,
          boxShadow:  '0 -12px 40px rgba(0,0,0,0.7)',
        }}>
          {/* Chips */}
          <div className="cotizar-chips" style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap', overflow: 'hidden', minWidth: 0 }}>
            {seleccionados.map(p => (
              <span key={p.id_producto} style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:           5,
                background:   'rgba(225,29,72,0.12)',
                border:       '1px solid rgba(225,29,72,0.3)',
                borderRadius: '4px',
                padding:      '0.2rem 0.55rem',
                fontSize:     '0.7rem',
                color:        'var(--color-txt)',
                maxWidth:      180,
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
                flexShrink:    0,
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.producto}
                </span>
                <button
                  onClick={() => toggle(p)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                    padding: '0 2px', lineHeight: 1, fontSize: '1rem', flexShrink: 0,
                  }}
                  aria-label="Quitar"
                >×</button>
              </span>
            ))}
          </div>

          {/* Acciones */}
          <div className="cotizar-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span className="cotizar-count" style={{ fontSize: '0.72rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
              {seleccionados.length} seleccionado{seleccionados.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setSeleccionados([])}
              style={{
                background:   'none',
                border:       '1px solid var(--color-border)',
                borderRadius: '4px',
                padding:      '0.45rem 0.9rem',
                fontSize:     '0.7rem',
                color:        'var(--color-muted)',
                cursor:       'pointer',
                whiteSpace:   'nowrap',
              }}
            >
              Limpiar
            </button>
            <button
              onClick={cotizarWhatsApp}
              disabled={!telefono}
              style={{
                background:    '#25D366',
                border:        'none',
                borderRadius:  '4px',
                padding:       '0.55rem 1.1rem',
                fontSize:      '0.78rem',
                fontWeight:     700,
                letterSpacing: '0.03em',
                color:         '#fff',
                cursor:         telefono ? 'pointer' : 'not-allowed',
                display:       'flex',
                alignItems:    'center',
                gap:            7,
                whiteSpace:    'nowrap',
                opacity:        telefono ? 1 : 0.5,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="cotizar-label">Cotizar por WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .ver-detalle-btn:hover { border-color: var(--color-primary) !important; color: var(--color-primary) !important; }

        /* ── Grid de productos responsivo ── */
        @media (max-width: 860px) {
          /* tablet: cuando sidebar desaparece, el grid ocupa todo el ancho */
          .productos-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)) !important; }
        }
        @media (max-width: 500px) {
          /* móvil pequeño: 2 columnas fijas */
          .productos-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 0.6rem !important; }
        }
        @media (max-width: 340px) {
          /* pantallas muy angostas: 1 columna */
          .productos-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 500px) {
          /* cards más compactas en móvil */
          .productos-grid article > div:last-child { padding: 0.6rem 0.65rem 0.75rem !important; }
        }

        /* ── Barra cotizar móvil ── */
        @media (max-width: 600px) {
          .cotizar-bar {
            flex-direction: column !important;
            align-items:    stretch !important;
            padding:        0.75rem 1rem !important;
            gap:            8px !important;
          }
          .cotizar-chips {
            max-height:   72px;
            overflow-y:   auto;
            padding-right: 2px;
          }
          .cotizar-actions {
            justify-content: flex-end;
            width: 100%;
          }
          .cotizar-count { display: none !important; }
          .cotizar-label { display: none !important; }
        }
      `}</style>
    </>
  );
}
