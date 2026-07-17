import Link from 'next/link';
import Image from 'next/image';
import { api, imgUrl, fmtPrecio } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';

export const revalidate = 60;


export default async function HomePage() {
  const [empresaRes, categoriasRes, productosRes, promocionesRes, combosRes] = await Promise.allSettled([
    api.empresa(),
    api.categorias(),
    api.productos({ limit: 8, orden: 'nuevo' }),
    api.promociones(),
    api.combos(),
  ]);

  const empresa     = empresaRes.status     === 'fulfilled' ? empresaRes.value                 : null;
  const categorias  = categoriasRes.status  === 'fulfilled' ? categoriasRes.value.categorias   : [];
  const productos   = productosRes.status   === 'fulfilled' ? productosRes.value.productos     : [];
  const promociones = promocionesRes.status === 'fulfilled' ? promocionesRes.value.promociones : [];
  const combos      = combosRes.status      === 'fulfilled' ? combosRes.value.combos           : [];

  return (
    <>
      <Navbar empresa={empresa} />
      <main style={{ flex: 1 }}>

        {/* ── Hero ──────────────────────────────────── */}
        <section style={{
          position:   'relative',
          overflow:   'hidden',
          background: 'var(--hero-bg)',
          minHeight:  '70vh',
          display:    'flex',
          alignItems: 'center',
        }}>
          {/* Glow */}
          <div style={{
            position:   'absolute',
            top:         '-20%',
            right:       '-10%',
            width:        600,
            height:       600,
            borderRadius:'50%',
            background:  'radial-gradient(ellipse, rgba(225,29,72,0.18) 0%, transparent 70%)',
            pointerEvents:'none',
          }} />
          <div style={{
            position:   'absolute',
            bottom:      '-10%',
            left:         '30%',
            width:         400,
            height:        400,
            borderRadius: '50%',
            background:  'radial-gradient(ellipse, rgba(225,29,72,0.08) 0%, transparent 70%)',
            pointerEvents:'none',
          }} />

          {/* Grid lines */}
          <div style={{
            position:        'absolute',
            inset:            0,
            backgroundImage: 'linear-gradient(rgba(225,29,72,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(225,29,72,0.04) 1px, transparent 1px)',
            backgroundSize:  '60px 60px',
            pointerEvents:   'none',
          }} />

          <div className="container-max" style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem 5rem' }}>
            <div style={{ maxWidth: 620 }}>
              <span className="tag" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
                ◈ Nueva Generación
              </span>
              <h1 style={{
                fontFamily:    'var(--font-headline)',
                fontWeight:     900,
                lineHeight:     1.05,
                fontSize:      'clamp(2.4rem, 6vw, 4rem)',
                marginBottom:  '1.5rem',
                letterSpacing: '-0.03em',
                color:          '#fff',
              }}>
                El Futuro<br />
                <span style={{ color: 'var(--color-primary)' }}>en tu Hogar</span>
              </h1>
              <p style={{
                fontSize:    '1rem',
                color:       'var(--color-txt-2)',
                lineHeight:   1.7,
                marginBottom:'2rem',
                maxWidth:     520,
              }}>
                Refrigeradoras, cocinas, lavadoras y mucho más. Las mejores marcas del mercado
                con garantía, stock disponible y asesoramiento personalizado.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/catalogo" className="btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '0.85rem' }}>
                  Explorar Catálogo
                </Link>
                {promociones.length > 0 && (
                  <Link href="/promociones" className="btn-outline" style={{ padding: '0.8rem 2rem', fontSize: '0.85rem' }}>
                    Ver Ofertas
                  </Link>
                )}
              </div>

              {/* Status indicators */}
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Sistema', value: 'Online', ok: true },
                  { label: 'Productos', value: `${productos.length}+` },
                  { label: 'Categorías', value: `${categorias.length}` },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width:        6,
                      height:       6,
                      borderRadius: '50%',
                      background:   s.ok ? '#22c55e' : 'var(--color-primary)',
                      boxShadow:    s.ok ? '0 0 6px #22c55e' : '0 0 6px var(--color-primary)',
                      flexShrink:   0,
                    }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {s.label}: <span style={{ color: 'var(--color-txt)', fontWeight: 600 }}>{s.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Categorías Elite ──────────────────────── */}
        {categorias.length > 0 && (
          <section style={{ padding: '4.5rem 0', background: 'var(--color-bg)' }}>
            <div className="container-max">
              <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <p className="section-label">Explorar</p>
                  <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.02em' }}>
                    Categorías Elite
                  </h2>
                </div>
                <Link href="/catalogo" style={{
                  fontSize:       '0.78rem',
                  fontWeight:      600,
                  letterSpacing:  '0.06em',
                  textTransform:  'uppercase',
                  color:          'var(--color-muted)',
                  textDecoration: 'none',
                  transition:     'color 0.15s',
                }} className="nav-link">
                  Ver todo →
                </Link>
              </div>

              <div style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap:                 '1rem',
              }}>
                {categorias.filter(c => c.total_productos > 0).slice(0, 8).map(cat => (
                  <Link key={cat.id_categoria} href={`/catalogo?categoria=${cat.id_categoria}`}
                    style={{ textDecoration: 'none' }}>
                    <div style={{
                      background:    'var(--color-card)',
                      border:        '1px solid var(--color-border)',
                      borderRadius:  'var(--radius-md)',
                      padding:       '1.5rem 1rem',
                      textAlign:     'center',
                      transition:    'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                      cursor:        'pointer',
                    }} className="cat-card">
<p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-txt)', marginBottom: 4, letterSpacing: '-0.01em' }}>
                        {cat.nombre}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', letterSpacing: '0.04em' }}>
                        {cat.total_productos} modelos
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <style>{`
              .cat-card:hover {
                border-color: rgba(225,29,72,0.35) !important;
                transform: translateY(-4px);
                box-shadow: 0 12px 32px rgba(0,0,0,0.5);
              }
            `}</style>
          </section>
        )}

        {/* ── Protocolo Premium (últimos productos) ─── */}
        {productos.length > 0 && (
          <section style={{ padding: '4.5rem 0', background: 'var(--color-bg-2)' }}>
            <div className="container-max">
              <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <p className="section-label">Nuevos ingresos</p>
                  <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.02em' }}>
                    Protocolo Premium
                  </h2>
                </div>
                <Link href="/catalogo" style={{
                  fontSize:       '0.78rem',
                  fontWeight:      600,
                  letterSpacing:  '0.06em',
                  textTransform:  'uppercase',
                  color:          'var(--color-muted)',
                  textDecoration: 'none',
                }} className="nav-link">
                  Ver catálogo →
                </Link>
              </div>

              <div style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap:                 '1.1rem',
              }}>
                {productos.map(p => <ProductCard key={p.id_producto} p={p} showPrice={false} />)}
              </div>
            </div>
          </section>
        )}

        {/* ── Combos especiales ─────────────────────── */}
        {combos.length > 0 && (
          <section style={{ padding: '4.5rem 0', background: 'var(--color-bg)' }}>
            <div className="container-max">
              <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <p className="section-label">Bundles</p>
                  <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.02em' }}>
                    Combos Especiales
                  </h2>
                </div>
                <Link href="/combos" style={{
                  fontSize:       '0.78rem',
                  fontWeight:      600,
                  letterSpacing:  '0.06em',
                  textTransform:  'uppercase',
                  color:          'var(--color-muted)',
                  textDecoration: 'none',
                }} className="nav-link">
                  Ver todos →
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.1rem' }}>
                {combos.slice(0, 3).map((combo, i) => (
                  <div key={i} style={{
                    background:   'var(--color-card)',
                    border:       '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow:     'hidden',
                    transition:   'border-color 0.2s, transform 0.2s',
                  }} className="cat-card">
                    {combo.imagen_url ? (
                      <div style={{ position: 'relative', width: '100%', height: 160, background: 'var(--color-img-bg)' }}>
                        <Image src={imgUrl(combo.imagen_url)} alt={combo.nombre} fill style={{ objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ height: 160, background: 'var(--combo-placeholder-bg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '2.5rem' }}>📦</span>
                      </div>
                    )}
                    <div style={{ padding: '1.25rem 1.25rem 1.5rem' }}>
                      <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.95rem',
                                   marginBottom: 6, color: 'var(--color-txt)' }}>{combo.nombre}</h3>
                      {combo.descripcion && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', lineHeight: 1.55, marginBottom: 12 }}>
                          {combo.descripcion}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                          {fmtPrecio(combo.precio_combo)}
                        </p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                          {combo.productos.length} productos
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Únete a la Vanguardia ─────────────────── */}
        <section style={{
          padding:    '5rem 0',
          background: 'var(--cta-bg)',
          position:   'relative',
          overflow:   'hidden',
        }}>
          <div style={{
            position:   'absolute',
            top:        '50%',
            left:       '50%',
            transform:  'translate(-50%, -50%)',
            width:       600,
            height:      300,
            background:  'radial-gradient(ellipse, rgba(225,29,72,0.12) 0%, transparent 70%)',
            pointerEvents:'none',
          }} />
          <div className="container-max" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <p className="section-label" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
              Exclusivo
            </p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
              Únete a la Vanguardia
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-muted)', marginBottom: '2.5rem', maxWidth: 480, marginInline: 'auto', lineHeight: 1.65 }}>
              Recibe notificaciones de nuevos modelos, firmware técnico y ofertas exclusivas.
            </p>
            {empresa?.telefono && (
              <div style={{ marginTop: '2.5rem' }}>
                <a href={`https://wa.me/${empresa.telefono.replace(/\D/g, '')}`}
                  style={{
                    display:       'inline-flex',
                    alignItems:    'center',
                    gap:            8,
                    fontSize:      '0.82rem',
                    color:         'var(--color-muted)',
                    textDecoration:'none',
                    fontWeight:     600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    transition:    'color 0.15s',
                  }} className="nav-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Contactar por WhatsApp
                </a>
              </div>
            )}
          </div>
        </section>

      </main>
      <Footer empresa={empresa} />
    </>
  );
}
