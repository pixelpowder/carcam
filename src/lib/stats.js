export function movingAverage(data, key, window = 7) {
  return data.map((d, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((s, v) => s + (v[key] || 0), 0) / slice.length;
    return { ...d, [`${key}_ma`]: Math.round(avg * 100) / 100 };
  });
}

export function addBollingerBands(data, key, window = 7, multiplier = 2) {
  return data.map((d, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const values = slice.map(v => v[key] || 0);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return {
      ...d,
      [`${key}_ma`]: Math.round(mean * 100) / 100,
      [`${key}_upper`]: Math.round((mean + multiplier * stdDev) * 100) / 100,
      [`${key}_lower`]: Math.round(Math.max(0, mean - multiplier * stdDev) * 100) / 100,
    };
  });
}

export function detectAnomalies(data, key, window = 7, threshold = 2) {
  const withBands = addBollingerBands(data, key, window, threshold);
  return withBands.map(d => ({
    ...d,
    [`${key}_anomaly`]: d[key] > d[`${key}_upper`] ? 'high' : d[key] < d[`${key}_lower`] ? 'low' : null,
  }));
}

export function zScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

export function linearRegression(data, xKey, yKey) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const sumX = data.reduce((s, d) => s + d[xKey], 0);
  const sumY = data.reduce((s, d) => s + d[yKey], 0);
  const sumXY = data.reduce((s, d) => s + d[xKey] * d[yKey], 0);
  const sumX2 = data.reduce((s, d) => s + d[xKey] * d[xKey], 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  const ssRes = data.reduce((s, d) => s + Math.pow(d[yKey] - (slope * d[xKey] + intercept), 2), 0);
  const ssTot = data.reduce((s, d) => s + Math.pow(d[yKey] - meanY, 2), 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}
