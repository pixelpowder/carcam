'use client';
import { useRef, useEffect } from 'react';

// Wrapper that removes the white/grey background rect from Recharts SVGs
export default function ChartWrapper({ children, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const kill = () => {
      // Find ALL SVGs inside this wrapper
      const svgs = ref.current?.querySelectorAll('svg');
      svgs?.forEach(svg => {
        // Remove ALL direct child rects that span the full chart (background rects)
        const rects = svg.querySelectorAll(':scope > rect');
        rects.forEach(rect => {
          rect.style.fill = 'transparent';
          rect.style.opacity = '0';
        });
      });
    };
    // Run immediately
    kill();
    // Run after a short delay for late renders
    const t1 = setTimeout(kill, 100);
    const t2 = setTimeout(kill, 500);
    // Watch for DOM changes
    const observer = new MutationObserver(kill);
    observer.observe(ref.current, { childList: true, subtree: true, attributes: true });
    return () => { observer.disconnect(); clearTimeout(t1); clearTimeout(t2); };
  }, [children]);

  return <div ref={ref} className={className}>{children}</div>;
}
