'use client';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';

export function LinkedKeyword({ keyword, children }) {
  const router = useRouter();
  return (
    <span
      className="cursor-pointer hover:text-blue-400 hover:underline underline-offset-2 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/keywords?q=${encodeURIComponent(keyword)}`);
      }}
      title={`View "${keyword}" in Keywords`}
    >
      {children || keyword}
    </span>
  );
}

export function LinkedPage({ url, children }) {
  const router = useRouter();
  const shortUrl = url.replace('https://www.montenegrocarhire.com', '');
  return (
    <span
      className="cursor-pointer hover:text-blue-400 hover:underline underline-offset-2 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/pages-perf?q=${encodeURIComponent(shortUrl)}`);
      }}
      title={`View "${shortUrl}" in Pages`}
    >
      {children || shortUrl}
    </span>
  );
}

export function LinkedCluster({ cluster, children }) {
  const router = useRouter();
  return (
    <span
      className="cursor-pointer hover:text-purple-400 hover:underline underline-offset-2 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/clusters?expand=${encodeURIComponent(cluster)}`);
      }}
      title={`View "${cluster}" cluster`}
    >
      {children || cluster}
    </span>
  );
}

export function LinkedRankTracker({ keyword, children, showIcon = false }) {
  const router = useRouter();
  return (
    <span
      className="cursor-pointer hover:text-blue-400 hover:underline underline-offset-2 transition-colors inline-flex items-center gap-1"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/rank-tracker?kw=${encodeURIComponent(keyword)}`);
      }}
      title={`Track "${keyword}" in Position Tracker`}
    >
      {children || keyword}
      {showIcon && <TrendingUp size={10} className="opacity-50" />}
    </span>
  );
}

export function LinkedContentAudit({ url, children }) {
  const router = useRouter();
  return (
    <span
      className="cursor-pointer hover:text-green-400 hover:underline underline-offset-2 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/content?q=${encodeURIComponent(url.replace('https://www.montenegrocarhire.com', ''))}`);
      }}
      title="View in Content Audit"
    >
      {children || 'Audit'}
    </span>
  );
}
