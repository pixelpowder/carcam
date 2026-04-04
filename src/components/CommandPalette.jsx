'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, Layers, FileText, Link2, Users, Sparkles, FileSearch, FolderOpen, Lightbulb, ClipboardCheck, ListChecks, Target } from 'lucide-react';

const COMMANDS = [
  { name: 'Overview', path: '/', icon: LayoutDashboard, keywords: 'home dashboard kpi' },
  { name: 'Clusters', path: '/clusters', icon: Layers, keywords: 'cluster health network tree' },
  { name: 'Keywords', path: '/keywords', icon: Search, keywords: 'keyword tracking position rank' },
  { name: 'Pages', path: '/pages-perf', icon: FileText, keywords: 'page performance url impressions' },
  { name: 'Backlinks', path: '/backlinks', icon: Link2, keywords: 'backlink referring domain' },
  { name: 'Competitors', path: '/competitors', icon: Users, keywords: 'competitor gap analysis domain' },
  { name: 'Research', path: '/research', icon: Sparkles, keywords: 'keyword suggestion volume trends brief' },
  { name: 'Link Building', path: '/link-building', icon: Link2, keywords: 'link building internal external opportunity' },
  { name: 'Content Audit', path: '/content', icon: FileSearch, keywords: 'content audit crawl meta description' },
  { name: 'Cluster Audit', path: '/cluster-audit', icon: ClipboardCheck, keywords: 'cluster audit health check' },
  { name: 'Listing Audit', path: '/listing-audit', icon: ListChecks, keywords: 'listing audit backlink' },
  { name: 'Categories', path: '/categories', icon: FolderOpen, keywords: 'category meta on-page' },
  { name: 'Strategy', path: '/strategy', icon: Lightbulb, keywords: 'strategy recommendation action' },
  { name: 'Search keyword...', path: '/keywords?q=', icon: Target, keywords: 'find search keyword', isSearch: true },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = query
    ? COMMANDS.filter(c => {
        const q = query.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.keywords.includes(q);
      })
    : COMMANDS;

  const handleSelect = (cmd) => {
    if (cmd.isSearch && query) {
      router.push(`/keywords?q=${encodeURIComponent(query)}`);
    } else {
      router.push(cmd.path);
    }
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIndex]) handleSelect(filtered[selectedIndex]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2d3a]">
          <Search size={16} className="text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, keywords, features..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
          />
          <kbd className="text-xs text-zinc-600 bg-[#0f1117] rounded px-1.5 py-0.5 border border-[#2a2d3a]">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.path}
                onClick={() => handleSelect(cmd)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                  i === selectedIndex ? 'bg-blue-500/10 text-blue-400' : 'text-zinc-400 hover:bg-white/[0.02]'
                }`}
              >
                <Icon size={16} />
                <span className="text-sm">{cmd.isSearch && query ? `Search "${query}" in keywords` : cmd.name}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-sm text-zinc-600 text-center">No results for &quot;{query}&quot;</p>
          )}
        </div>
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[#2a2d3a] text-xs text-zinc-600">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
