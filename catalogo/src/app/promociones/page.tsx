import type { Metadata } from 'next';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'Promociones y ofertas' };
export const revalidate = 60;

export default async function PromocionesPage() {
  const [empresaRes, promocionesRes] = await Promise.allSettled([api.empresa(), api.promociones()]);

  const empresa    = empresaRes.status    === 'fulfilled' ? empresaRes.value                 : null;
  const promociones= promocionesRes.status=== 'fulfilled' ? promocionesRes.value.promociones : [];

  return (
    <>
      <Navbar empresa={empresa} />
      <main style={{ flex: 1 }}>
        {/* Header */}
        <div className="promo-header" style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)', padding: '2.5rem 0' }}>
          <div className="container-max">
            <p className="section-label">Vigentes ahora</p>
            <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.2rem)', letterSpacing: '-0.02em' }}>
              Ofertas y <span style={{ color: 'var(--color-primary)' }}>Promociones</span>
            </h1>
          </div>
        </div>

        <div className="container-max" style={{ padding: '3rem 1.5rem' }}>
          {promociones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0',
                          background: 'var(--color-card)', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏷️</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                Sin promociones activas
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>Vuelve pronto para ver nuevas ofertas.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
              {promociones.map((promo, i) => (
                <div key={i} style={{
                  background:   'var(--color-card)',
                  border:       '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding:      '1.75rem',
                  borderTop:    '3px solid var(--color-primary)',
                  transition:   'border-color 0.2s, box-shadow 0.2s',
                }} className="cat-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3, color: '#fff' }}>
                      {promo.nombre}
                    </h2>
                    <span className="badge badge-oferta" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {promo.tipo_descuento === 'PORCENTAJE' ? `${promo.valor_descuento}% OFF` : `Bs ${promo.valor_descuento} OFF`}
                    </span>
                  </div>
                  {promo.descripcion && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', lineHeight: 1.65, marginBottom: 12 }}>
                      {promo.descripcion}
                    </p>
                  )}
                  {promo.aplica_a && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 8 }}>
                      Aplica a:{' '}
                      <span style={{ color: 'var(--color-txt-2)', fontWeight: 600 }}>
                        {promo.aplica_a === 'TODOS' ? 'Todos los productos' : promo.aplica_a}
                      </span>
                    </p>
                  )}
                  {promo.fecha_fin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
                                  paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
                      <p style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600, letterSpacing: '0.04em' }}>
                        Válido hasta {new Date(promo.fecha_fin).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer empresa={empresa} />
      <style>{`
        .cat-card:hover { border-color: rgba(225,29,72,0.4) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
        @media (max-width: 480px) {
          .promo-header { padding: 2rem 0 !important; }
        }
      `}</style>
    </>
  );
}
