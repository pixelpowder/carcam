'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Layers, Search, FileText, FolderOpen, Lightbulb, Upload, Menu, X, Link2, Users, Sparkles, FileSearch, ClipboardCheck, ListChecks, Smartphone, Globe, GripVertical, Target, FileEdit, Zap, Radar, TrendingUp, Settings, Cpu } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useState, useEffect } from 'react';
import { useSite } from '@/context/SiteContext';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DEFAULT_NAV = [
  { id: 's-dashboard', section: 'Dashboard' },
  { id: 'overview', href: '/', label: 'Overview', icon: 'LayoutDashboard', tooltip: 'Performance overview with KPIs and trends' },
  { id: 'keywords', href: '/keywords', label: 'Keywords', icon: 'Search', tooltip: 'All tracked keywords with position and CTR data' },
  { id: 'pages', href: '/pages-perf', label: 'Pages', icon: 'FileText', tooltip: 'Individual page performance metrics' },
  { id: 's-analysis', section: 'Analysis' },
  { id: 'mobile', href: '/mobile', label: 'Mobile', icon: 'Smartphone', tooltip: 'Mobile vs desktop performance' },
  { id: 'regional', href: '/regional', label: 'Regional', icon: 'Globe', tooltip: 'Country-level keyword analysis' },
  { id: 's-tools', section: 'Tools' },
  { id: 'keyword-research', href: '/keyword-research', label: 'Keyword Research', icon: 'Radar', tooltip: 'Longtail discovery, related keywords, content scoring' },
  { id: 'rank-tracker', href: '/rank-tracker', label: 'Rank Tracker', icon: 'TrendingUp', tooltip: '90-day keyword position history with movers/losers' },
  { id: 's-manage', section: 'Manage' },
  { id: 'sites', href: '/sites', label: 'Sites', icon: 'Globe', tooltip: 'All car hire sites with live status' },
];

const ICONS = { LayoutDashboard, Layers, Search, FileText, FolderOpen, Lightbulb, Link2, Users, Sparkles, FileSearch, ClipboardCheck, ListChecks, Smartphone, Globe, Target, FileEdit, Zap, Radar, TrendingUp, Settings, Cpu };

function SortableNavItem({ item, active, onClick, collapsed, onNavigate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  if (item.section) {
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <button onClick={onClick}
          className={`w-full text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-3 pt-3 mt-2 border-t border-[#2a2d3a] pb-1 flex items-center justify-between hover:text-zinc-400 transition-all`}>
          {item.section}
          <span className="flex items-center gap-1">
            <span className="text-[8px]">{collapsed ? '▸' : '▾'}</span>
            <span {...listeners} className="cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-500"><GripVertical size={10} /></span>
          </span>
        </button>
      </div>
    );
  }

  const Icon = ICONS[item.icon] || LayoutDashboard;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <Link
        title={item.tooltip}
        href={item.href}
        onClick={(e) => { if (isDragging) e.preventDefault(); else onNavigate?.(); }}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          active ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
        }`}
      >
        <Icon size={16} />
        {item.label}
      </Link>
    </div>
  );
}

export default function Sidebar({ onUploadClick }) {
  const pathname = usePathname();
  const { activeSite } = useSite();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [navItems, setNavItems] = useState(DEFAULT_NAV);

  // Load saved order
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kotor-nav-order-v2');
      if (saved) {
        const ids = JSON.parse(saved);
        const ordered = ids.map(id => DEFAULT_NAV.find(n => n.id === id)).filter(Boolean);
        // Add any new items not in saved order
        DEFAULT_NAV.forEach(n => { if (!ordered.find(o => o.id === n.id)) ordered.push(n); });
        setNavItems(ordered);
      }
    } catch (e) {}
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setNavItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id);
      const newIdx = prev.findIndex(i => i.id === over.id);
      const next = arrayMove(prev, oldIdx, newIdx);
      try { localStorage.setItem('kotor-nav-order-v2', JSON.stringify(next.map(n => n.id))); } catch (e) {}
      return next;
    });
  };

  let currentSection = null;

  return (
    <>
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile backdrop — click to close */}
      {open && <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#1a1d27] border-r border-[#2a2d3a] z-40 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 border-b border-[#2a2d3a]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="white" strokeWidth="1.5"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="6.5" stroke="white" strokeWidth="1" strokeDasharray="2 2"/></svg>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">CarCam</h1>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-zinc-500">Car Hire Analytics <span className="text-zinc-600">v1.6.1</span></p>
            <ThemeToggle />
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">Press <kbd className="bg-[#0f1117] px-1 rounded border border-[#2a2d3a]">Ctrl+K</kbd> to search</p>
        </div>

        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto overscroll-contain scrollbar-thin">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={navItems.map(n => n.id)} strategy={verticalListSortingStrategy}>
              {navItems.map((item) => {
                if (item.section) {
                  currentSection = item.section;
                  return (
                    <SortableNavItem key={item.id} item={item} collapsed={collapsed[item.section]}
                      onClick={() => setCollapsed(p => ({ ...p, [item.section]: !p[item.section] }))} />
                  );
                }
                if (collapsed[currentSection]) return null;
                return (
                  <div key={item.id} className="group">
                    <SortableNavItem item={item} active={pathname === item.href} onNavigate={() => setOpen(false)} />
                  </div>
                );
              })}
            </SortableContext>
          </DndContext>
        </nav>

        <div className="p-4 border-t border-[#2a2d3a] space-y-2">
          <Link href="/sites" onClick={() => setOpen(false)} className="block px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/15 transition-colors">
            <p className="text-[10px] font-medium text-blue-400 truncate">{activeSite.label}</p>
            <p className="text-[9px] text-zinc-600 truncate">{activeSite.domain}</p>
          </Link>
          <p className="text-xs text-zinc-600 text-center">v1.6.1</p>
        </div>
      </aside>
    </>
  );
}
