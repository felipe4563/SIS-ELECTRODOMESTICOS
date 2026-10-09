'use client';
import { useState } from 'react';

interface Props {
  titulo: string;
  texto: string;
  maxLines?: number;
}

const LARGO_UMBRAL = 320;

export default function ExpandableText({ titulo, texto, maxLines = 7 }: Props) {
  const [abierto, setAbierto] = useState(false);
  const esLargo = texto.length > LARGO_UMBRAL;

  return (
    <>
      <p style={{
        fontSize:      '0.83rem',
        color:         'var(--color-muted)',
        lineHeight:     1.7,
        whiteSpace:    'pre-line',
        display:       esLargo ? '-webkit-box' : 'block',
        WebkitLineClamp: esLargo ? maxLines : undefined,
        WebkitBoxOrient: esLargo ? 'vertical' : undefined,
        overflow:      esLargo ? 'hidden' : 'visible',
      }}>
        {texto}
      </p>

      {esLargo && (
        <button
          onClick={() => setAbierto(true)}
          style={{
            marginTop:      10,
            background:    'none',
            border:        'none',
            padding:        0,
            cursor:        'pointer',
            color:         'var(--color-primary)',
            fontSize:      '0.78rem',
            fontWeight:     700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Ver todo →
        </button>
      )}

      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          style={{
            position:       'fixed',
            inset:           0,
            zIndex:          200,
            background:     'rgba(0,0,0,0.6)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '1.5rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:    'var(--color-card)',
              border:        '1px solid var(--color-border)',
              borderRadius:  'var(--radius-md)',
              maxWidth:       640,
              width:          '100%',
              maxHeight:     '80vh',
              display:       'flex',
              flexDirection: 'column',
              boxShadow:     'var(--shadow-hover)',
            }}
          >
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '1rem 1.25rem',
              borderBottom:   '1px solid var(--color-border)',
              flexShrink:      0,
            }}>
              <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-txt)' }}>
                {titulo}
              </h3>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-muted)', padding: 4, display: 'flex',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: '1.25rem', overflowY: 'auto' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-txt-2)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {texto}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
