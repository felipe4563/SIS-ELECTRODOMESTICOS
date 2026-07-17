'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const elements = document.querySelectorAll<Element>('[data-scroll]');

    if (typeof IntersectionObserver === 'undefined') {
      elements.forEach(el => el.classList.add('visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' },
    );

    elements.forEach(el => {
      el.classList.remove('visible');
      io.observe(el);
    });

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
