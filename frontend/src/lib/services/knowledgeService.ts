// ============================================================================
// Knowledge Service
// Reads the practice knowledge base from FastAPI / Supabase (knowledge_documents
// + knowledge_chunks). Pure database-driven, no mock fallback.
// ============================================================================

import { adminFetch } from './adminFetch';

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  source?: string;
  createdAt?: string;
  chunks: string[];
}

export async function getKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  const data = await adminFetch<any[]>('/api/knowledge');
  return data.map((d: any) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    source: d.source ?? undefined,
    createdAt: d.created_at,
    chunks: Array.isArray(d.chunks) ? d.chunks : [],
  }));
}
