"""SPA fallback HTTP server — python 替 身 (404 -> index.html)"""
import http.server
import os
import sys

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        if code == 404:
            # 找 index.html (在 /english-app/ 下)
            path = self.translate_path(self.path)
            base = os.path.dirname(path) if os.path.isfile(path) is False else os.path.dirname(path)
            # 找 .html fallback
            for candidate in [
                self.translate_path(self.path.rstrip('/') + '/index.html'),
                self.translate_path(self.path + '/index.html'),
                self.translate_path('/english-app/index.html'),
            ]:
                if os.path.isfile(candidate):
                    self.path = '/' + os.path.relpath(candidate, os.getcwd()).replace(os.sep, '/')
                    return self.do_GET()
        super().send_error(code, message, explain)

if __name__ == '__main__':
    os.chdir('dist')
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), SPAHandler)
    print(f'SPA fallback server: http://127.0.0.1:{port}/')
    server.serve_forever()
