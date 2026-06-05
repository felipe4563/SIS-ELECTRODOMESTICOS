import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const BACKEND  = API_BASE.replace('/api', '');
const buildUrl = (url) => !url ? null : url.startsWith('http') ? url : `${BACKEND}${url}`;

export default function ProductoPublico() {
  const { codigo } = useParams();
  const [producto,  setProducto]  = useState(null);
  const [cargando,  setCargando]  = useState(true);
  const [estado,    setEstado]    = useState('ok');
  const [imgFailed, setImgFailed] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/public/producto/${encodeURIComponent(codigo)}`)
      .then(r => { setProducto(r.data); setCargando(false); })
      .catch(e => {
        setEstado(e.response?.status === 404 ? 'not_found' : 'error');
        setCargando(false);
      });
  }, [codigo]);

  const imgSrc      = buildUrl(producto?.imagen_url);
  const logoSrc     = buildUrl(producto?.empresa?.logo_url);
  const primerPromo = producto?.promociones?.[0];
  const stockKey    = producto?.disponibilidad === 'Disponible' ? 'ok'
                    : producto?.disponibilidad === 'Stock limitado' ? 'low' : 'out';

  return (
    <>
      <style>{CSS}</style>
      <div className="pp-root" data-theme={dark ? 'dark' : 'light'}>

        {/* Topbar */}
        <header className="pp-bar">
          <div className="pp-bar-inner">
            <div className="pp-bar-brand">
              {logoSrc
                ? <img src={logoSrc} alt="Logo" className="pp-logo"
                    onError={e => { e.target.style.display = 'none'; }} />
                : <div className="pp-logomark">⚡</div>
              }
              <span className="pp-brand-name">
                {producto?.empresa?.nombre || 'MEGAELECTRA'}
              </span>
            </div>
            <button
              className="pp-theme-btn"
              onClick={() => setDark(d => !d)}
              aria-label="Cambiar tema"
            >
              {dark ? (
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <main className="pp-main">
          {cargando ? (
            <SkeletonCard />
          ) : estado !== 'ok' ? (
            <EmptyState tipo={estado} codigo={codigo} />
          ) : (
            <>
              <article className="pp-card">

                {/* Panel imagen */}
                <div className="pp-img-panel">
                  <div className="pp-img-grid" aria-hidden="true" />
                  <div className="pp-img-vignette" aria-hidden="true" />

                  {imgSrc && !imgFailed ? (
                    <img
                      src={imgSrc}
                      alt={producto.producto}
                      className="pp-img"
                      onError={() => setImgFailed(true)}
                    />
                  ) : (
                    <NoImage />
                  )}

                  {/* Badge de oferta */}
                  {primerPromo && (
                    <div className="pp-offer-badge">
                      <span className="pp-offer-pct">
                        {primerPromo.tipo_descuento === 'PORCENTAJE'
                          ? `${Number(primerPromo.valor_descuento).toFixed(0)}%`
                          : `Bs ${Number(primerPromo.valor_descuento).toFixed(0)}`}
                      </span>
                      <span className="pp-offer-label">OFF</span>
                    </div>
                  )}

                  {/* Pill de disponibilidad */}
                  <div className={`pp-stock-pill pp-stock--${stockKey}`}>
                    <span className="pp-stock-dot" />
                    {producto.disponibilidad}
                  </div>
                </div>

                {/* Panel info */}
                <div className="pp-info">
                  {producto.categoria && (
                    <p className="pp-cat">{producto.categoria}</p>
                  )}

                  <h1 className="pp-nombre">{producto.producto}</h1>

                  {producto.marca && (
                    <p className="pp-marca">
                      por <strong>{producto.marca}</strong>
                    </p>
                  )}

                  {/* Precio */}
                  <div className="pp-price-wrap">
                    <div className="pp-price-line">
                      <sup className="pp-currency">Bs</sup>
                      <span className="pp-price">
                        {Number(producto.precio_publico ?? 0).toLocaleString('es-BO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Bloque de promoción */}
                  {producto.promociones?.length > 0 && (
                    <div className="pp-promo">
                      <div className="pp-promo-header">
                        <svg className="pp-promo-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <span>OFERTA ACTIVA</span>
                      </div>
                      {producto.promociones.map((pr, i) => (
                        <div key={i} className={`pp-promo-item${i > 0 ? ' pp-promo-item--sep' : ''}`}>
                          <p className="pp-promo-name">{pr.nombre}</p>
                          <p className="pp-promo-val">
                            {pr.tipo_descuento === 'PORCENTAJE'
                              ? `${Number(pr.valor_descuento).toFixed(0)}% de descuento`
                              : `Bs ${Number(pr.valor_descuento).toFixed(2)} de descuento`}
                          </p>
                          {pr.descripcion && (
                            <p className="pp-promo-desc">{pr.descripcion}</p>
                          )}
                          {Number(pr.cantidad_minima) > 1 && (
                            <p className="pp-promo-min">
                              Mínimo {Number(pr.cantidad_minima)} unidades
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Especificaciones */}
                  {(producto.modelo || producto.color || producto.capacidad) && (
                    <div className="pp-specs">
                      <p className="pp-specs-label">Especificaciones</p>
                      {producto.modelo    && <SpecRow label="Modelo"    val={producto.modelo} />}
                      {producto.color     && <SpecRow label="Color"     val={producto.color} />}
                      {producto.capacidad && <SpecRow label="Capacidad" val={producto.capacidad} />}
                    </div>
                  )}

                  {/* Descripción */}
                  {(producto.caracteristicas || producto.detalle) && (
                    <div className="pp-desc">
                      {producto.caracteristicas && (
                        <>
                          <p className="pp-desc-label">Características</p>
                          <p className="pp-desc-text">{producto.caracteristicas}</p>
                        </>
                      )}
                      {producto.detalle && (
                        <>
                          <p className="pp-desc-label" style={{ marginTop: '0.75rem' }}>
                            Descripción
                          </p>
                          <p className="pp-desc-text">{producto.detalle}</p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="pp-code-row">
                    <span>Referencia</span>
                    <code className="pp-code">{producto.codigo_interno}</code>
                  </div>
                </div>
              </article>

              {/* Sección combos */}
              {producto.combos?.length > 0 && (
                <section className="pp-combos">
                  <div className="pp-section-divider">
                    <span>También disponible en combo</span>
                  </div>
                  <div className="pp-combos-list">
                    {producto.combos.map((c, i) => (
                      <div key={i} className="pp-combo">
                        <span className="pp-combo-icon">📦</span>
                        <div className="pp-combo-body">
                          <p className="pp-combo-name">{c.nombre}</p>
                          {c.descripcion && (
                            <p className="pp-combo-desc">{c.descripcion}</p>
                          )}
                        </div>
                        <div className="pp-combo-price">
                          <sup>Bs</sup>
                          {Number(c.precio_combo).toLocaleString('es-BO', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <footer className="pp-footer">
                {producto?.empresa?.nombre || 'MEGAELECTRA'} · Consulte disponibilidad y condiciones en tienda
              </footer>
            </>
          )}
        </main>
      </div>
    </>
  );
}

function SpecRow({ label, val }) {
  return (
    <div className="pp-spec-row">
      <span className="pp-spec-label">{label}</span>
      <span className="pp-spec-val">{val}</span>
    </div>
  );
}

function NoImage() {
  return (
    <div className="pp-no-img">
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="18" width="60" height="46" rx="6"
          stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" />
        <circle cx="28" cy="34" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 52 L32 32 L46 44 L58 32 L70 50"
          stroke="currentColor" strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span>Sin imagen</span>
    </div>
  );
}

function EmptyState({ tipo, codigo }) {
  const isNotFound = tipo === 'not_found';
  return (
    <div className="pp-empty">
      <div className="pp-empty-icon">{isNotFound ? '⊘' : '⚠'}</div>
      <h2 className="pp-empty-title">
        {isNotFound ? 'Producto no encontrado' : 'Error al cargar'}
      </h2>
      <p className="pp-empty-sub">
        {isNotFound
          ? <><code className="pp-code">{codigo}</code> no corresponde a ningún producto activo en el catálogo.</>
          : 'No se pudo obtener la información. Intente nuevamente.'}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="pp-card" style={{ minHeight: 440 }}>
      <div className="pp-img-panel" />
      <div className="pp-info" style={{ gap: '1rem' }}>
        {[{ w: 70, h: 10 }, { w: '78%', h: 34 }, { w: '44%', h: 13 },
          { w: '62%', h: 52, mt: 4 }, { w: 120, h: 22, r: 999 },
          { w: '80%', h: 11 }, { w: '65%', h: 11 }
        ].map((s, i) => (
          <div key={i} className="pp-skel" style={{
            width: s.w, height: s.h,
            borderRadius: s.r ?? 6,
            marginTop: s.mt,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700;900&family=Bebas+Neue&family=Jost:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Tokens ─────────────────────────────────────────────────────────────── */
[data-theme="light"] {
  --bg:          #ecebf5;
  --surface:     #ffffff;
  --surface-2:   #f4f3fc;
  --img-bg:      #1a1828;
  --text:        #0d0c1a;
  --text-2:      #6b638a;
  --border:      #dcdaf0;
  --accent:      #4f46e5;
  --accent-glow: rgba(79,70,229,0.15);
  --price:       #7c3aed;
  --promo-bg:    #f0f9ff;
  --promo-bd:    #bae6fd;
  --promo-ht:    #0369a1;
  --code-bg:     #e8e6f8;
  --skel-a:      #dddaf0;
  --skel-b:      #ecebf5;
  --bar-bg:      rgba(255,255,255,0.9);
}
[data-theme="dark"] {
  --bg:          #06060d;
  --surface:     #0e0e1a;
  --surface-2:   #14142200;
  --img-bg:      #050510;
  --text:        #eae6f8;
  --text-2:      #6e6888;
  --border:      #1c1c2e;
  --accent:      #818cf8;
  --accent-glow: rgba(129,140,248,0.12);
  --price:       #fbbf24;
  --promo-bg:    #0c0f1e;
  --promo-bd:    #1e2a50;
  --promo-ht:    #60a5fa;
  --code-bg:     #12121f;
  --skel-a:      #111120;
  --skel-b:      #181828;
  --bar-bg:      rgba(6,6,13,0.88);
}

body { background: var(--bg); }

.pp-root {
  min-height: 100dvh;
  background: var(--bg);
  font-family: 'Jost', sans-serif;
  color: var(--text);
  transition: background 0.25s, color 0.25s;
}

/* ── Topbar ─────────────────────────────────────────────────────────────── */
.pp-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--bar-bg);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.pp-bar-inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1.25rem;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pp-bar-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.pp-logo {
  height: 30px;
  width: auto;
  max-width: 120px;
  object-fit: contain;
  border-radius: 4px;
}
.pp-logomark {
  width: 32px; height: 32px;
  background: var(--accent);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.pp-brand-name {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-2);
}
.pp-theme-btn {
  width: 36px; height: 36px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
}
.pp-theme-btn:hover {
  background: var(--border);
  color: var(--text);
}

/* ── Main ───────────────────────────────────────────────────────────────── */
.pp-main {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.75rem 1.25rem 5rem;
}

/* ── Card ───────────────────────────────────────────────────────────────── */
.pp-card {
  background: var(--surface);
  border-radius: 20px;
  border: 1px solid var(--border);
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr;
  animation: ppUp 0.45s ease both;
}
[data-theme="dark"] .pp-card {
  box-shadow:
    0 0 0 1px rgba(129,140,248,0.07),
    0 8px 50px rgba(0,0,0,0.7);
}
[data-theme="light"] .pp-card {
  box-shadow:
    0 2px 6px rgba(0,0,0,0.04),
    0 12px 48px rgba(0,0,0,0.09);
}
@media (min-width: 680px) {
  .pp-card { grid-template-columns: 380px 1fr; }
}

/* ── Image panel ────────────────────────────────────────────────────────── */
.pp-img-panel {
  background: var(--img-bg);
  position: relative;
  display: flex; align-items: center; justify-content: center;
  min-height: 320px;
  overflow: hidden;
}
@media (min-width: 680px) {
  .pp-img-panel { min-height: 540px; }
}

.pp-img-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(129,140,248,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(129,140,248,0.06) 1px, transparent 1px);
  background-size: 30px 30px;
  pointer-events: none;
}
.pp-img-vignette {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(5,5,16,0.55) 100%);
  pointer-events: none;
  z-index: 2;
}
[data-theme="light"] .pp-img-vignette {
  background: radial-gradient(ellipse at center, transparent 40%, rgba(10,8,30,0.45) 100%);
}

.pp-img {
  position: relative; z-index: 1;
  width: 100%; height: 100%;
  object-fit: contain;
  padding: 2rem;
  animation: ppUp 0.65s 0.12s ease both;
}
.pp-no-img {
  position: relative; z-index: 1;
  display: flex; flex-direction: column;
  align-items: center; gap: 0.6rem;
  color: rgba(129,140,248,0.25);
}
.pp-no-img svg { width: 72px; height: 72px; }
.pp-no-img span {
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* Offer badge */
.pp-offer-badge {
  position: absolute;
  top: 14px; left: 14px;
  z-index: 4;
  background: #dc2626;
  border-radius: 10px;
  padding: 0.3rem 0.6rem 0.3rem 0.5rem;
  display: flex; flex-direction: column; align-items: flex-start;
  line-height: 1;
  box-shadow: 0 4px 20px rgba(220,38,38,0.5);
  animation: ppUp 0.4s 0.4s ease both;
}
.pp-offer-pct {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem;
  color: #fff;
  line-height: 1;
}
.pp-offer-label {
  font-family: 'Jost', sans-serif;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: rgba(255,255,255,0.8);
  margin-top: -2px;
}

/* Stock pill */
.pp-stock-pill {
  position: absolute;
  bottom: 14px; left: 50%; transform: translateX(-50%);
  z-index: 4;
  display: flex; align-items: center; gap: 0.42rem;
  padding: 0.28rem 0.8rem;
  border-radius: 999px;
  font-size: 0.67rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  backdrop-filter: blur(8px);
  border: 1px solid;
}
.pp-stock--ok  { background: rgba(22,163,74,0.18);  border-color: rgba(22,163,74,0.35);  color: #4ade80; }
.pp-stock--low { background: rgba(245,158,11,0.18); border-color: rgba(245,158,11,0.35); color: #fbbf24; }
.pp-stock--out { background: rgba(239,68,68,0.18);  border-color: rgba(239,68,68,0.35);  color: #f87171; }
[data-theme="light"] .pp-stock--ok  { color: #15803d; }
[data-theme="light"] .pp-stock--low { color: #b45309; }
[data-theme="light"] .pp-stock--out { color: #dc2626; }

.pp-stock-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  animation: ppPulse 2s infinite;
}
.pp-stock--ok  .pp-stock-dot { background: #22c55e; }
.pp-stock--low .pp-stock-dot { background: #f59e0b; }
.pp-stock--out .pp-stock-dot { background: #ef4444; }

/* ── Info panel ─────────────────────────────────────────────────────────── */
.pp-info {
  padding: 2rem 1.75rem;
  display: flex;
  flex-direction: column;
  animation: ppUp 0.5s 0.22s ease both;
}

.pp-cat {
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.5rem;
}
.pp-nombre {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.4rem, 5vw, 2.1rem);
  font-weight: 700;
  line-height: 1.2;
  color: var(--text);
  margin-bottom: 0.4rem;
}
.pp-marca {
  font-size: 0.82rem;
  font-weight: 300;
  color: var(--text-2);
  margin-bottom: 1.5rem;
}
.pp-marca strong { font-weight: 600; }

/* Price */
.pp-price-wrap {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 1.1rem 0;
  margin-bottom: 1.5rem;
}
.pp-price-line {
  display: flex;
  align-items: flex-start;
  gap: 0.28rem;
}
.pp-currency {
  font-family: 'Jost', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  color: var(--price);
  padding-top: 0.55rem;
}
.pp-price {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(3rem, 10vw, 4.5rem);
  line-height: 1;
  color: var(--price);
  letter-spacing: 0.02em;
}

/* Promo block */
.pp-promo {
  background: var(--promo-bg);
  border: 1px solid var(--promo-bd);
  border-radius: 12px;
  padding: 0.875rem 1rem;
  margin-bottom: 1.5rem;
}
.pp-promo-header {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.58rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--promo-ht);
  margin-bottom: 0.6rem;
}
.pp-promo-icon { width: 11px; height: 11px; flex-shrink: 0; }
.pp-promo-item { }
.pp-promo-item--sep {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border);
}
.pp-promo-name {
  font-size: 0.84rem; font-weight: 600;
  color: var(--text); margin-bottom: 0.12rem;
}
.pp-promo-val {
  font-family: 'Playfair Display', serif;
  font-size: 1.2rem; font-weight: 700;
  color: #ef4444; line-height: 1.2;
}
[data-theme="dark"] .pp-promo-val { color: #f87171; }
.pp-promo-desc {
  font-size: 0.75rem; color: var(--text-2);
  margin-top: 0.2rem; line-height: 1.55;
}
.pp-promo-min {
  font-size: 0.67rem; color: var(--text-2);
  font-style: italic; margin-top: 0.15rem;
}

/* Specs */
.pp-specs { margin-bottom: 1.5rem; }
.pp-specs-label {
  font-size: 0.58rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--text-2); margin-bottom: 0.5rem;
}
.pp-spec-row {
  display: grid; grid-template-columns: 90px 1fr;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.81rem; gap: 0.5rem;
}
.pp-spec-label { color: var(--text-2); font-weight: 400; }
.pp-spec-val   { color: var(--text);   font-weight: 500; }

/* Description */
.pp-desc { margin-bottom: 1.5rem; }
.pp-desc-label {
  font-size: 0.58rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--text-2); margin-bottom: 0.3rem;
}
.pp-desc-text {
  font-size: 0.82rem; line-height: 1.72;
  color: var(--text-2);
}

/* Code ref */
.pp-code-row {
  margin-top: auto;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
  font-size: 0.68rem;
  color: var(--text-2);
  display: flex; align-items: center; gap: 0.5rem;
}
.pp-code {
  font-family: 'Space Mono', monospace;
  font-size: 0.7rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  padding: 0.18rem 0.52rem;
  border-radius: 5px;
  color: var(--accent);
  letter-spacing: 0.04em;
}

/* ── Combos ─────────────────────────────────────────────────────────────── */
.pp-combos {
  margin-top: 2rem;
  animation: ppUp 0.5s 0.32s ease both;
}
.pp-section-divider {
  display: flex; align-items: center; gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--text-2);
}
.pp-section-divider::before,
.pp-section-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}

.pp-combos-list {
  display: flex; flex-direction: column; gap: 0.65rem;
}
.pp-combo {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem 1.25rem;
  display: flex; align-items: center; gap: 0.9rem;
  transition: border-color 0.18s, box-shadow 0.18s;
  cursor: default;
}
.pp-combo:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent-glow), 0 4px 24px rgba(0,0,0,0.15);
}
.pp-combo-icon { font-size: 1.4rem; flex-shrink: 0; }
.pp-combo-body { flex: 1; min-width: 0; }
.pp-combo-name {
  font-size: 0.9rem; font-weight: 600;
  color: var(--text); margin-bottom: 0.1rem;
}
.pp-combo-desc {
  font-size: 0.74rem; color: var(--text-2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pp-combo-price {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.85rem; line-height: 1;
  color: var(--price);
  flex-shrink: 0;
  display: flex; align-items: flex-start; gap: 0.12rem;
}
.pp-combo-price sup {
  font-family: 'Jost', sans-serif;
  font-size: 0.78rem; font-weight: 500;
  padding-top: 4px;
}

/* ── Footer ─────────────────────────────────────────────────────────────── */
.pp-footer {
  margin-top: 2.5rem;
  text-align: center;
  font-size: 0.67rem;
  letter-spacing: 0.07em;
  color: var(--text-2);
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */
.pp-skel {
  background: linear-gradient(90deg,
    var(--skel-a) 25%, var(--skel-b) 50%, var(--skel-a) 75%);
  background-size: 200% 100%;
  animation: ppShimmer 1.4s infinite;
}

/* ── Empty state ────────────────────────────────────────────────────────── */
.pp-empty {
  min-height: 55vh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 1rem; text-align: center; padding: 2rem;
}
.pp-empty-icon {
  font-size: 3rem; line-height: 1;
  color: var(--text-2);
}
.pp-empty-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.6rem; font-weight: 700;
  color: var(--text);
}
.pp-empty-sub {
  font-size: 0.82rem; color: var(--text-2);
  max-width: 320px; line-height: 1.65;
}

/* ── Keyframes ──────────────────────────────────────────────────────────── */
@keyframes ppUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ppPulse {
  0%, 100% { opacity: 1;   transform: scale(1);    }
  50%       { opacity: 0.4; transform: scale(0.72); }
}
@keyframes ppShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
`;
