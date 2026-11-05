"""
MediaDrop Backend Server Launcher
Starts FastAPI with Uvicorn on http://127.0.0.1:8000
"""
import sys
import uvicorn
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    print("[MediaDrop Backend] Starting FastAPI on http://127.0.0.1:8000 ...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="info")
