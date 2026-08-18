'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const MAX_TILT = 10;

export default function TiltCard({ children, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * MAX_TILT * 2;
    const rotateX = (0.5 - y) * MAX_TILT * 2;
    el.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px) scale(1.015)`;
    el.style.setProperty('--glow-x', `${x * 100}%`);
    el.style.setProperty('--glow-y', `${y * 100}%`);
    el.style.setProperty('--glow-opacity', '1');
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
    el.style.setProperty('--glow-opacity', '0');
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${className ?? ''}`}
      style={{ ...style, transformStyle: 'preserve-3d', transition: 'transform 0.2s ease-out' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
      <div className="tilt-glow" />
      <style>{`
        .tilt-card { position: relative; will-change: transform; }
        .tilt-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: var(--glow-opacity, 0);
          transition: opacity 0.25s ease;
          background: radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(255,255,255,0.16) 0%, transparent 55%);
        }
        @media (hover: none) {
          .tilt-card { transform: none !important; }
          .tilt-glow { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tilt-card { transition: none !important; }
        }
      `}</style>
    </div>
  );
}
