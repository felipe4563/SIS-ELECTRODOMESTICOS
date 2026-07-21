'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { ProductoImagen } from '@/lib/api';
import { imgUrl } from '@/lib/api';

interface Props {
  imagenes: ProductoImagen[];
  nombre: string;
  agotado: boolean;
}

export default function GaleriaProducto({ imagenes, nombre, agotado }: Props) {
  const principal = imagenes.find(i => i.es_principal) ?? imagenes[0] ?? null;
  const [activa, setActiva] = useState<string | null>(principal?.imagen_url ?? null);

  const src = activa ? imgUrl(activa) : '/placeholder.svg';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Imagen principal */}
      <div style={{
        position:     'relative',
        aspectRatio:  '1',
        background:   'var(--color-img-bg)',
        borderRadius: 'var(--radius-lg)',
        overflow:     'hidden',
        border:       '1px solid var(--color-border)',
      }}>
        <Image
          src={src}
          alt={nombre}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{
            objectFit:  'contain',
            padding:    '2.5rem',
            filter:     agotado ? 'grayscale(0.4) brightness(0.7)' : 'none',
            transition: 'opacity 0.2s',
          }}
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
        />
      </div>

      {/* Miniaturas (solo si hay más de una imagen) */}
      {imagenes.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {imagenes.map((img, i) => {
            const url   = imgUrl(img.imagen_url);
            const esActiva = activa === img.imagen_url;
            return (
              <button
                key={i}
                onClick={() => setActiva(img.imagen_url)}
                style={{
                  position:     'relative',
                  width:         64,
                  height:        64,
                  flexShrink:    0,
                  borderRadius: 'var(--radius-sm)',
                  overflow:     'hidden',
                  border:       `2px solid ${esActiva ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background:   'var(--color-img-bg)',
                  padding:       0,
                  cursor:       'pointer',
                  transition:   'border-color 0.15s',
                  outline:      'none',
                }}
              >
                <Image
                  src={url}
                  alt={`${nombre} ${i + 1}`}
                  fill
                  sizes="64px"
                  style={{ objectFit: 'contain', padding: '0.35rem' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
