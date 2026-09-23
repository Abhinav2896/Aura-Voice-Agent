import logging
from typing import List
import google.generativeai as genai
from backend.config import settings

logger = logging.getLogger("aura.services.embeddings")
genai.configure(api_key=settings.GEMINI_API_KEY)

async def generate_embedding(text: str) -> List[float]:
    """
    Generate 768-dimensional text embedding using Gemini embedding model.
    """
    try:
        clean_text = text.replace("\n", " ").strip()
        if not clean_text:
            return [0.0] * settings.EMBEDDING_DIMENSION

        res = genai.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            content=clean_text,
            output_dimensionality=settings.EMBEDDING_DIMENSION
        )
        embedding = res.get("embedding", [])
        return embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}", exc_info=True)
        return []
