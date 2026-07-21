import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, fmtPrecio } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import GaleriaProducto from '@/components/GaleriaProducto';

export const revalidate = 60;

interface Props { params: Promise<{ codigo: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  try {
    const p = await api.producto(decodeURIComponent(codigo));
    return { title: `${p.producto} — Mega Electra`, description: p.caracteristicas ?? undefined };
  } catch {
    return { title: 'Producto no encontrado' };
  }
}

export default async function ProductoPage({ params }: Props) {
  const { codigo } = await params;
  const codigoDecoded = decodeURIComponent(codigo);
  let producto;
  try { producto = await api.producto(codigoDecoded); }
  catch { notFound(); }

  const agotado = producto.disponibilidad === 'Sin stock';
  // Construir lista de imágenes: preferir producto_imagenes, fallback a imagen_url
  const imagenes = producto.imagenes?.length
    ? producto.imagenes
    : producto.imagen_url
      ? [{ imagen_url: producto.imagen_url, es_principal: 1 }]
      : [];
  const empresa = producto.empresa ?? (await api.empresa().catch(() => null));

  return (
    <>
      <Navbar empresa={empresa} />
      <main style={{ flex: 1 }}>

        {/* Breadcrumb */}
        <div style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)', padding: '0.75rem 0' }}>
          <div className="container-max" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <nav style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.7rem', color: 'var(--color-muted)',
                          letterSpacing: '0.05em', textTransform: 'uppercase', flexWrap: 'wrap' }}>
              <Link href="/" style={{ color: 'var(--color-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                className="nav-link">Inicio</Link>
              <span>/</span>
              <Link href="/catalogo" style={{ color: 'var(--color-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                className="nav-link">Catálogo</Link>
              {producto.categoria && (
                <>
                  <span>/</span>
                  <Link href={`/catalogo?buscar=${encodeURIComponent(producto.categoria)}`}
                    style={{ color: 'var(--color-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                    className="nav-link">{producto.categoria}</Link>
                </>
              )}
              <span>/</span>
              <span style={{ color: 'var(--color-txt)' }}>{producto.producto}</span>
            </nav>
            <BackButton />
          </div>
        </div>

        {/* ── Hero producto ────────────────────────── */}
        <section style={{ padding: '2.5rem 0', background: 'var(--color-bg)' }}>
          <div className="container-max">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}
              className="product-grid">

              {/* Galería de imágenes */}
              <div style={{ position: 'relative' }}>
                {/* Badges sobre la galería */}
                <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {agotado && <span className="badge badge-sin-stock">Sin stock</span>}
                  {!agotado && producto.stock_total <= 5 && <span className="badge badge-limitado">Stock limitado</span>}
                </div>
                <div style={{
                  position:    'absolute',
                  top:          14,
                  right:        14,
                  zIndex:       2,
                  background:  'rgba(225,29,72,0.15)',
                  border:      '1px solid rgba(225,29,72,0.3)',
                  borderRadius:'var(--radius-sm)',
                  padding:     '0.25rem 0.6rem',
                  fontSize:    '0.6rem',
                  fontWeight:   700,
                  letterSpacing:'0.1em',
                  textTransform:'uppercase',
                  color:       'var(--color-primary)',
                }}>
                  {producto.categoria ?? 'Serie X'}
                </div>
                <GaleriaProducto
                  imagenes={imagenes}
                  nombre={producto.producto}
                  agotado={agotado}
                />
              </div>

              {/* Info */}
              <div>
                {/* Marca */}
                {producto.marca && (
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.1em', color: 'var(--color-primary)', marginBottom: 8 }}>
                    {producto.marca}
                  </p>
                )}

                <h1 style={{
                  fontFamily:    'var(--font-headline)',
                  fontWeight:     700,
                  fontSize:      'clamp(1.4rem, 3vw, 1.9rem)',
                  lineHeight:     1.2,
                  letterSpacing: '-0.02em',
                  marginBottom:  '1rem',
                  color:          '#fff',
                }}>
                  {producto.producto}
                </h1>

                {/* Badges spec */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1.5rem' }}>
                  {producto.modelo    && <span className="badge" style={{ background: 'var(--color-card-2)', color: 'var(--color-txt-2)', border: '1px solid var(--color-border)' }}>Mod. {producto.modelo}</span>}
                  {producto.color     && <span className="badge" style={{ background: 'var(--color-card-2)', color: 'var(--color-txt-2)', border: '1px solid var(--color-border)' }}>{producto.color}</span>}
                  {producto.capacidad && <span className="badge" style={{ background: 'var(--color-card-2)', color: 'var(--color-txt-2)', border: '1px solid var(--color-border)' }}>{producto.capacidad}</span>}
                </div>

                {/* Disponibilidad */}
                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width:        8,
                      height:       8,
                      borderRadius: '50%',
                      background:   agotado ? '#ef4444' : producto.disponibilidad === 'Stock limitado' ? '#f59e0b' : '#22c55e',
                      boxShadow:    agotado ? '0 0 6px #ef4444' : producto.disponibilidad === 'Stock limitado' ? '0 0 6px #f59e0b' : '0 0 6px #22c55e',
                      flexShrink:   0,
                    }} />
                    <span style={{
                      fontSize:    '0.78rem',
                      fontWeight:   600,
                      color:        agotado ? '#ef4444' : producto.disponibilidad === 'Stock limitado' ? '#f59e0b' : '#4ade80',
                      letterSpacing:'0.04em',
                    }}>
                      {producto.disponibilidad}
                    </span>
                  </div>
                </div>

                {/* Promociones activas */}
                {producto.promociones.length > 0 && (
                  <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {producto.promociones.map((promo, i) => (
                      <div key={i} style={{
                        padding:     '0.75rem 1rem',
                        background:  'rgba(225,29,72,0.08)',
                        border:      '1px solid rgba(225,29,72,0.25)',
                        borderRadius:'var(--radius-sm)',
                        display:     'flex',
                        alignItems:  'center',
                        gap:          10,
                      }}>
                        <span style={{ fontSize: '1rem' }}>🏷️</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fb7185' }}>{promo.nombre}</p>
                          {promo.descripcion && <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{promo.descripcion}</p>}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                          {promo.tipo_descuento === 'PORCENTAJE' ? `${promo.valor_descuento}% OFF` : `Bs ${promo.valor_descuento} OFF`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTAs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
                  {empresa?.telefono ? (
                    <a href={`https://wa.me/${empresa.telefono.replace(/\D/g, '')}?text=Hola, me interesa: ${producto.producto} (${producto.codigo_interno})`}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '0.85rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      Añadir al carrito / WhatsApp
                    </a>
                  ) : (
                    <button className="btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '0.85rem' }} disabled={agotado}>
                      {agotado ? 'Sin stock' : 'Consultar disponibilidad'}
                    </button>
                  )}
                </div>

                {/* Código interno */}
                <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', letterSpacing: '0.04em' }}>
                  Código:{' '}
                  <code style={{ fontFamily: 'monospace', color: 'var(--color-txt-2)',
                                 background: 'var(--color-card)', padding: '0.1rem 0.4rem',
                                 borderRadius: 'var(--radius-sm)', fontSize: '0.72rem' }}>
                    {producto.codigo_interno}
                  </code>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Specs table ──────────────────────────── */}
        {(producto.modelo || producto.color || producto.capacidad || producto.categoria) && (
          <section style={{ padding: '1rem 0 3rem', background: 'var(--color-bg)' }}>
            <div className="container-max">
              <div style={{
                background:   'var(--color-card)',
                border:       '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow:     'hidden',
              }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 6px var(--color-primary)' }} />
                  <p style={{ fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
                    Especificaciones técnicas
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: 300 }}>
                    <tbody>
                      {[
                        { label: 'Capacidad Total', value: producto.capacidad },
                        { label: 'Modelo',          value: producto.modelo },
                        { label: 'Color',           value: producto.color },
                        { label: 'Categoría',       value: producto.categoria },
                        { label: 'Disponibilidad',  value: producto.disponibilidad },
                      ].filter(r => r.value).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.75rem 1.5rem', color: 'var(--color-muted)', fontWeight: 500,
                                       width: '40%', fontSize: '0.8rem', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                            {row.label}
                          </td>
                          <td style={{ padding: '0.75rem 1.5rem', color: 'var(--color-txt)', fontWeight: 600, fontSize: '0.85rem' }}>
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Future-Ready Capabilities ─────────────── */}
        {(producto.caracteristicas || producto.detalle) && (
          <section style={{ padding: '3rem 0 4rem', background: 'var(--color-bg-2)' }}>
            <div className="container-max">
              <div style={{ marginBottom: '2rem' }}>
                <p className="section-label">Detalles</p>
                <h2 style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
                  Capacidades técnicas
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {producto.caracteristicas && (
                  <div style={{
                    background:   'var(--color-card)',
                    border:       '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding:      '1.5rem',
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)',
                                  background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '1.2rem', marginBottom: '1rem' }}>
                      ⚡
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.95rem',
                                 marginBottom: 10, color: 'var(--color-txt)' }}>Características</h3>
                    <p style={{ fontSize: '0.83rem', color: 'var(--color-muted)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                      {producto.caracteristicas}
                    </p>
                  </div>
                )}
                {producto.detalle && (
                  <div style={{
                    background:   'var(--color-card)',
                    border:       '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding:      '1.5rem',
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)',
                                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '1.2rem', marginBottom: '1rem' }}>
                      🛡
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.95rem',
                                 marginBottom: 10, color: 'var(--color-txt)' }}>Descripción</h3>
                    <p style={{ fontSize: '0.83rem', color: 'var(--color-muted)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                      {producto.detalle}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Complete the Setup (combos) ────────────── */}
        {producto.combos.length > 0 && (
          <section style={{ padding: '3rem 0 4rem', background: 'var(--color-bg)' }}>
            <div className="container-max">
              <div style={{ marginBottom: '2rem' }}>
                <p className="section-label">Complementos</p>
                <h2 style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
                  Complete the Setup
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {producto.combos.map((combo, i) => (
                  <div key={i} style={{
                    background:   'var(--color-card)',
                    border:       '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding:      '1.25rem',
                    transition:   'border-color 0.2s',
                  }} className="cat-card">
                    <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.95rem',
                                 marginBottom: 6, color: 'var(--color-txt)' }}>
                      {combo.nombre}
                    </h3>
                    {combo.descripcion && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 12, lineHeight: 1.55 }}>
                        {combo.descripcion}
                      </p>
                    )}
                    <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1.1rem',
                                color: 'var(--color-primary)' }}>
                      {fmtPrecio(combo.precio_combo)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
      <Footer empresa={empresa} />

      <style>{`
        @media (max-width: 768px) {
          .product-grid { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
        }
        @media (max-width: 480px) {
          .product-grid { gap: 1rem !important; }
        }
        .cat-card:hover { border-color: rgba(225,29,72,0.3) !important; }
      `}</style>
    </>
  );
}
