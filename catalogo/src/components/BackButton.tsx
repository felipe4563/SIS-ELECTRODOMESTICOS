'use client';
import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:            6,
        background:    'none',
        border:        '1px solid var(--color-border)',
        borderRadius:  'var(--radius-sm)',
        padding:       '0.5rem 1rem',
        fontSize:      '0.78rem',
        fontWeight:     600,
        color:         'var(--color-muted)',
        cursor:        'pointer',
        transition:    'color 0.15s, border-color 0.15s',
        letterSpacing: '0.03em',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.color = '#fff';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
      </svg>
      Volver
    </button>
  );
}
