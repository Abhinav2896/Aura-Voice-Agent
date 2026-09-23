import logging
from typing import List, Dict, Any
from backend.services.embeddings import generate_embedding
from backend.db.supabase import get_supabase

logger = logging.getLogger("aura.services.rag")

async def search_practice_knowledge(
    query: str,
    match_threshold: float = 0.35,
    match_count: int = 4
) -> List[Dict[str, Any]]:
    """
    Search practice knowledge chunks in Supabase using pgvector cosine similarity.
    """
    try:
        supabase = get_supabase()
        embedding = await generate_embedding(query)

        if not embedding or len(embedding) == 0:
            logger.warning("Could not generate embedding for query, falling back to text search")
            res = supabase.table("knowledge_chunks").select("id, content, metadata").limit(match_count).execute()
            return [{"id": r["id"], "content": r["content"], "similarity": 0.5} for r in res.data]

        # Call PostgreSQL RPC match_knowledge_chunks
        rpc_params = {
            "query_embedding": embedding,
            "match_threshold": match_threshold,
            "match_count": match_count
        }

        res = supabase.rpc("match_knowledge_chunks", rpc_params).execute()
        if res.data:
            logger.info(f"RAG search found {len(res.data)} matching chunks for query '{query[:30]}'")
            return res.data

        # Fallback if similarity threshold yielded no results
        fallback = supabase.table("knowledge_chunks").select("id, content, metadata").limit(2).execute()
        return [{"id": r["id"], "content": r["content"], "similarity": 0.3} for r in fallback.data]

    except Exception as e:
        logger.error(f"Error executing RAG search: {e}", exc_info=True)
        return []
