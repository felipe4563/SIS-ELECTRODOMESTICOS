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

        {/* ── Sistema de animaciones ────────────────── */}
        <style>{`
          @keyframes fadeInUp {
            from { opacity:0; transform:translateY(30px); }
            to   { opacity:1; transform:none; }
          }
          @keyframes fadeInDown {
            from { opacity:0; transform:translateY(-22px); }
            to   { opacity:1; transform:none; }
          }
          @keyframes fadeIn {
            from { opacity:0; }
            to   { opacity:1; }
          }
          @keyframes scaleIn {
            from { opacity:0; transform:scale(0.86) translateY(14px); }
            to   { opacity:1; transform:none; }
          }
          @keyframes glowDrift {
            0%,100% { transform:translateY(0) scale(1); }
            50%     { transform:translateY(-16px) scale(1.06); }
          }

          /* ── Hero entry ── */
          .hero-tag   { animation: fadeInDown 0.55s cubic-bezier(.22,.68,0,1.25) both .05s; }
          .hero-h1    { animation: fadeInUp   0.7s  cubic-bezier(.22,.68,0,1.25) both .15s; }
          .hero-desc  { animation: fadeInUp   0.65s ease both .3s; }
          .hero-btns  { animation: fadeInUp   0.65s ease both .42s; }
          .hero-stats { animation: fadeIn     0.7s  ease both .58s; }

          .hero-appliances > * { animation: scaleIn 0.6s cubic-bezier(.22,.68,0,1.2) both; }
          .hero-appliances > *:nth-child(1) { animation-delay:.18s; }
          .hero-appliances > *:nth-child(2) { animation-delay:.29s; }
          .hero-appliances > *:nth-child(3) { animation-delay:.40s; }
          .hero-appliances > *:nth-child(4) { animation-delay:.51s; }

          .hero-glow-1 { animation: glowDrift  9s ease-in-out infinite; }
          .hero-glow-2 { animation: glowDrift 13s ease-in-out infinite reverse; }

          /* ── Scroll reveal ── */
          [data-scroll] {
            opacity: 0;
            transform: translateY(32px);
            transition: opacity 0.65s ease, transform 0.65s cubic-bezier(.22,.68,0,1.1);
          }
          [data-scroll="left"]  { transform: translateX(-34px); }
          [data-scroll="scale"] { transform: scale(0.92) translateY(20px); }
          [data-scroll].visible { opacity:1; transform:none; }

          [data-delay="1"] { transition-delay:.06s; }
          [data-delay="2"] { transition-delay:.13s; }
          [data-delay="3"] { transition-delay:.20s; }
          [data-delay="4"] { transition-delay:.27s; }
          [data-delay="5"] { transition-delay:.34s; }
          [data-delay="6"] { transition-delay:.41s; }
          [data-delay="7"] { transition-delay:.48s; }
          [data-delay="8"] { transition-delay:.55s; }

          @media (prefers-reduced-motion: reduce) {
            .hero-tag, .hero-h1, .hero-desc, .hero-btns, .hero-stats,
            .hero-appliances > *, .hero-glow-1, .hero-glow-2, [data-scroll] {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
              transition: none !important;
            }
          }
        `}</style>

        {/* ── Hero ──────────────────────────────────── */}
        <section style={{
          position:   'relative',
          overflow:   'hidden',
          background: 'var(--hero-bg)',
          minHeight:  '82vh',
          display:    'flex',
          alignItems: 'center',
        }}>
          {/* Glows flotantes */}
          <div className="hero-glow-1" style={{ position:'absolute', top:'-15%', right:'-8%', width:650, height:650, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(225,29,72,0.18) 0%, transparent 70%)', pointerEvents:'none' }} />
          <div className="hero-glow-2" style={{ position:'absolute', bottom:'-10%', left:'20%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(225,29,72,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />

          {/* Grid lines */}
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(225,29,72,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(225,29,72,0.04) 1px, transparent 1px)', backgroundSize:'60px 60px', pointerEvents:'none' }} />

          <div className="container-max" style={{ position:'relative', zIndex:1, padding:'5rem 1.5rem', width:'100%' }}>
            <div className="hero-split">

              {/* LEFT: Text */}
              <div>
                <span className="tag hero-tag" style={{ marginBottom:'1.5rem', display:'inline-block' }}>
                  ◈ Electrodomésticos
                </span>
                <h1 className="hero-h1" style={{
                  fontFamily:    'var(--font-headline)',
                  fontWeight:     900,
                  lineHeight:     1.05,
                  fontSize:      'clamp(2.4rem, 5vw, 3.8rem)',
                  marginBottom:  '1.25rem',
                  letterSpacing: '-0.03em',
                  color:          'var(--color-txt)',
                }}>
                  Tu Hogar,<br />
                  <span style={{ color:'var(--color-primary)' }}>al Siguiente<br />Nivel</span>
                </h1>
                <p className="hero-desc" style={{ fontSize:'0.95rem', color:'var(--color-txt-2)', lineHeight:1.7, marginBottom:'2rem', maxWidth:460 }}>
                  Refrigeradoras, cocinas, lavadoras y mucho más. Las mejores marcas con garantía,
                  stock disponible y asesoramiento personalizado.
                </p>
                <div className="hero-btns" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  <Link href="/catalogo" className="btn-primary" style={{ padding:'0.8rem 2rem', fontSize:'0.85rem' }}>
                    Explorar Catálogo
                  </Link>
                  {promociones.length > 0 && (
                    <Link href="/promociones" className="btn-outline" style={{ padding:'0.8rem 2rem', fontSize:'0.85rem' }}>
                      Ver Ofertas
                    </Link>
                  )}
                </div>
                <div className="hero-stats" style={{ display:'flex', gap:'1.5rem', marginTop:'2.5rem', flexWrap:'wrap' }}>
                  {[
                    { label:'Sistema', value:'Online', ok:true },
                    { label:'Productos', value:`${productos.length}+` },
                    { label:'Categorías', value:`${categorias.length}` },
                  ].map(s => (
                    <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:s.ok ? '#22c55e' : 'var(--color-primary)', boxShadow:s.ok ? '0 0 6px #22c55e' : '0 0 6px var(--color-primary)', flexShrink:0 }} />
                      <span style={{ fontSize:'0.72rem', color:'var(--color-muted)', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                        {s.label}: <span style={{ color:'var(--color-txt)', fontWeight:600 }}>{s.value}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Appliance showcase */}
              <div className="hero-appliances">
                {([
                  { label: 'Refrigeradoras', desc: 'Conservación óptima',  src: '/hero/fridge.jpg'  },
                  { label: 'Lavadoras',       desc: 'Limpieza eficiente',   src: '/hero/washer.jpg'  },
                  { label: 'Cocinas',         desc: 'Potencia y precisión', src: '/hero/stove.jpg'   },
                  { label: 'Televisores',     desc: 'Entretenimiento HD',   src: '/hero/tv.jpg'      },
                ]).map(item => (
                  <Link key={item.label} href="/catalogo" style={{ textDecoration:'none' }}>
                    <div className="appliance-card" style={{
                      background:    'var(--color-card)',
                      border:        '1px solid var(--color-border)',
                      borderRadius:  'var(--radius-md)',
                      overflow:      'hidden',
                      cursor:        'pointer',
                      transition:    'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                    }}>
                      <div style={{ position:'relative', width:'100%', height:130, overflow:'hidden' }}>
                        <Image
                          src={item.src}
                          alt={item.label}
                          fill
                          style={{ objectFit:'cover', transition:'transform 0.4s ease' }}
                          className="appliance-img"
                          sizes="(max-width:900px) 25vw, 22vw"
                        />
                        <div style={{
                          position:   'absolute',
                          inset:       0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
                        }} />
                      </div>
                      <div style={{ padding:'0.85rem 1rem' }}>
                        <p style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--color-txt)', marginBottom:2, letterSpacing:'-0.01em' }}>
                          {item.label}
                        </p>
                        <p style={{ fontSize:'0.68rem', color:'var(--color-muted)', letterSpacing:'0.02em' }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <style>{`
            .hero-split {
              display: grid;
              grid-template-columns: 54% 46%;
              gap: 3rem;
              align-items: center;
            }
            .hero-appliances {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 1rem;
            }
            .appliance-card:hover {
              border-color: rgba(225,29,72,0.4) !important;
              transform: translateY(-4px);
              box-shadow: 0 14px 36px rgba(0,0,0,0.45);
            }
            .appliance-card:hover .appliance-img {
              transform: scale(1.06);
            }
            [data-theme="light"] .appliance-card:hover {
              box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            }
            @media (max-width: 900px) {
              .hero-split { grid-template-columns: 1fr; }
              .hero-appliances { grid-template-columns: repeat(4, 1fr); }
            }
            @media (max-width: 560px) {
              .hero-appliances { grid-template-columns: 1fr 1fr; }
            }
          `}</style>
        </section>

        {/* ── Categorías Elite ──────────────────────── */}
        {categorias.length > 0 && (
          <section style={{ padding: '4.5rem 0', background: 'var(--color-bg)' }}>
            <div className="container-max">
              <div data-scroll="left" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
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
                {categorias.filter(c => c.total_productos > 0).slice(0, 8).map((cat, i) => (
                  <Link key={cat.id_categoria} href={`/catalogo?categoria=${cat.id_categoria}`}
                    data-scroll data-delay={String(i + 1)}
                    style={{ textDecoration: 'none' }}>
                    <div style={{
                      background:    'var(--color-card)',
                      border:        '1px solid var(--color-border)',
                      borderRadius:  'var(--radius-md)',
                      padding:       '1.5rem 1rem',
                      textAlign:     'center',
                      transition:    'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                      cursor:        'pointer',
                      height:        '100%',
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
              <div data-scroll="left" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
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

              <div data-scroll style={{
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
              <div data-scroll="left" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
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
                  <div key={i} data-scroll data-delay={String(i + 1)} style={{
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
          <div data-scroll="scale" className="container-max" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
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

      {/* ── Intersection Observer para scroll reveal ── */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          if(typeof IntersectionObserver==='undefined')return;
          var io=new IntersectionObserver(function(entries){
            entries.forEach(function(e){
              if(e.isIntersecting){
                e.target.classList.add('visible');
                io.unobserve(e.target);
              }
            });
          },{threshold:0.1,rootMargin:'0px 0px -48px 0px'});
          function init(){
            document.querySelectorAll('[data-scroll]').forEach(function(el){io.observe(el);});
          }
          if(document.readyState==='loading'){
            document.addEventListener('DOMContentLoaded',init);
          }else{
            init();
          }
        })();
      ` }} />
    </>
  );
}
