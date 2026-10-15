// First-Person Player Controller, Double Jump, Voxel Physics, Inventory & Crafting
class PlayerController {
    constructor(camera, scene, world) {
        this.camera = camera;
        this.scene = scene;
        this.world = world;

        // Position & Dimensions
        this.position = new THREE.Vector3(0, 36, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.eyeHeight = 1.62;
        this.playerWidth = 0.55;
        this.playerHeight = 1.75;

        // Camera rotation (Euler yaw & pitch)
        this.yaw = 0;
        this.pitch = 0;
        this.isLocked = false;

        // Movement keys
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false
        };

        // Jump & Double-jump mechanics
        this.isGrounded = false;
        this.canDoubleJump = false;
        this.jumpPressedLastFrame = false;

        // Stats
        this.maxHealth = 20;
        this.health = 20;
        this.isDead = false;
        this.invulnerableTimer = 0;

        // Inventory: items map { id: count }
        this.inventory = {
            'dirt': 8,
            'wood': 4,
            'stone': 4
        };

        // Hotbar (9 slots)
        this.hotbar = [
            { type: 'wood', count: 4 },
            { type: 'stone', count: 4 },
            { type: 'dirt', count: 8 },
            null, null, null, null, null, null
        ];
        this.selectedSlot = 0;

        // Selection & Mining
        this.targetBlock = null;
        this.targetFace = null;
        this.breakProgress = 0;
        this.isMining = false;

        // Held item arm / model in 1st person
        this.initHeldItemView();

        // Target highlight box
        this.initTargetWireframe();

        // Particles system
        this.initParticlePool();

        // Projectiles (Arrows)
        this.arrows = [];

        this.setupInputs();
        this.respawnAtSurface();
    }

    initHeldItemView() {
        this.handGroup = new THREE.Group();
        this.camera.add(this.handGroup);
        this.handGroup.position.set(0.35, -0.28, -0.45);
        this.handGroup.rotation.set(0.1, -0.2, 0);

        // Simple voxel arm or held tool mesh
        this.heldMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.35, 0.12),
            new THREE.MeshLambertMaterial({ color: 0x9e7b4e })
        );
        this.heldMesh.rotation.set(0.5, 0.4, 0);
        this.handGroup.add(this.heldMesh);

        this.swingProgress = 0;
        this.isSwinging = false;
    }

    updateHeldMesh() {
        const item = this.getHeldItem();
        let color = 0x9e7b4e;
        let scale = new THREE.Vector3(0.12, 0.35, 0.12);

        if (item) {
            if (item.type.includes('diamond')) color = 0x2ee7d6;
            else if (item.type.includes('gold')) color = 0xf5b825;
            else if (item.type.includes('iron')) color = 0xd8af93;
            else if (item.type.includes('stone')) color = 0x757575;
            else if (item.type === 'key') {
                color = 0xf5b825;
                scale = new THREE.Vector3(0.08, 0.28, 0.08);
            } else if (item.type === 'bow') {
                color = 0x855e34;
                scale = new THREE.Vector3(0.06, 0.35, 0.25);
            } else if (item.type === 'dragon_egg') {
                color = 0x150d23;
                scale = new THREE.Vector3(0.2, 0.25, 0.2);
            }
        }
        this.heldMesh.material.color.setHex(color);
        this.heldMesh.scale.copy(scale);
    }

    initTargetWireframe() {
        const geo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
        const edges = new THREE.EdgesGeometry(geo);
        this.wireframe = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
        );
        this.wireframe.visible = false;
        this.scene.add(this.wireframe);
    }

    initParticlePool() {
        this.particles = [];
        const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        this.particleGeo = geo;
    }

    spawnBreakParticles(pos, colorHex = 0x866043) {
        for (let i = 0; i < 12; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: colorHex });
            const p = new THREE.Mesh(this.particleGeo, mat);
            p.position.set(
                pos.x + (Math.random() - 0.5) * 0.8,
                pos.y + (Math.random() - 0.5) * 0.8,
                pos.z + (Math.random() - 0.5) * 0.8
            );
            p.vel = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 4
            );
            p.life = 0.5 + Math.random() * 0.3;
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    spawnDoubleJumpParticles() {
        // Air ring particles
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const p = new THREE.Mesh(this.particleGeo, mat);
            p.position.set(
                this.position.x + Math.cos(angle) * 0.4,
                this.position.y - 0.2,
                this.position.z + Math.sin(angle) * 0.4
            );
            p.vel = new THREE.Vector3(
                Math.cos(angle) * 3,
                -0.5,
                Math.sin(angle) * 3
            );
            p.life = 0.35;
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    respawnAtSurface() {
        const sy = this.world.getSurfaceHeight(0, 0);
        this.position.set(0, sy + 2, 3);
        this.velocity.set(0, 0, 0);
        this.health = this.maxHealth;
        this.isDead = false;
    }

    setupInputs() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (this.isDead) return;
            switch (e.code) {
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'Space':
                    this.keys.jump = true;
                    this.handleJumpPress();
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys.sprint = true;
                    break;
                case 'Digit1': this.selectSlot(0); break;
                case 'Digit2': this.selectSlot(1); break;
                case 'Digit3': this.selectSlot(2); break;
                case 'Digit4': this.selectSlot(3); break;
                case 'Digit5': this.selectSlot(4); break;
                case 'Digit6': this.selectSlot(5); break;
                case 'Digit7': this.selectSlot(6); break;
                case 'Digit8': this.selectSlot(7); break;
                case 'Digit9': this.selectSlot(8); break;
                case 'KeyE':
                    if (window.gameUI) window.gameUI.toggleCrafting();
                    break;
                case 'KeyF':
                    this.interactWithPortal();
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
                case 'Space': this.keys.jump = false; break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys.sprint = false;
                    break;
            }
        });

        // Mouse look (First Person Only)
        document.addEventListener('mousemove', (e) => {
            if (!this.isLocked) return;
            const sensitivity = 0.0022;
            this.yaw -= e.movementX * sensitivity;
            this.pitch -= e.movementY * sensitivity;

            // Clamp pitch looking straight up/down
            const maxPitch = Math.PI / 2 - 0.05;
            this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
        });

        // Mouse click actions: Left click (Mine / Attack), Right click (Place / Use)
        window.addEventListener('mousedown', (e) => {
            if (!this.isLocked) return;
            if (e.button === 0) { // Left Click
                this.triggerSwing();
                this.handleLeftClick();
            } else if (e.button === 2) { // Right Click
                e.preventDefault();
                this.handleRightClick();
            }
        });

        // Mouse wheel for hotbar scroll
        window.addEventListener('wheel', (e) => {
            if (!this.isLocked) return;
            if (e.deltaY > 0) {
                this.selectSlot((this.selectedSlot + 1) % 9);
            } else if (e.deltaY < 0) {
                this.selectSlot((this.selectedSlot + 8) % 9);
            }
        });

        // Context menu prevention
        window.addEventListener('contextmenu', e => e.preventDefault());
    }

    selectSlot(index) {
        this.selectedSlot = index;
        this.updateHeldMesh();
        if (window.gameUI) window.gameUI.updateHotbarUI();
    }

    getHeldItem() {
        return this.hotbar[this.selectedSlot];
    }

    triggerSwing() {
        this.isSwinging = true;
        this.swingProgress = 0;
        window.audioManager.playSwing();
    }

    // Space Jump & Mid-Air Double Jump
    handleJumpPress() {
        if (this.isGrounded) {
            // Normal Ground Jump
            this.velocity.y = 8.5;
            this.isGrounded = false;
            this.canDoubleJump = true; // Arm double jump while airborne!
            window.audioManager.playJump();
        } else if (this.canDoubleJump) {
            // High-Flying DOUBLE JUMP!
            this.velocity.y = 9.2;
            this.canDoubleJump = false; // Disarmed until next ground touch
            this.spawnDoubleJumpParticles();
            window.audioManager.playDoubleJump();

            if (window.gameUI) {
                window.gameUI.showNotification("⚡ DOUBLE JUMP! ⚡");
            }
        }
    }

    handleLeftClick() {
        // 1. Check if clicking on mob or dragon
        if (window.gameEntityManager) {
            const hitMob = window.gameEntityManager.checkHit(this.camera, 3.8);
            if (hitMob) {
                const held = this.getHeldItem();
                let damage = 3;
                if (held) {
                    if (held.type === 'sword_wood') damage = 5;
                    else if (held.type === 'sword_stone') damage = 7;
                    else if (held.type === 'sword_iron') damage = 10;
                    else if (held.type === 'sword_diamond') damage = 16;
                }
                hitMob.takeDamage(damage, this.position);
                window.audioManager.playHit();
                return;
            }
        }

        // 2. Check if hitting Ender Dragon
        if (window.dragonBoss && window.dragonBoss.active) {
            const hitDragon = window.dragonBoss.checkRaycastHit(this.camera, 6.0);
            if (hitDragon) {
                const held = this.getHeldItem();
                let damage = 5;
                if (held) {
                    if (held.type === 'sword_wood') damage = 8;
                    else if (held.type === 'sword_stone') damage = 12;
                    else if (held.type === 'sword_iron') damage = 18;
                    else if (held.type === 'sword_diamond') damage = 30;
                }
                window.dragonBoss.takeDamage(damage);
                window.audioManager.playHit();
                return;
            }
        }

        // 3. Block breaking
        if (this.targetBlock) {
            const { x, y, z } = this.targetBlock;
            const blockId = this.world.getBlock(x, y, z);
            if (blockId !== BLOCKS.AIR && blockId !== BLOCKS.BEDROCK) {
                // If it's the portal block, handle portal
                if (blockId === BLOCKS.PORTAL_BLOCK) return;

                // Collect drop
                const drop = BLOCK_DROPS[blockId] || { item: 'stone', count: 1 };
                this.addItemToInventory(drop.item, drop.count);

                // Particles & sound
                let colorHex = 0x757575;
                if (blockId === BLOCKS.GRASS) colorHex = 0x5b8f22;
                else if (blockId === BLOCKS.DIRT) colorHex = 0x866043;
                else if (blockId === BLOCKS.WOOD) colorHex = 0x685232;
                else if (blockId === BLOCKS.LEAVES) colorHex = 0x296818;
                else if (blockId === BLOCKS.COAL_ORE) colorHex = 0x222222;
                else if (blockId === BLOCKS.IRON_ORE) colorHex = 0xd8af93;
                else if (blockId === BLOCKS.GOLD_ORE) colorHex = 0xf5b825;
                else if (blockId === BLOCKS.DIAMOND_ORE) colorHex = 0x2ee7d6;

                this.spawnBreakParticles(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), colorHex);
                window.audioManager.playBlockBreak();

                // Break block in world
                this.world.setBlock(x, y, z, BLOCKS.AIR, true);
                if (window.gameMultiplayer) window.gameMultiplayer.sendBlockChange(x, y, z, BLOCKS.AIR);

                if (window.gameUI) {
                    window.gameUI.updateInventoryUI();
                    window.gameUI.updateHotbarUI();
                }
            }
        }
    }

    handleRightClick() {
        const held = this.getHeldItem();

        // Check if targeting Portal Frame to unlock
        if (this.targetBlock) {
            const { x, y, z } = this.targetBlock;
            const blockId = this.world.getBlock(x, y, z);
            if (blockId === BLOCKS.OBSIDIAN && !this.world.portalUnlocked) {
                if (held && held.type === 'key') {
                    this.unlockPortalWithKey();
                    return;
                }
            }
        }

        // Ranged Bow attack
        if (held && held.type === 'bow') {
            const arrowCount = this.getItemCount('arrow');
            if (arrowCount > 0) {
                this.removeItem('arrow', 1);
                this.shootArrow();
                window.audioManager.playBowShoot();
                if (window.gameUI) window.gameUI.updateHotbarUI();
                return;
            } else {
                if (window.gameUI) window.gameUI.showNotification("Out of arrows! Craft arrows with Stick + Iron!");
                return;
            }
        }

        // Food Eating (Meat)
        if (held && held.type === 'meat') {
            if (this.health < this.maxHealth) {
                this.health = Math.min(this.maxHealth, this.health + 6);
                this.consumeHeldItem();
                window.audioManager.playFootstep();
                if (window.gameUI) window.gameUI.updateHearts();
                return;
            }
        }

        // Block Placement
        if (held && this.targetBlock && this.targetFace) {
            const px = this.targetBlock.x + this.targetFace.x;
            const py = this.targetBlock.y + this.targetFace.y;
            const pz = this.targetBlock.z + this.targetFace.z;

            // Prevent placing block inside player's own bounding box
            const playerBox = new THREE.Box3(
                new THREE.Vector3(this.position.x - this.playerWidth / 2, this.position.y, this.position.z - this.playerWidth / 2),
                new THREE.Vector3(this.position.x + this.playerWidth / 2, this.position.y + this.playerHeight, this.position.z + this.playerWidth / 2)
            );
            const blockBox = new THREE.Box3(
                new THREE.Vector3(px, py, pz),
                new THREE.Vector3(px + 1, py + 1, pz + 1)
            );

            if (playerBox.intersectsBox(blockBox)) return;

            let placeBlockId = null;
            switch (held.type) {
                case 'dirt': placeBlockId = BLOCKS.DIRT; break;
                case 'stone': placeBlockId = BLOCKS.STONE; break;
                case 'wood': placeBlockId = BLOCKS.WOOD; break;
                case 'planks': placeBlockId = BLOCKS.PLANKS; break;
                case 'leaves': placeBlockId = BLOCKS.LEAVES; break;
                case 'crafting_table': placeBlockId = BLOCKS.CRAFTING_TABLE; break;
                case 'obsidian': placeBlockId = BLOCKS.OBSIDIAN; break;
                case 'end_stone': placeBlockId = BLOCKS.END_STONE; break;
                case 'dragon_egg': placeBlockId = BLOCKS.DRAGON_EGG; break;
            }

            if (placeBlockId !== null) {
                this.world.setBlock(px, py, pz, placeBlockId, true);
                if (window.gameMultiplayer) window.gameMultiplayer.sendBlockChange(px, py, pz, placeBlockId);
                window.audioManager.playBlockPlace();
                this.consumeHeldItem();
                if (window.gameUI) window.gameUI.updateHotbarUI();
            }
        }
    }

    shootArrow() {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        const arrow = {
            pos: this.camera.position.clone().add(dir.clone().multiplyScalar(0.5)),
            vel: dir.clone().multiplyScalar(32),
            life: 4.0,
            mesh: new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.08, 0.5),
                new THREE.MeshBasicMaterial({ color: 0x855e34 })
            )
        };
        arrow.mesh.position.copy(arrow.pos);
        arrow.mesh.quaternion.copy(this.camera.quaternion);
        this.scene.add(arrow.mesh);
        this.arrows.push(arrow);
    }

    interactWithPortal() {
        if (!this.world.portalUnlocked) {
            const hasKey = this.getItemCount('key') > 0;
            if (hasKey) {
                this.unlockPortalWithKey();
            } else {
                if (window.gameUI) {
                    window.gameUI.showNotification("🔒 Spawn Portal is Locked! Craft Ancient Key (1 Diamond + 2 Gold) in (E) Crafting!");
                }
            }
        }
    }

    unlockPortalWithKey() {
        this.removeItem('key', 1);
        this.world.unlockPortal();
        window.audioManager.playUnlockChime();
        if (window.gameUI) {
            window.gameUI.showNotification("✨ ANCIENT PORTAL UNLOCKED! Step into the vortex to face the Dragon! ✨");
            window.gameUI.updateHotbarUI();
            window.gameUI.updateInventoryUI();
        }
    }

    consumeHeldItem() {
        const held = this.getHeldItem();
        if (!held) return;
        held.count--;
        if (held.count <= 0) {
            this.hotbar[this.selectedSlot] = null;
        }
        this.updateHeldMesh();
    }

    addItemToInventory(itemType, count = 1) {
        // Try to add to hotbar first
        for (let i = 0; i < 9; i++) {
            if (this.hotbar[i] && this.hotbar[i].type === itemType) {
                this.hotbar[i].count += count;
                this.syncInventoryMap();
                return;
            }
        }
        for (let i = 0; i < 9; i++) {
            if (!this.hotbar[i]) {
                this.hotbar[i] = { type: itemType, count };
                this.syncInventoryMap();
                this.updateHeldMesh();
                return;
            }
        }
        // Fallback to storage
        this.inventory[itemType] = (this.inventory[itemType] || 0) + count;
    }

    getItemCount(itemType) {
        let total = this.inventory[itemType] || 0;
        for (let i = 0; i < 9; i++) {
            if (this.hotbar[i] && this.hotbar[i].type === itemType) {
                total += this.hotbar[i].count;
            }
        }
        return total;
    }

    removeItem(itemType, count = 1) {
        let needed = count;
        for (let i = 0; i < 9 && needed > 0; i++) {
            if (this.hotbar[i] && this.hotbar[i].type === itemType) {
                const take = Math.min(this.hotbar[i].count, needed);
                this.hotbar[i].count -= take;
                needed -= take;
                if (this.hotbar[i].count <= 0) this.hotbar[i] = null;
            }
        }
        if (needed > 0 && this.inventory[itemType]) {
            const take = Math.min(this.inventory[itemType], needed);
            this.inventory[itemType] -= take;
            needed -= take;
        }
        this.updateHeldMesh();
        if (window.gameUI) {
            window.gameUI.updateHotbarUI();
            window.gameUI.updateInventoryUI();
        }
    }

    syncInventoryMap() {
        // Keeps this.inventory in sync for crafting recipes
        for (let i = 0; i < 9; i++) {
            if (this.hotbar[i]) {
                this.inventory[this.hotbar[i].type] = this.hotbar[i].count;
            }
        }
    }

    takeDamage(amount, sourcePos = null) {
        if (this.isDead || this.invulnerableTimer > 0) return;
        this.health -= amount;
        this.invulnerableTimer = 0.4;
        window.audioManager.playHit();

        if (sourcePos) {
            const knockback = this.position.clone().sub(sourcePos).setY(0).normalize().multiplyScalar(6);
            knockback.y = 4;
            this.velocity.add(knockback);
        }

        if (window.gameUI) {
            window.gameUI.flashDamage();
            window.gameUI.updateHearts();
        }

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    die() {
        this.isDead = true;
        if (window.gameUI) {
            window.gameUI.showDeathScreen();
        }
    }

    update(dt) {
        if (this.isDead) return;

        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
        }

        // Camera orientation from yaw and pitch (First-person only)
        const cosP = Math.cos(this.pitch);
        const forwardX = -Math.sin(this.yaw) * cosP;
        const forwardY = Math.sin(this.pitch);
        const forwardZ = -Math.cos(this.yaw) * cosP;
        this.camera.lookAt(
            this.camera.position.x + forwardX,
            this.camera.position.y + forwardY,
            this.camera.position.z + forwardZ
        );

        // Move physics
        this.updateMovement(dt);

        // Arm swing animation
        if (this.isSwinging) {
            this.swingProgress += dt * 10;
            const swingAngle = Math.sin(this.swingProgress * Math.PI) * 0.7;
            this.heldMesh.rotation.x = 0.5 + swingAngle;
            if (this.swingProgress >= 1) {
                this.isSwinging = false;
                this.heldMesh.rotation.x = 0.5;
            }
        }

        // Update Projectiles (Arrows)
        this.updateArrows(dt);

        // Update Target Block raycasting
        this.updateTargetBlock();

        // Update Particles
        this.updateParticles(dt);

        // Check if inside Portal
        this.checkPortalEntry();
    }

    updateMovement(dt) {
        // Movement direction relative to camera yaw
        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            // Rotate moveDir by camera yaw
            const sinY = Math.sin(this.yaw);
            const cosY = Math.cos(this.yaw);
            const rx = moveDir.x * cosY - moveDir.z * sinY;
            const rz = moveDir.x * sinY + moveDir.z * cosY;

            const speed = this.keys.sprint ? 7.5 : 5.0;
            this.velocity.x = rx * speed;
            this.velocity.z = rz * speed;

            // Footstep audio
            if (this.isGrounded && Math.random() < dt * 4) {
                window.audioManager.playFootstep();
            }
        } else {
            // Friction
            this.velocity.x *= 0.7;
            this.velocity.z *= 0.7;
        }

        // Gravity
        this.velocity.y -= 22 * dt;

        // Apply movement with voxel collisions (Axis by axis for smooth sliding)
        const dx = this.velocity.x * dt;
        const dy = this.velocity.y * dt;
        const dz = this.velocity.z * dt;

        // X collision
        this.position.x += dx;
        if (this.checkVoxelCollision()) {
            this.position.x -= dx;
            this.velocity.x = 0;
        }

        // Z collision
        this.position.z += dz;
        if (this.checkVoxelCollision()) {
            this.position.z -= dz;
            this.velocity.z = 0;
        }

        // Y collision & Ground Check
        this.position.y += dy;
        this.isGrounded = false;
        if (this.checkVoxelCollision()) {
            if (this.velocity.y < 0) {
                this.isGrounded = true;
                this.canDoubleJump = false; // Reset on ground
            }
            this.position.y -= dy;
            this.velocity.y = 0;
        }

        // Update Camera position at eye height
        this.camera.position.set(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );

        // Void safety
        if (this.position.y < -15) {
            this.takeDamage(20);
        }
    }

    checkVoxelCollision() {
        const minX = Math.floor(this.position.x - this.playerWidth / 2);
        const maxX = Math.floor(this.position.x + this.playerWidth / 2);
        const minY = Math.floor(this.position.y);
        const maxY = Math.floor(this.position.y + this.playerHeight);
        const minZ = Math.floor(this.position.z - this.playerWidth / 2);
        const maxZ = Math.floor(this.position.z + this.playerWidth / 2);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const block = this.world.getBlock(x, y, z);
                    if (block !== BLOCKS.AIR && block !== BLOCKS.PORTAL_BLOCK) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    checkPortalEntry() {
        const eyeX = Math.floor(this.position.x);
        const eyeY = Math.floor(this.position.y + 0.5);
        const eyeZ = Math.floor(this.position.z);

        const currentBlock = this.world.getBlock(eyeX, eyeY, eyeZ);
        if (currentBlock === BLOCKS.PORTAL_BLOCK) {
            window.audioManager.playTeleport();
            if (window.gameDimensions) {
                window.gameDimensions.enterPortal();
            }
        }
    }

    updateTargetBlock() {
        // Fast raymarching in voxel grid from eye position along camera forward
        const eye = this.camera.position;
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);

        let t = 0;
        const maxDist = 5.0;
        const step = 0.08;
        let hit = false;
        let prevBlock = null;

        while (t < maxDist) {
            const px = eye.x + dir.x * t;
            const py = eye.y + dir.y * t;
            const pz = eye.z + dir.z * t;

            const bx = Math.floor(px);
            const by = Math.floor(py);
            const bz = Math.floor(pz);

            const block = this.world.getBlock(bx, by, bz);
            if (block !== BLOCKS.AIR) {
                this.targetBlock = { x: bx, y: by, z: bz };
                if (prevBlock) {
                    this.targetFace = {
                        x: prevBlock.x - bx,
                        y: prevBlock.y - by,
                        z: prevBlock.z - bz
                    };
                } else {
                    this.targetFace = { x: 0, y: 1, z: 0 };
                }
                this.wireframe.position.set(bx + 0.5, by + 0.5, bz + 0.5);
                this.wireframe.visible = true;
                hit = true;
                break;
            }
            prevBlock = { x: bx, y: by, z: bz };
            t += step;
        }

        if (!hit) {
            this.targetBlock = null;
            this.targetFace = null;
            this.wireframe.visible = false;
        }
    }

    updateArrows(dt) {
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arr = this.arrows[i];
            arr.life -= dt;
            arr.vel.y -= 9.8 * dt; // arrow gravity
            const nextPos = arr.pos.clone().add(arr.vel.clone().multiplyScalar(dt));

            // Check hit mob
            if (window.gameEntityManager) {
                const mob = window.gameEntityManager.getMobNear(nextPos, 1.2);
                if (mob) {
                    mob.takeDamage(12, arr.pos);
                    window.audioManager.playHit();
                    this.scene.remove(arr.mesh);
                    this.arrows.splice(i, 1);
                    continue;
                }
            }

            // Check hit dragon
            if (window.dragonBoss && window.dragonBoss.active) {
                if (window.dragonBoss.checkSphereHit(nextPos, 2.5)) {
                    window.dragonBoss.takeDamage(18);
                    window.audioManager.playHit();
                    this.scene.remove(arr.mesh);
                    this.arrows.splice(i, 1);
                    continue;
                }
            }

            // Check hit block
            const bx = Math.floor(nextPos.x);
            const by = Math.floor(nextPos.y);
            const bz = Math.floor(nextPos.z);
            if (this.world.getBlock(bx, by, bz) !== BLOCKS.AIR) {
                this.scene.remove(arr.mesh);
                this.arrows.splice(i, 1);
                continue;
            }

            if (arr.life <= 0) {
                this.scene.remove(arr.mesh);
                this.arrows.splice(i, 1);
                continue;
            }

            arr.pos.copy(nextPos);
            arr.mesh.position.copy(arr.pos);
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.vel.y -= 14 * dt;
            p.position.add(p.vel.clone().multiplyScalar(dt));
            if (p.life <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }
    }
}
window.PlayerController = PlayerController;
