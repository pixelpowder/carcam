'use client';

// Pure CSS horizontal bar chart — no SVG, no background rect issues
export default function CSSBarChart({ data, valueKey = 'value', labelKey = 'name', colorKey, color = '#3b82f6', maxValue, height = 'h-6', showValue = true }) {
  if (!data?.length) return null;
  const max = maxValue || Math.max(...data.map(d => d[valueKey] || 0), 1);

  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const pct = Math.max((val / max) * 100, 2);
        const barColor = colorKey ? d[colorKey] : (typeof color === 'function' ? color(d, i) : color);
        return (
          <div key={i} className="flex items-center gap-3 group cursor-default">
            <span className="text-xs text-zinc-400 group-hover:text-zinc-200 w-[140px] truncate text-right flex-shrink-0 transition-colors" title={d[labelKey]}>
              {d[labelKey]}
            </span>
            <div className={`flex-1 ${height} bg-[#2a2d3a]/30 rounded-full overflow-hidden`}>
              <div
                className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 group-hover:brightness-125 group-hover:shadow-lg`}
                style={{ width: `${pct}%`, background: barColor }}
              >
                {showValue && pct > 15 && (
                  <span className="text-[10px] font-semibold text-white/90">{typeof val === 'number' ? val.toLocaleString() : val}</span>
                )}
              </div>
            </div>
            {showValue && pct <= 15 && (
              <span className="text-[10px] text-zinc-500 w-[40px] flex-shrink-0">{typeof val === 'number' ? val.toLocaleString() : val}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Pure CSS vertical bar chart
export function CSSBarChartVertical({ data, valueKey = 'value', labelKey = 'name', colorKey, color = '#3b82f6', maxValue }) {
  if (!data?.length) return null;
  const max = maxValue || Math.max(...data.map(d => d[valueKey] || 0), 1);

  const labelH = 18; // px reserved for label at bottom
  const valH = 16;   // px reserved for value at top

  return (
    <div className="flex gap-2 h-[200px]">
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const pct = Math.max((val / max) * 100, 3);
        const barColor = colorKey ? d[colorKey] : (typeof color === 'function' ? color(d, i) : color);
        return (
          <div key={i} className="flex-1 flex flex-col items-center group cursor-default h-full">
            {/* value */}
            <span className="text-[9px] text-zinc-400 group-hover:text-zinc-200 font-medium transition-colors" style={{ height: valH, lineHeight: `${valH}px` }}>
              {typeof val === 'number' ? val.toLocaleString() : val}
            </span>
            {/* bar track — fixed remaining height */}
            <div className="w-full bg-[#2a2d3a]/30 rounded-t-lg overflow-hidden relative" style={{ flex: 1 }}>
              <div
                className="w-full rounded-t-lg absolute bottom-0 left-0 transition-all duration-500 group-hover:brightness-125"
                style={{ height: `${pct}%`, background: barColor }}
              />
            </div>
            {/* label */}
            <span className="text-[10px] text-zinc-500 truncate max-w-full text-center mt-1" style={{ height: labelH }}>
              {d[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
