import Link from 'next/link';
import type { Empresa } from '@/lib/api';

export default function Footer({ empresa }: { empresa?: Empresa | null }) {
  const nombre = empresa?.nombre_comercial ?? empresa?.razon_social ?? 'Mega Electra';
  const year   = new Date().getFullYear();

  return (
    <footer style={{ background: 'var(--color-surface-deep)', borderTop: '1px solid var(--color-border)', marginTop: 'auto' }}>
      <div className="container-max footer-inner">

        <div className="footer-grid">

          {/* Brand */}
          <div className="footer-brand">
            <p style={{
              fontFamily:    'var(--font-headline)',
              fontWeight:     800,
              fontSize:      '1.1rem',
              color:          '#fff',
              marginBottom:   12,
              letterSpacing: '-0.01em',
            }}>
              {nombre}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', lineHeight: 1.65, marginBottom: 12 }}>
              Tu tienda de confianza en electrodomésticos. Encontrá las mejores marcas con garantía y atención personalizada.
            </p>
            {empresa?.email && (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{empresa.email}</p>
            )}
            {empresa?.telefono && (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: 4 }}>
                Tel: {empresa.telefono}
              </p>
            )}
            {empresa?.direccion && (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: 4 }}>{empresa.direccion}</p>
            )}
          </div>

          {/* Navegación */}
          <div>
            <p className="footer-section-label">Navegación</p>
            <Link href="/catalogo"    className="fl">Catálogo completo</Link>
            <Link href="/promociones" className="fl" style={{ color: 'var(--color-primary)' }}>Ofertas activas</Link>
            <Link href="/combos"      className="fl">Combos especiales</Link>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <span>© {year} {nombre}. Tu tienda de electrodomésticos.</span>
        </div>

      </div>

      <style>{`
        .footer-inner {
          padding: 3rem 1.5rem 2rem;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2.5rem;
          margin-bottom: 2.5rem;
        }
        .footer-brand {
          max-width: 340px;
        }
        .footer-section-label {
          font-weight: 600;
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-muted);
          margin-bottom: 14px;
        }
        .fl {
          color: var(--color-muted);
          text-decoration: none;
          display: block;
          font-size: 0.83rem;
          margin-bottom: 8px;
          transition: color 0.15s;
        }
        .fl:hover { color: #fff; }
        .footer-bottom {
          border-top: 1px solid var(--color-border);
          padding-top: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--color-muted);
        }
        @media (max-width: 600px) {
          .footer-inner { padding: 2rem 1rem 1.5rem; }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 1.75rem;
            margin-bottom: 1.75rem;
          }
          .footer-brand { max-width: 100%; }
          .footer-bottom { flex-direction: column; align-items: flex-start; gap: 4px; }
        }
      `}</style>
    </footer>
  );
}
