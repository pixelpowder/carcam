'use client';
import { useState, useEffect } from 'react';
import { Plus, Tag, X } from 'lucide-react';

const TYPES = {
  content: { label: 'Content', color: '#22c55e' },
  backlinks: { label: 'Backlinks', color: '#3b82f6' },
  technical: { label: 'Technical', color: '#f59e0b' },
  algorithm: { label: 'Algorithm', color: '#ef4444' },
  general: { label: 'General', color: '#a855f7' },
};

export default function Annotations({ chartDates = [] }) {
  const [annotations, setAnnotations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState('general');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/annotations')
      .then(r => r.json())
      .then(d => { if (d.success) setAnnotations(d.data || []); })
      .catch(() => {});
  }, []);

  const addAnnotation = async () => {
    if (!newDate || !newText) return;
    setSaving(true);
    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate, text: newText, type: newType }),
      });
      const d = await res.json();
      if (d.success) setAnnotations(d.data);
      setNewDate(''); setNewText(''); setShowForm(false);
    } catch (e) {}
    setSaving(false);
  };

  // Filter annotations to those within chart date range
  const visible = annotations.filter(a =>
    chartDates.length === 0 || chartDates.includes(a.date)
  );

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Tag size={12} className="text-zinc-500" />
          <span className="text-xs text-zinc-500">{visible.length} annotations</span>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
          <Plus size={12} /> Add
        </button>
      </div>

      {showForm && (
        <div className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 mb-3 space-y-2">
          <div className="flex gap-2">
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="px-2 py-1 bg-[#1a1d27] border border-[#2a2d3a] rounded text-xs text-white outline-none" />
            <select value={newType} onChange={e => setNewType(e.target.value)}
              className="px-2 py-1 bg-[#1a1d27] border border-[#2a2d3a] rounded text-xs text-zinc-400 outline-none">
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <input type="text" value={newText} onChange={e => setNewText(e.target.value)}
            placeholder="What happened? e.g. Published new cluster content"
            className="w-full px-2 py-1 bg-[#1a1d27] border border-[#2a2d3a] rounded text-xs text-white placeholder-zinc-600 outline-none" />
          <button onClick={addAnnotation} disabled={saving || !newDate || !newText}
            className="px-3 py-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/20 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {visible.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visible.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded px-2 py-1">
              <div className="w-2 h-2 rounded-full" style={{ background: TYPES[a.type]?.color || '#a855f7' }} />
              <span className="text-zinc-500">{a.date.slice(5)}</span>
              <span className="text-zinc-300">{a.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
