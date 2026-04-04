'use client';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
// DataUploader removed for car hire
import CommandPalette from '@/components/CommandPalette';
import { useData } from '@/context/DataContext';

export default function LayoutShell({ children }) {
  const { uploaderOpen, openUploader, closeUploader } = useData();

  // Global fix: force dark background on ALL Recharts SVG background rects
  useEffect(() => {
    const greyFills = new Set(['#fff', '#ffffff', 'white', '#ccc', '#cccccc', '#f5f5f5', '#e5e5e5', '#eee', '#eeeeee', '#ddd', '#d5d5d5']);
    const fixCharts = () => {
      document.querySelectorAll('svg.recharts-surface').forEach(svg => {
        // Fix the first rect (SVG background)
        const firstRect = svg.querySelector(':scope > rect');
        if (firstRect) {
          const fill = (firstRect.getAttribute('fill') || '').toLowerCase();
          if (fill !== '#1a1d27' && fill !== '#0f1117' && fill !== 'transparent' && fill !== 'none') {
            firstRect.setAttribute('fill', '#1a1d27');
          }
        }
        // Fix any other grey/white rects
        svg.querySelectorAll('rect').forEach(rect => {
          const fill = (rect.getAttribute('fill') || '').toLowerCase();
          if (greyFills.has(fill)) {
            rect.setAttribute('fill', '#0f1117');
          }
        });
      });
    };
    const observer = new MutationObserver(fixCharts);
    observer.observe(document.body, { childList: true, subtree: true });
    fixCharts();
    // Also run on a short interval for charts that render after initial mount
    const interval = setInterval(fixCharts, 2000);
    return () => { observer.disconnect(); clearInterval(interval); };
  }, []);

  return (
    <>
      <Sidebar onUploadClick={openUploader} />
      <main className="lg:ml-64 min-h-screen p-6 lg:p-8 pt-16 lg:pt-8">
        {children}
      </main>
      {/* DataUploader removed */}
      <CommandPalette />
    </>
  );
}
