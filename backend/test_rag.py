import asyncio
from backend.services.rag import search_practice_knowledge

async def main():
    print("Testing RAG vector search for: 'What time does the practice open on Saturday?'")
    results = await search_practice_knowledge("What time does the practice open on Saturday?")
    for idx, r in enumerate(results, 1):
        sim = r.get("similarity", 0)
        content = r.get("content", "")
        print(f"[{idx}] Similarity: {sim:.3f} | Content: {content[:90]}...")

if __name__ == "__main__":
    asyncio.run(main())
