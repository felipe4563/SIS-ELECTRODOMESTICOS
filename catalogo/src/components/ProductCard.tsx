'use client';
import Link from 'next/link';
import Image from 'next/image';
import type { Producto } from '@/lib/api';
import { imgUrl, fmtPrecio } from '@/lib/api';

export default function ProductCard({ p, showPrice = true }: { p: Producto; showPrice?: boolean }) {
  const img    = imgUrl(p.imagen_url);
  const agotado = !p.disponible;

  return (
    <Link href={`/producto/${p.codigo_interno}`} style={{ textDecoration: 'none', display: 'block' }}>
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
          position:   'relative',
          width:      '100%',
          aspectRatio: '4/3',
          background: '#0d0f14',
          overflow:   'hidden',
        }}>
          {/* Badge */}
          {agotado ? (
            <span className="badge badge-sin-stock" style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
              Sin stock
            </span>
          ) : p.stock_total <= 5 ? (
            <span className="badge badge-limitado" style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
              Stock limitado
            </span>
          ) : (
            <span className="badge badge-nuevo" style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
              Disponible
            </span>
          )}

          <Image
            src={img}
            alt={p.producto}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            style={{
              objectFit: 'contain',
              padding:   '1rem',
              filter:     agotado ? 'grayscale(0.6) brightness(0.7)' : 'none',
              transition: 'transform 0.4s',
            }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
          />
        </div>

        {/* Info */}
        <div style={{ padding: '1rem 1rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {p.marca && (
            <p style={{
              fontSize:      '0.65rem',
              fontWeight:     700,
              color:         'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom:   4,
            }}>
              {p.marca}
            </p>
          )}
          <h3 style={{
            fontFamily:          'var(--font-headline)',
            fontWeight:           600,
            fontSize:            '0.9rem',
            color:               'var(--color-txt)',
            marginBottom:         4,
            lineHeight:           1.4,
            display:             '-webkit-box',
            WebkitLineClamp:      2,
            WebkitBoxOrient:     'vertical',
            overflow:            'hidden',
            flex:                 1,
          }}>
            {p.producto}
          </h3>
          {p.modelo && (
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: 10 }}>
              {p.modelo}{p.color ? ` · ${p.color}` : ''}
            </p>
          )}

          {showPrice && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', marginBottom: 12 }}>
              <p style={{
                fontFamily: 'var(--font-headline)',
                fontWeight:  700,
                fontSize:   '1.05rem',
                color:       agotado ? 'var(--color-muted)' : '#fff',
              }}>
                {fmtPrecio(p.precio_publico)}
              </p>
            </div>
          )}

          <div style={{
            width:          '100%',
            padding:        '0.55rem',
            background:     agotado ? 'rgba(107,114,128,0.2)' : 'var(--color-primary)',
            color:          '#fff',
            fontSize:       '0.7rem',
            fontWeight:      700,
            letterSpacing:  '0.08em',
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
        .product-card:hover { border-color: rgba(225,29,72,0.3); box-shadow: 0 8px 32px rgba(0,0,0,0.5); transform: translateY(-4px); }
        .product-card:hover .card-btn { background: #b80035; }
      `}</style>
    </Link>
  );
}
