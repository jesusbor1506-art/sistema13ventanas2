import { useEffect, useRef } from 'react';

export function useTableScroll() {
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'ArrowRight') {
        tableRef.current?.scrollBy({ left: 150, behavior: 'smooth' });
      } else if (e.key === 'ArrowLeft') {
        tableRef.current?.scrollBy({ left: -150, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return tableRef;
}
