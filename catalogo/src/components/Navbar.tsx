'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { imgUrl } from '@/lib/api';
import type { Empresa } from '@/lib/api';

interface Props {
  empresa?: Empresa | null;
}

function waLink(tel: string): string {
  const digits = tel.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('591') ? digits : `591${digits}`}`;
}

const navLinks = [
  { href: '/catalogo?buscar=lavadora',       label: 'Lavadoras' },
  { href: '/catalogo?buscar=cocina',         label: 'Cocinas' },
  { href: '/catalogo?buscar=refrigerador',   label: 'Refrigeradores' },
  { href: '/catalogo?buscar=horno',      label: 'Hornos' },
  { href: '/catalogo?buscar=aire',           label: 'Aires Acondicionados' },
  { href: '/promociones',                    label: 'Ofertas', accent: true },
];

export default function Navbar({ empresa }: Props) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const pathname            = usePathname();
  const nombre = empresa?.nombre_comercial ?? empresa?.razon_social ?? 'Mega Electra';
  const logo   = empresa?.logo_url ? imgUrl(empresa.logo_url) : null;

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50 }}>

      {/* ── Barra de contacto superior ── */}
      {(empresa?.telefono || empresa?.email || empresa?.direccion) && (
        <div style={{
          background:    '#0a0c10',
          borderBottom:  '1px solid rgba(255,255,255,0.08)',
          fontSize:      '0.8rem',
          color:         'var(--color-muted)',
        }}>
          <div className="container-max" style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            height:          42,
            gap:             16,
          }}>
            {/* Dirección — oculta en móvil */}
            {empresa?.direccion && (
              <span className="topbar-dir" style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {empresa.direccion}
              </span>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
              {/* Email */}
              {empresa?.email && (
                <a href={`mailto:${empresa.email}`} className="topbar-link topbar-email" style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:             6,
                  color:          'var(--color-muted)',
                  textDecoration: 'none',
                  transition:     'color 0.15s',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  {empresa.email}
                </a>
              )}

              {/* WhatsApp */}
              {empresa?.telefono && (
                <a href={waLink(empresa.telefono)} target="_blank" rel="noopener noreferrer"
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:             5,
                    background:     '#25d366',
                    color:           '#fff',
                    textDecoration: 'none',
                    padding:        '5px 14px',
                    borderRadius:   '999px',
                    fontWeight:      700,
                    fontSize:       '0.78rem',
                    letterSpacing:  '0.02em',
                    transition:     'background 0.15s',
                  }}
                  className="topbar-wa">
                  {/* WhatsApp icon */}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                  </svg>
                  {empresa.telefono}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar principal ── */}
      <div style={{
        background:    'var(--color-bg-2)',
        borderBottom:  '1px solid var(--color-border)',
      }}>
      <div className="container-max">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', height: 64 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            {logo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt={nombre}
                  style={{ height: 40, maxWidth: 140, objectFit: 'contain', display: 'block' }} />
                <span style={{
                  fontFamily:    'var(--font-headline)',
                  fontWeight:     800,
                  fontSize:      '1rem',
                  color:          '#fff',
                  letterSpacing: '-0.01em',
                  lineHeight:     1.2,
                }}>
                  {nombre}
                </span>
              </>
            ) : (
              <span style={{
                fontFamily:    'var(--font-headline)',
                fontWeight:     800,
                fontSize:      '1.2rem',
                color:          '#fff',
                letterSpacing: '-0.01em',
              }}>
                {nombre}
              </span>
            )}
          </Link>

          {/* Desktop nav — centrado */}
          <nav style={{
            display:        'flex',
            alignItems:     'center',
            gap:            '0.1rem',
            flex:            1,
          }} className="nav-desktop">
            {navLinks.map(l => {
              const isActive = pathname?.startsWith('/promociones') && l.href === '/promociones';
              return (
                <Link key={l.href} href={l.href} style={{
                  fontFamily:   'var(--font-body)',
                  fontWeight:    600,
                  fontSize:     '0.82rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color:         l.accent ? 'var(--color-primary)' : isActive ? '#fff' : 'var(--color-muted)',
                  textDecoration: 'none',
                  padding:       '0 0.75rem',
                  height:        64,
                  display:       'flex',
                  alignItems:    'center',
                  borderBottom:  isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                  transition:    'color 0.15s, border-color 0.15s',
                }}
                  className="nav-link"
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: search + icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <form action="/catalogo" method="get" style={{ display: 'flex', alignItems: 'center' }}
              className="nav-search">
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                              color: 'var(--color-muted)', pointerEvents: 'none' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input name="buscar" type="search" value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar…"
                  style={{
                    width:        200,
                    paddingLeft:  '2rem',
                    paddingRight: '0.75rem',
                    height:        36,
                    borderRadius: 'var(--radius-sm)',
                    fontSize:     '0.82rem',
                  }} />
              </div>
            </form>

            {/* Cart icon */}
            <Link href="/catalogo" style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:           36,
              height:          36,
              borderRadius:   'var(--radius-sm)',
              color:          'var(--color-muted)',
              textDecoration: 'none',
              transition:     'color 0.15s',
            }} className="nav-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </Link>

            {/* Hamburger */}
            <button onClick={() => setOpen(!open)} aria-label="Menú"
              className="nav-hamburger"
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                       color: 'var(--color-txt)', padding: 6, display: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {open
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav style={{
            borderTop:      '1px solid var(--color-border)',
            padding:        '1rem 0 1.25rem',
            display:        'flex',
            flexDirection:  'column',
            gap:             4,
          }}>
            <form action="/catalogo" method="get" style={{ marginBottom: '0.75rem' }}>
              <input name="buscar" type="search" placeholder="Buscar productos…" style={{ height: 40 }} />
            </form>
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
                fontWeight:    600,
                fontSize:     '0.875rem',
                padding:      '0.6rem 0',
                color:         l.accent ? 'var(--color-primary)' : 'var(--color-txt-2)',
                textDecoration:'none',
                borderBottom:  '1px solid var(--color-border)',
              }}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      </div>{/* /navbar principal */}

      <style>{`
        @media (max-width: 900px) {
          .nav-desktop  { display: none !important; }
          .nav-search   { display: none !important; }
          .nav-hamburger{ display: flex !important; }
          .topbar-dir   { display: none !important; }
          .topbar-email { display: none !important; }
        }
        @media (min-width: 901px) {
          .nav-hamburger{ display: none !important; }
        }
        .nav-link:hover    { color: #fff !important; }
        .topbar-link:hover { color: #fff !important; }
        .topbar-wa:hover   { background: #128c5e !important; }
      `}</style>
    </header>
  );
}
