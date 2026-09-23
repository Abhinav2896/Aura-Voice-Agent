'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookOpen, Search, ShieldCheck, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { getKnowledgeDocuments } from '@/lib/services';
import type { KnowledgeDocument } from '@/lib/services';
import { formatTimeAgo } from '@/lib/timeAgo';

function prettyCategory(cat: string): string {
  if (!cat) return 'General';
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminKnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocs(await getKnowledgeDocuments());
    } catch (err) {
      console.error('[Knowledge] Error loading knowledge base:', err);
      setError('Unable to load the knowledge base from the practice database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const term = search.toLowerCase();
  const filtered = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(term) ||
      d.category.toLowerCase().includes(term) ||
      d.chunks.some((c) => c.toLowerCase().includes(term))
  );

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Practice Clinical Knowledge Base</h1>
            <p className="text-xs text-gray-500">
              Verified clinical policies, practice opening times, and safety protocols ingested by Aura AI to guide patient conversations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            {docs.length} {docs.length === 1 ? 'Document' : 'Documents'} Loaded
          </span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search guidelines, triage rules, or policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <span className="text-xs text-gray-500 font-medium">
          Showing {filtered.length} knowledge {filtered.length === 1 ? 'module' : 'modules'}
        </span>
      </div>

      {/* Content: error / loading / empty / grid */}
      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center p-8 text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          Loading knowledge base…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center p-8 text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          {docs.length === 0 ? 'No knowledge documents have been added yet.' : 'No documents match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((doc) => (
            <div key={doc.id} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                    {prettyCategory(doc.category)}
                  </span>
                  <span className="text-[11px] text-gray-400">{formatTimeAgo(doc.createdAt)}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mt-1">{doc.title}</h3>
                {doc.source && <p className="text-xs text-gray-500 mt-1 leading-relaxed">Source: {doc.source}</p>}
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-2">
                <span className="text-[11px] font-semibold text-gray-700 block">
                  Core AI Rules ({doc.chunks.length}):
                </span>
                {doc.chunks.length === 0 ? (
                  <p className="text-xs text-gray-400">No indexed content yet for this document.</p>
                ) : (
                  doc.chunks.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
