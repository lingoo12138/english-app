"""SPA fallback HTTP server — python 替 身 (404 -> index.html)
适配 Vite base=/english-app/: URL 含 /english-app/ 前缀时, 映射到 dist/ 根目录
"""
import http.server
import os
import sys

BASE_PREFIX = '/english-app'

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        """Override: 剥 /english-app/ 前缀 (Vite base=)
        默认 SimpleHTTPRequestHandler 把 path join 到 cwd (dist/)
        但 build 输出 没 english-app/ 子目录, 所以 URL /english-app/assets/x.js
        应 映到 dist/assets/x.js
        """
        # 去除 query string 和 fragment
        path = path.split('?')[0].split('#')[0]
        # 剥 前缀
        if path.startswith(BASE_PREFIX + '/'):
            path = path[len(BASE_PREFIX):]
        elif path == BASE_PREFIX:
            path = '/'
        return super().translate_path(path)

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            # SPA fallback: 仅 SPA 路由 (无扩展名 或 .html) 走 index.html
            path = self.path.split('?')[0].split('#')[0]
            _, ext = os.path.splitext(path)
            if ext.lower() in ('.js', '.mjs', '.css', '.json', '.png', '.jpg', '.svg',
                               '.ico', '.webmanifest', '.woff', '.woff2', '.ttf', '.map'):
                # 静态资源不存在, 真 404
                super().send_error(code, message, explain)
                return
            # 找 index.html fallback 候选
            for candidate in [
                self.translate_path(self.path.rstrip('/') + '/index.html'),
                self.translate_path(self.path + '/index.html'),
                self.translate_path('/index.html'),  # dist/index.html (适配 base=)
            ]:
                if os.path.isfile(candidate):
                    self.path = '/' + os.path.relpath(candidate, os.getcwd()).replace(os.sep, '/')
                    return self.do_GET()
        super().send_error(code, message, explain)

if __name__ == '__main__':
    os.chdir('dist')
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    # 修 W129: 加 SO_REUSEADDR, 避免 TIME_WAIT 导致新进程起不来
    socketserver_TCPServer = http.server.ThreadingHTTPServer
    socketserver_TCPServer.allow_reuse_address = True
    server = socketserver_TCPServer(('127.0.0.1', port), SPAHandler)
    print(f'SPA fallback server: http://127.0.0.1:{port}/  (base prefix: {BASE_PREFIX})')
    server.serve_forever()
