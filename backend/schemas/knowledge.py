from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class KnowledgeQueryRequest(BaseModel):
    query: str
    match_threshold: float = 0.45
    match_count: int = 4

class KnowledgeChunkResponse(BaseModel):
    id: str
    document_id: Optional[str] = None
    content: str
    metadata: Dict[str, Any] = {}
    similarity: float

class PracticeInfoResponse(BaseModel):
    id: str
    name: str
    tagline: str
    phone: str
    address: str
    opening_hours: Dict[str, Any]
    emergency_info: str
    services_offered: List[str]
