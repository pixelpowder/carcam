'use client';
import { useEffect, useRef } from 'react';

// Wrapper that forces dark background on Recharts bar chart SVGs
export default function DarkBarChart({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new MutationObserver(() => {
      const svg = ref.current?.querySelector('svg.recharts-surface');
      if (svg) {
        const firstRect = svg.querySelector(':scope > rect');
        if (firstRect) firstRect.setAttribute('fill', '#1a1d27');
      }
    });
    observer.observe(ref.current, { childList: true, subtree: true });
    // Also run immediately
    const svg = ref.current?.querySelector('svg.recharts-surface');
    if (svg) {
      const firstRect = svg.querySelector(':scope > rect');
      if (firstRect) firstRect.setAttribute('fill', '#1a1d27');
    }
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
