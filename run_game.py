import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Clean logging
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")

def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler) as httpd:
            url = f"http://127.0.0.1:{PORT}/index.html"
            print(f"=======================================================")
            print(f"  3D Minecraft Game Server is running!")
            print(f"  Game URL: {url}")
            print(f"  Press Ctrl+C to stop the server.")
            print(f"=======================================================")
            webbrowser.open(url)
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 10048: # Port already in use
            # Try alternate port
            alt_port = 8081
            with socketserver.TCPServer(("127.0.0.1", alt_port), QuietHandler) as httpd:
                url = f"http://127.0.0.1:{alt_port}/index.html"
                print(f"Game URL: {url}")
                webbrowser.open(url)
                httpd.serve_forever()
        else:
            raise e

if __name__ == '__main__':
    start_server()
