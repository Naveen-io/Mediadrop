"""
MediaDrop Production Frontend Static Web Server
Lightweight, zero-external-dependency HTTP server with SPA fallback and MIME support.
"""
import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = 3000

# Determine directory to serve
base_dir = Path(__file__).resolve().parent
if (base_dir / "frontend" / "out").is_dir():
    DIRECTORY = base_dir / "frontend" / "out"
elif (base_dir / "frontend").is_dir() and (base_dir / "frontend" / "index.html").is_file():
    DIRECTORY = base_dir / "frontend"
else:
    DIRECTORY = base_dir / "release" / "netlify"

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def do_GET(self):
        # Normalize requested path
        requested_path = self.translate_path(self.path)
        if not os.path.exists(requested_path) and not self.path.startswith("/_next"):
            # SPA fallback to index.html for client-side routing
            self.path = "/index.html"
        return super().do_GET()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

if __name__ == "__main__":
    if not DIRECTORY.is_dir():
        print(f"[Error] Frontend assets directory not found at: {DIRECTORY}")
        sys.exit(1)
        
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
            print(f"[MediaDrop Frontend] Serving production UI on http://localhost:{PORT}")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[MediaDrop Frontend] Server stopped.")
    except Exception as e:
        print(f"[MediaDrop Frontend] Error: {e}")
        sys.exit(1)
