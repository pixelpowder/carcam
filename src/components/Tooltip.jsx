'use client';
import { useState, useRef, useEffect } from 'react';

export default function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState('top');
  const triggerRef = useRef(null);

  if (!text) return children;

  const handleEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition(rect.top < 120 ? 'bottom' : 'top');
    }
    setShow(true);
  };

  const posClass = position === 'bottom'
    ? 'top-full mt-2 left-1/2 -translate-x-1/2'
    : 'bottom-full mb-2 left-1/2 -translate-x-1/2';

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`absolute z-[100] ${posClass} px-3 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg shadow-2xl text-xs text-zinc-300 w-max max-w-[280px] leading-relaxed pointer-events-none animate-fade-in`}>
          {text}
        </div>
      )}
    </div>
  );
}
