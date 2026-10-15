// Multiplayer Client: Real-Time Player Synchronization, Voxel Sync & Chat
class MultiplayerManager {
    constructor(scene, world, player) {
        this.scene = scene;
        this.world = world;
        this.player = player;

        this.ws = null;
        this.connected = false;
        this.selfId = null;
        this.remotePlayers = new Map(); // id -> { mesh, targetPos, targetYaw, targetPitch, legL, legR, armL, armR, nameSprite, walkCycle }
        this.lastSendTime = 0;

        this.initChatUI();
        this.connect();
    }

    connect() {
        // Automatically connect to the host machine's IP / domain on WS port 8081
        const host = window.location.hostname || 'localhost';
        const wsUrl = `ws://${host}:8081`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.connected = true;
                this.updateStatusBadge(true);
                if (window.gameUI) {
                    window.gameUI.showNotification("🌐 Connected to Multiplayer Server!");
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    console.error("Invalid WS message:", e);
                }
            };

            this.ws.onclose = () => {
                this.connected = false;
                this.updateStatusBadge(false);
                // Clear remote player meshes
                for (let p of this.remotePlayers.values()) {
                    this.scene.remove(p.mesh);
                }
                this.remotePlayers.clear();
            };

            this.ws.onerror = () => {
                this.connected = false;
                this.updateStatusBadge(false);
            };
        } catch (e) {
            console.log("Multiplayer server offline, running in single-player mode.");
            this.updateStatusBadge(false);
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'init':
                this.selfId = data.selfId;
                // Sync initial block modifications
                if (data.blocks && Array.isArray(data.blocks)) {
                    data.blocks.forEach(b => {
                        this.world.setBlock(b.x, b.y, b.z, b.id, false);
                    });
                    this.world.meshAllChunks();
                }
                // Spawn existing players
                if (data.players && Array.isArray(data.players)) {
                    data.players.forEach(p => {
                        if (p.id !== this.selfId) {
                            this.spawnRemotePlayer(p);
                        }
                    });
                }
                this.updatePlayerCount();
                break;

            case 'player_join':
                if (data.player && data.player.id !== this.selfId) {
                    this.spawnRemotePlayer(data.player);
                    this.addChatMessage('System', `${data.player.id} joined the game!`, '#a855f7');
                    this.updatePlayerCount();
                }
                break;

            case 'player_leave':
                if (this.remotePlayers.has(data.id)) {
                    const p = this.remotePlayers.get(data.id);
                    this.scene.remove(p.mesh);
                    this.remotePlayers.delete(data.id);
                    this.addChatMessage('System', `${data.id} left the game.`, '#888888');
                    this.updatePlayerCount();
                }
                break;

            case 'move':
                if (data.id && data.id !== this.selfId && this.remotePlayers.has(data.id)) {
                    const p = this.remotePlayers.get(data.id);
                    p.targetPos.set(data.x, data.y, data.z);
                    p.targetYaw = data.yaw || 0;
                    p.targetPitch = data.pitch || 0;
                    p.heldItem = data.heldItem || '';
                    this.updateRemoteHeldMesh(p);
                }
                break;

            case 'block':
                // Remote block change
                if (data.sender !== this.selfId) {
                    this.world.setBlock(data.x, data.y, data.z, data.id, true);
                    if (data.id === BLOCKS.AIR) {
                        window.audioManager.playBlockBreak();
                        this.player.spawnBreakParticles(new THREE.Vector3(data.x + 0.5, data.y + 0.5, data.z + 0.5));
                    } else {
                        window.audioManager.playBlockPlace();
                    }
                }
                break;

            case 'chat':
                this.addChatMessage(data.sender, data.text, '#ffd700');
                break;
        }
    }

    spawnRemotePlayer(pData) {
        if (this.remotePlayers.has(pData.id)) return;

        const group = new THREE.Group();
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xcd8c6a });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0x00a8a8 }); // Cyan Steve shirt
        const pantsMat = new THREE.MeshLambertMaterial({ color: 0x223388 }); // Blue jeans
        const hairMat = new THREE.MeshLambertMaterial({ color: 0x4a2e18 });

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
        head.position.y = 1.6;
        group.add(head);

        // Hair cap
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.52), hairMat);
        hair.position.set(0, 0.18, 0);
        head.add(hair);

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), shirtMat);
        torso.position.y = 1.05;
        group.add(torso);

        // Arms
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), skinMat);
        armL.position.set(-0.35, 1.05, 0);
        group.add(armL);

        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), skinMat);
        armR.position.set(0.35, 1.05, 0);
        group.add(armR);

        // Held item mesh in right hand
        const heldMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.3, 0.08),
            new THREE.MeshLambertMaterial({ color: 0x9e7b4e })
        );
        heldMesh.position.set(0, -0.25, 0.15);
        heldMesh.rotation.x = -Math.PI / 4;
        armR.add(heldMesh);

        // Legs
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), pantsMat);
        legL.position.set(-0.13, 0.35, 0);
        group.add(legL);

        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), pantsMat);
        legR.position.set(0.13, 0.35, 0);
        group.add(legR);

        // Floating Name Tag
        const nameSprite = this.createNameSprite(pData.id);
        nameSprite.position.set(0, 2.15, 0);
        group.add(nameSprite);

        group.position.set(pData.x, pData.y, pData.z);
        this.scene.add(group);

        this.remotePlayers.set(pData.id, {
            id: pData.id,
            mesh: group,
            head,
            armL,
            armR,
            legL,
            legR,
            heldMesh,
            targetPos: new THREE.Vector3(pData.x, pData.y, pData.z),
            targetYaw: pData.yaw || 0,
            targetPitch: pData.pitch || 0,
            heldItem: pData.heldItem || '',
            walkCycle: 0
        });
    }

    createNameSprite(text) {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 64;
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.roundRect(10, 10, 236, 44, 8);
        ctx.fill();
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);

        const tex = new THREE.CanvasTexture(c);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(1.6, 0.4, 1);
        return sprite;
    }

    updateRemoteHeldMesh(p) {
        if (!p.heldMesh) return;
        let color = 0x9e7b4e;
        if (p.heldItem.includes('diamond')) color = 0x2ee7d6;
        else if (p.heldItem.includes('gold')) color = 0xf5b825;
        else if (p.heldItem.includes('iron')) color = 0xd8af93;
        else if (p.heldItem === 'key') color = 0xf5b825;
        p.heldMesh.material.color.setHex(color);
    }

    // Broadcast local player movement to server
    sendMovement() {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const held = this.player.getHeldItem();
        const payload = JSON.stringify({
            type: 'move',
            x: Number(this.player.position.x.toFixed(2)),
            y: Number(this.player.position.y.toFixed(2)),
            z: Number(this.player.position.z.toFixed(2)),
            yaw: Number(this.player.yaw.toFixed(2)),
            pitch: Number(this.player.pitch.toFixed(2)),
            heldItem: held ? held.type : ''
        });
        this.ws.send(payload);
    }

    // Broadcast local block change
    sendBlockChange(x, y, z, blockId) {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const payload = JSON.stringify({
            type: 'block',
            x, y, z,
            id: blockId
        });
        this.ws.send(payload);
    }

    // Send chat message
    sendChatMessage(text) {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const payload = JSON.stringify({
            type: 'chat',
            text
        });
        this.ws.send(payload);
    }

    initChatUI() {
        // Chat container
        this.chatContainer = document.createElement('div');
        this.chatContainer.id = 'ingame-chat-container';
        this.chatContainer.innerHTML = `
            <div id="chat-messages"></div>
            <div id="chat-input-wrapper">
                <input type="text" id="chat-input" placeholder="Press Enter to chat..." maxlength="100">
            </div>
        `;
        document.body.appendChild(this.chatContainer);

        this.chatMessagesEl = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');

        // Keybindings for chat (<kbd>T</kbd> or <kbd>Enter</kbd>)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyT' && document.activeElement !== this.chatInput && this.player.isLocked) {
                e.preventDefault();
                document.exitPointerLock();
                this.chatInput.focus();
            } else if (e.code === 'Enter') {
                if (document.activeElement === this.chatInput) {
                    const text = this.chatInput.value.trim();
                    if (text) {
                        this.sendChatMessage(text);
                        this.chatInput.value = '';
                    }
                    this.chatInput.blur();
                    document.body.requestPointerLock();
                } else if (this.player.isLocked) {
                    document.exitPointerLock();
                    this.chatInput.focus();
                }
            }
        });

        // Chat styles
        const style = document.createElement('style');
        style.textContent = `
            #ingame-chat-container {
                position: absolute;
                bottom: 80px;
                left: 20px;
                width: 380px;
                pointer-events: none;
                z-index: 25;
                font-family: 'Courier New', monospace;
            }
            #chat-messages {
                display: flex;
                flex-direction: column;
                gap: 4px;
                max-height: 180px;
                overflow-y: hidden;
                margin-bottom: 8px;
            }
            .chat-msg {
                background: rgba(10, 10, 10, 0.7);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 13px;
                text-shadow: 1px 1px 2px #000;
                animation: fadeIn 0.2s ease-out;
            }
            #chat-input-wrapper {
                pointer-events: auto;
            }
            #chat-input {
                width: 100%;
                background: rgba(0, 0, 0, 0.75);
                border: 2px solid #555;
                color: #fff;
                padding: 6px 10px;
                border-radius: 4px;
                outline: none;
                font-family: inherit;
                font-size: 13px;
            }
            #chat-input:focus {
                border-color: #ffd700;
                background: rgba(0, 0, 0, 0.9);
            }
            #online-badge {
                cursor: pointer;
            }
            #online-badge.online {
                color: #48b85b;
            }
            #online-badge.offline {
                color: #888;
            }
        `;
        document.head.appendChild(style);
    }

    addChatMessage(sender, text, color = '#fff') {
        const msgEl = document.createElement('div');
        msgEl.className = 'chat-msg';
        msgEl.innerHTML = `<b style="color: ${color};">&lt;${sender}&gt;</b> ${text}`;
        this.chatMessagesEl.appendChild(msgEl);

        // Keep at most 8 messages
        while (this.chatMessagesEl.children.length > 8) {
            this.chatMessagesEl.removeChild(this.chatMessagesEl.firstChild);
        }

        // Auto fade out after 8 seconds
        setTimeout(() => {
            msgEl.style.transition = 'opacity 0.6s';
            msgEl.style.opacity = '0';
            setTimeout(() => {
                if (msgEl.parentNode) msgEl.parentNode.removeChild(msgEl);
            }, 600);
        }, 8000);
    }

    updateStatusBadge(isOnline) {
        let badge = document.getElementById('online-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.id = 'online-badge';
            const topHudRight = document.querySelector('#top-hud .hud-panel:last-child');
            if (topHudRight) topHudRight.prepend(badge);
        }
        if (isOnline) {
            badge.className = 'online';
            this.updatePlayerCount();
        } else {
            badge.className = 'offline';
            badge.textContent = '⚪ Solo Mode';
        }
    }

    updatePlayerCount() {
        const badge = document.getElementById('online-badge');
        if (badge && this.connected) {
            const count = this.remotePlayers.size + 1;
            badge.textContent = `🟢 Online: ${count} Player${count > 1 ? 's' : ''}`;
        }
    }

    update(dt) {
        // Send our movement 20 times per second
        const now = performance.now();
        if (now - this.lastSendTime > 50) {
            this.sendMovement();
            this.lastSendTime = now;
        }

        // Smoothly interpolate remote player positions and walk animations
        for (let p of this.remotePlayers.values()) {
            const prevPos = p.mesh.position.clone();
            p.mesh.position.lerp(p.targetPos, dt * 12);
            p.mesh.rotation.y = p.targetYaw + Math.PI;

            // Pitch head up/down
            p.head.rotation.x = -p.targetPitch;

            // Walk animation if moving
            const movedDist = p.mesh.position.distanceTo(prevPos);
            if (movedDist > 0.01) {
                p.walkCycle += dt * 10;
                const swing = Math.sin(p.walkCycle) * 0.55;
                p.legL.rotation.x = swing;
                p.legR.rotation.x = -swing;
                p.armL.rotation.x = -swing * 0.8;
                p.armR.rotation.x = swing * 0.8;
            } else {
                p.legL.rotation.x *= 0.8;
                p.legR.rotation.x *= 0.8;
                p.armL.rotation.x *= 0.8;
                p.armR.rotation.x *= 0.8;
            }
        }
    }
}
window.MultiplayerManager = MultiplayerManager;
