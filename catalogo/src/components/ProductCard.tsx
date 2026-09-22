'use client';
import Link from 'next/link';
import Image from 'next/image';
import type { Producto } from '@/lib/api';
import { imgUrl, fmtPrecio } from '@/lib/api';

export default function ProductCard({ p, showPrice = true }: { p: Producto; showPrice?: boolean }) {
  const img    = imgUrl(p.imagen_url);
  const agotado = !p.disponible;

  return (
    <Link href={`/producto/${encodeURIComponent(p.codigo_interno)}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article style={{
        background:    'var(--color-card)',
        border:        '1px solid var(--color-border)',
        borderRadius:  'var(--radius-md)',
        overflow:      'hidden',
        position:      'relative',
        transition:    'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        display:       'flex',
        flexDirection: 'column',
      }} className="product-card">

        {/* Image */}
        <div style={{
          position:    'relative',
          width:       '100%',
          aspectRatio: '1/1',
          background:  'var(--color-card-2)',
          overflow:    'hidden',
          borderBottom: '1px solid var(--color-border)',
        }}>

          <Image
            src={img}
            alt={p.producto}
            fill
            loading="eager"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 18vw"
            style={{
              objectFit: 'contain',
              padding:   '0.65rem',
              filter:     agotado ? 'grayscale(0.6) brightness(0.7)' : 'none',
              transition: 'transform 0.4s',
            }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
          />
        </div>

        {/* Info */}
        <div style={{ padding: '0.7rem 0.75rem 0.8rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {p.marca && (
            <p style={{
              fontSize:      '0.6rem',
              fontWeight:     700,
              color:         'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom:   3,
            }}>
              {p.marca}
            </p>
          )}
          <h3 style={{
            fontFamily:          'var(--font-headline)',
            fontWeight:           600,
            fontSize:            '0.8rem',
            color:               'var(--color-txt)',
            marginBottom:         3,
            lineHeight:           1.35,
            display:             '-webkit-box',
            WebkitLineClamp:      2,
            WebkitBoxOrient:     'vertical',
            overflow:            'hidden',
            flex:                 1,
          }}>
            {p.producto}
          </h3>
          {p.modelo && (
            <p style={{
              fontSize: '0.66rem', color: 'var(--color-muted)', marginBottom: 8,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {p.modelo}{p.color ? ` · ${p.color}` : ''}
            </p>
          )}

          {showPrice && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', marginBottom: 9 }}>
              <p style={{
                fontFamily: 'var(--font-headline)',
                fontWeight:  700,
                fontSize:   '0.92rem',
                color:       agotado ? 'var(--color-muted)' : 'var(--color-txt)',
              }}>
                {fmtPrecio(p.precio_publico)}
              </p>
            </div>
          )}

          <div style={{
            width:          '100%',
            padding:        '0.45rem',
            background:     agotado ? 'rgba(107,114,128,0.2)' : 'var(--color-primary)',
            color:          '#fff',
            fontSize:       '0.64rem',
            fontWeight:      700,
            letterSpacing:  '0.07em',
            textTransform:  'uppercase',
            textAlign:      'center',
            borderRadius:   'var(--radius-sm)',
            transition:     'background 0.2s',
          }} className="card-btn">
            {agotado ? 'Sin stock' : 'Adquirir'}
          </div>
        </div>
      </article>

      <style>{`
        .product-card:hover { border-color: rgba(225,29,72,0.3); box-shadow: var(--shadow-hover-card); transform: translateY(-4px); }
        .product-card:hover .card-btn { background: #b80035; }
      `}</style>
    </Link>
  );
}
