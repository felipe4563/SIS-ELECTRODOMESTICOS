import type { Metadata } from 'next';
import Image from 'next/image';
import { api, imgUrl, fmtPrecio } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'Combos especiales' };
export const revalidate = 60;

export default async function CombosPage() {
  const [empresaRes, combosRes] = await Promise.allSettled([api.empresa(), api.combos()]);

  const empresa = empresaRes.status === 'fulfilled' ? empresaRes.value           : null;
  const combos  = combosRes.status  === 'fulfilled' ? combosRes.value.combos     : [];

  return (
    <>
      <Navbar empresa={empresa} />
      <main style={{ flex: 1 }}>
        {/* Header */}
        <div className="combo-header" style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)', padding: '2.5rem 0' }}>
          <div className="container-max">
            <p className="section-label">Bundles</p>
            <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.2rem)', letterSpacing: '-0.02em' }}>
              Combos <span style={{ color: 'var(--color-primary)' }}>Especiales</span>
            </h1>
          </div>
        </div>

        <div className="container-max" style={{ padding: '3rem 1.5rem' }}>
          {combos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0',
                          background: 'var(--color-card)', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📦</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-txt)', marginBottom: 6 }}>Sin combos disponibles</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>Pronto habrá paquetes exclusivos.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
              {combos.map((combo, i) => (
                <div key={i} style={{
                  background:   'var(--color-card)',
                  border:       '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  overflow:     'hidden',
                  transition:   'border-color 0.2s, box-shadow 0.2s',
                }} className="cat-card">
                  {combo.imagen_url ? (
                    <div style={{ position: 'relative', width: '100%', height: 180, background: 'var(--color-img-bg)' }}>
                      <Image src={imgUrl(combo.imagen_url)} alt={combo.nombre} fill style={{ objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ height: 140, background: 'var(--combo-placeholder-bg)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                      📦
                    </div>
                  )}
                  <div style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1.05rem',
                                 marginBottom: 8, color: 'var(--color-txt)' }}>
                      {combo.nombre}
                    </h2>
                    {combo.descripcion && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: 1.65, marginBottom: 14 }}>
                        {combo.descripcion}
                      </p>
                    )}

                    {combo.productos.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                                    color: 'var(--color-muted)', marginBottom: 10 }}>
                          Incluye
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {combo.productos.map((prod, j) => (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {prod.imagen_url && (
                                <Image src={imgUrl(prod.imagen_url)} alt={prod.producto} width={36} height={36}
                                  style={{ objectFit: 'contain', borderRadius: 'var(--radius-sm)',
                                           background: 'var(--color-img-bg)', padding: 4, border: '1px solid var(--color-border)' }} />
                              )}
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-txt-2)' }}>{prod.producto}</p>
                                <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                                  x{prod.cantidad} · {fmtPrecio(prod.precio_publico)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                      <div>
                        <p style={{ fontSize: '0.62rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                          Precio combo
                        </p>
                        <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--color-primary)' }}>
                          {fmtPrecio(combo.precio_combo)}
                        </p>
                      </div>
                      {combo.fecha_fin && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 4px #f59e0b' }} />
                          <p style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600, textAlign: 'right', lineHeight: 1.4 }}>
                            Hasta<br />{new Date(combo.fecha_fin).toLocaleDateString('es-BO')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer empresa={empresa} />
      <style>{`
        .cat-card:hover { border-color: rgba(225,29,72,0.35) !important; box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
        @media (max-width: 480px) {
          .combo-header { padding: 2rem 0 !important; }
        }
      `}</style>
    </>
  );
}
