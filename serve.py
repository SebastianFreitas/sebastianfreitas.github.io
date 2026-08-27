"""Local static server with cache disabled.

Python's default http.server sends nothing that stops the browser
caching scripts. Opening index.html as a file always reads disk;
http://127.0.0.1:8000 was often served by a leftover Service Worker
or disk cache from another project — only a couple of files hit
this process, and the bridge looked dead while file:// looked fine.

Default port is 8765 so we don't share that haunted :8000 origin.
"""

from __future__ import annotations

import functools
import http.server
import os
import sys


PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **getattr(http.server.SimpleHTTPRequestHandler, "extensions_map", {}),
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".json": "application/json",
    }

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        # Drop HTTP cache for this origin (not localStorage)
        if self.path.startswith("/") and not self.path.startswith("/media/"):
            self.send_header("Clear-Site-Data", '"cache"')
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("[disk] " + (fmt % args) + "\n")


def main() -> None:
    os.chdir(ROOT)
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("0.0.0.0", PORT), handler) as httpd:
        print("")
        print("  *** Portfolio no-cache server ***")
        print(f"  Folder:  {ROOT}")
        print(f"  Open:    http://127.0.0.1:{PORT}/?reset=1")
        print("  Cache:   DISABLED — every script must show up as [disk] below")
        print("")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
