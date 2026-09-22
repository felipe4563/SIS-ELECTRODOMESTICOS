'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export interface HeroSlide {
  key:        string;
  tag:        string;
  title:      string;
  highlight?: string;
  desc:       string;
  ctaLabel:   string;
  ctaHref:    string;
  ctaLabel2?: string;
  ctaHref2?:  string;
}

const AUTOPLAY_MS = 5500;

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      setActive(i => (i + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length, paused]);

  const slide = slides[active] ?? slides[0];
  if (!slide) return null;

  const goTo = (i: number) => setActive(((i % slides.length) + slides.length) % slides.length);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div key={slide.key}>
        <span className="tag hero-tag-pill" style={{ marginBottom: '1.5rem', display: 'inline-block', padding: '0.4rem 1rem', fontSize: '0.72rem' }}>
          ◈ {slide.tag}
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
          {slide.title}
          {slide.highlight && (
            <>
              <br />
              <span style={{ color: 'var(--color-primary)' }}>{slide.highlight}</span>
            </>
          )}
        </h1>
        <p className="hero-desc" style={{ fontSize: '0.95rem', color: 'var(--color-txt-2)', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 460 }}>
          {slide.desc}
        </p>
        <div className="hero-btns" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href={slide.ctaHref} className="btn-primary hero-cta" style={{ padding: '0.8rem 2rem', fontSize: '0.85rem' }}>
            {slide.ctaLabel}
          </Link>
          {slide.ctaLabel2 && slide.ctaHref2 && (
            <Link href={slide.ctaHref2} className="btn-outline" style={{ padding: '0.8rem 2rem', fontSize: '0.85rem' }}>
              {slide.ctaLabel2}
            </Link>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: '2.25rem' }}>
          <div style={{ display: 'flex', gap: 7 }}>
            {slides.map((s, i) => (
              <button
                key={s.key}
                onClick={() => goTo(i)}
                aria-label={`Ir a la oferta ${i + 1}`}
                style={{
                  width:        i === active ? 22 : 8,
                  height:       8,
                  borderRadius: 999,
                  border:       'none',
                  cursor:       'pointer',
                  padding:      0,
                  background:   i === active ? 'var(--color-primary)' : 'var(--color-border-2)',
                  transition:   'width 0.25s, background 0.25s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => goTo(active - 1)}
              aria-label="Oferta anterior"
              style={{
                width: 30, height: 30, borderRadius: '50%',
                border: '1px solid var(--color-border)', background: 'var(--color-card)',
                color: 'var(--color-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button
              onClick={() => goTo(active + 1)}
              aria-label="Siguiente oferta"
              style={{
                width: 30, height: 30, borderRadius: '50%',
                border: '1px solid var(--color-border)', background: 'var(--color-card)',
                color: 'var(--color-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
