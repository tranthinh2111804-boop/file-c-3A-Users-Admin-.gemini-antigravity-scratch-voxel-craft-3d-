import asyncio
import http.server
import json
import os
import socketserver
import threading
import webbrowser
import websockets

HTTP_PORT = 8080
WS_PORT = 8081

# Store connected players & world modifications
connected_clients = set()
players = {}
modified_blocks = {} # (x, y, z) -> blockId

async def ws_handler(websocket):
    client_id = f"Player_{id(websocket) % 1000}"
    connected_clients.add(websocket)
    players[client_id] = {
        "id": client_id,
        "x": 0, "y": 36, "z": 0,
        "yaw": 0, "pitch": 0,
        "heldItem": "wood"
    }

    try:
        # Send initial state: client's own ID, other players, and modified blocks
        init_payload = {
            "type": "init",
            "selfId": client_id,
            "players": list(players.values()),
            "blocks": [{"x": k[0], "y": k[1], "z": k[2], "id": v} for k, v in modified_blocks.items()]
        }
        await websocket.send(json.dumps(init_payload))

        # Broadcast new player join to others
        join_payload = json.dumps({
            "type": "player_join",
            "player": players[client_id]
        })
        for ws in connected_clients:
            if ws != websocket:
                await ws.send(join_payload)

        # Listen for messages
        async for message in websocket:
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "move":
                # Update player state
                players[client_id].update({
                    "x": data.get("x", 0),
                    "y": data.get("y", 0),
                    "z": data.get("z", 0),
                    "yaw": data.get("yaw", 0),
                    "pitch": data.get("pitch", 0),
                    "heldItem": data.get("heldItem", "")
                })
                # Broadcast movement to all other clients
                data["id"] = client_id
                out_msg = json.dumps(data)
                for ws in connected_clients:
                    if ws != websocket:
                        await ws.send(out_msg)

            elif msg_type == "block":
                # Save block change and broadcast to all clients
                bx, by, bz, bId = data["x"], data["y"], data["z"], data["id"]
                modified_blocks[(bx, by, bz)] = bId
                out_msg = json.dumps({
                    "type": "block",
                    "x": bx, "y": by, "z": bz, "id": bId,
                    "sender": client_id
                })
                for ws in connected_clients:
                    if ws != websocket:
                        await ws.send(out_msg)

            elif msg_type == "chat":
                # Broadcast chat message
                text = data.get("text", "").strip()
                if text:
                    out_msg = json.dumps({
                        "type": "chat",
                        "sender": client_id,
                        "text": text[:120]
                    })
                    for ws in connected_clients:
                        await ws.send(out_msg)

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.remove(websocket)
        if client_id in players:
            del players[client_id]
        leave_msg = json.dumps({"type": "player_leave", "id": client_id})
        for ws in connected_clients:
            await ws.send(leave_msg)

def run_http_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            pass # Keep terminal clean
    with socketserver.TCPServer(("0.0.0.0", HTTP_PORT), QuietHandler) as httpd:
        httpd.serve_forever()

async def main():
    # Start HTTP server in a background thread
    t = threading.Thread(target=run_http_server, daemon=True)
    t.start()

    # Get local LAN IP address
    import socket
    lan_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    print("=================================================================")
    print("       3D MINECRAFT ONLINE MULTIPLAYER SERVER RUNNING!           ")
    print("=================================================================")
    print(f"  * Play on this PC:        http://localhost:{HTTP_PORT}")
    print(f"  * Play with friends on WiFi/LAN:")
    print(f"    -> http://{lan_ip}:{HTTP_PORT}")
    print("=================================================================")
    print("  Press Ctrl+C to stop the server.")
    print("=================================================================")

    # Open browser on host PC
    webbrowser.open(f"http://localhost:{HTTP_PORT}")

    # Start WebSocket server
    async with websockets.serve(ws_handler, "0.0.0.0", WS_PORT):
        await asyncio.Future() # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped.")
