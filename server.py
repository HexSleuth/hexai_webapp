#!/usr/bin/env python3
"""
HEX AI Web Application Server
Serves the static files from the 'static/' directory.
Run with: python server.py
"""

import http.server
import socketserver
import webbrowser
import threading
import os
import sys

PORT = 8080
DIRECTORY = "static"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def main():
    # Change to the script's directory to ensure correct relative paths
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        httpd = socketserver.TCPServer(("", PORT), Handler)
    except OSError:
        print(f"❌ Port {PORT} is already in use. Please close the other server or change the port.")
        sys.exit(1)

    url = f"http://localhost:{PORT}"
    print(f"╔═══════════════════════════════════════════════╗")
    print(f"║  ⬢ HEX AI Web Application (Static Server)     ║")
    print(f"║  Serving from: {DIRECTORY}/                   ║")
    print(f"║  Open: {url}                                 ║")
    print(f"║  Press Ctrl+C to stop the server.             ║")
    print(f"╚═══════════════════════════════════════════════╝")

    # Open the browser after a short delay
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped. Goodbye!")

if __name__ == "__main__":
    main()