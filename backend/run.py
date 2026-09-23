import os
import sys
from pathlib import Path

# Ensure the root directory containing 'backend' is on sys.path
_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# Also ensure current backend directory is on sys.path
_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

import uvicorn
from backend.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"[Aura] Starting FastAPI server on 0.0.0.0:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
