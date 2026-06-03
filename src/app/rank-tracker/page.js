import { redirect } from 'next/navigation';

// Rank Tracker was merged into the Overview at /. This route preserves
// existing bookmarks and the deep-link ?kw= param used by LinkedRankTracker.
export default function RankTrackerRedirect({ searchParams }) {
  const kw = searchParams?.kw;
  redirect(kw ? `/?kw=${encodeURIComponent(kw)}` : '/');
}
