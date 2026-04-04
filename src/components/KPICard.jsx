'use client';
import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Tooltip from '@/components/Tooltip';

function AnimatedValue({ value }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    // Extract numeric part
    const numMatch = String(value).match(/([\d,]+\.?\d*)/);
    const prevMatch = String(prevRef.current).match(/([\d,]+\.?\d*)/);
    if (!numMatch) { setDisplay(value); prevRef.current = value; return; }

    const target = parseFloat(numMatch[1].replace(/,/g, ''));
    const start = prevMatch ? parseFloat(prevMatch[1].replace(/,/g, '')) : 0;
    const prefix = String(value).slice(0, numMatch.index);
    const suffix = String(value).slice(numMatch.index + numMatch[1].length);
    const hasComma = numMatch[1].includes(',');
    const hasDecimal = numMatch[1].includes('.');
    const decimals = hasDecimal ? (numMatch[1].split('.')[1]?.length || 0) : 0;

    const duration = 800;
    const startTime = performance.now();
    let raf;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      const formatted = hasComma ? current.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : decimals > 0 ? current.toFixed(decimals) : Math.round(current).toString();
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    prevRef.current = value;
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [value]);

  return <>{display}</>;
}

export default function KPICard({ title, value, subtitle, icon: Icon, color = 'blue', trend, tooltip, compact = false }) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    green: 'from-green-500/20 to-green-500/5 border-green-500/20 text-green-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
    red: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400',
  };

  const trendColor = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-zinc-500';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  const card = compact ? (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg px-2.5 py-2 transition-all hover:scale-[1.02] w-full`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[8px] font-medium text-zinc-500 uppercase tracking-wider leading-tight">{title}</p>
          <p className="text-sm font-bold text-white leading-tight mt-0.5"><AnimatedValue value={value} /></p>
          {subtitle && <p className="text-[8px] text-zinc-500">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-1">
          {Icon && <Icon size={11} className="opacity-30" />}
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center gap-0.5 text-[8px] font-medium ${trendColor}`}>
              <TrendIcon size={8} />
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 transition-all hover:scale-[1.02] w-full`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
        {Icon && <Icon size={14} className="opacity-40" />}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xl font-bold text-white"><AnimatedValue value={value} /></p>
          {subtitle && <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${trendColor}`}>
            <TrendIcon size={10} />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );

  if (tooltip) return <Tooltip text={tooltip}>{card}</Tooltip>;
  return card;
}
