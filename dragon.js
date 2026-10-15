// The End Boss Dimension & Ender Dragon Boss Fight
class DragonBossFight {
    constructor(scene, player, world) {
        this.scene = scene;
        this.player = player;
        this.world = world;

        this.active = false;
        this.dragonMesh = null;
        this.endIslandGroup = new THREE.Group();
        this.scene.add(this.endIslandGroup);

        this.maxHealth = 250;
        this.health = 250;
        this.state = 'FLYING_CIRCLE';
        this.flightAngle = 0;
        this.flightRadius = 26;
        this.flightHeight = 36;
        this.swoopProgress = 0;
        this.swoopTarget = new THREE.Vector3();
        this.swoopOrigin = new THREE.Vector3();
        this.fireballTimer = 6.0;
        this.fireballs = [];

        this.deathTimer = 0;
        this.isDying = false;
        this.isDefeated = false;

        this.exitPortalSpawned = false;
        this.dragonEggCollected = false;

        this.buildDragonModel();
    }

    buildDragonModel() {
        this.dragonMesh = new THREE.Group();
        const blackMat = new THREE.MeshLambertMaterial({ color: 0x141419 });
        const darkGrayMat = new THREE.MeshLambertMaterial({ color: 0x222228 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd83bfb });

        // Body / Torso
        this.torso = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 4.0), blackMat);
        this.torso.position.set(0, 0, 0);
        this.dragonMesh.add(this.torso);

        // Spine spikes
        for (let i = -1.5; i <= 1.5; i += 0.8) {
            const spike = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), darkGrayMat);
            spike.position.set(0, 1.1, i);
            this.dragonMesh.add(spike);
        }

        // Neck & Head
        this.neck = new THREE.Group();
        this.neck.position.set(0, 0.4, 2.0);
        this.dragonMesh.add(this.neck);

        const neckSeg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2.0), blackMat);
        neckSeg.position.set(0, 0.4, 0.8);
        neckSeg.rotation.x = -0.3;
        this.neck.add(neckSeg);

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.8), blackMat);
        this.head.position.set(0, 1.0, 2.2);
        this.neck.add(this.head);

        // Snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.4), blackMat);
        snout.position.set(0, -0.2, 1.4);
        this.head.add(snout);

        // Glowing Purple Eyes
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), eyeMat);
        eyeL.position.set(-0.6, 0.2, 0.6);
        this.head.add(eyeL);

        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), eyeMat);
        eyeR.position.set(0.6, 0.2, 0.6);
        this.head.add(eyeR);

        // Horns
        const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), darkGrayMat);
        hornL.position.set(-0.5, 0.9, -0.4);
        hornL.rotation.x = -0.5;
        this.head.add(hornL);

        const hornR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), darkGrayMat);
        hornR.position.set(0.5, 0.9, -0.4);
        hornR.rotation.x = -0.5;
        this.head.add(hornR);

        // Wings: Left & Right with multi-joint flapping
        const wingMat = new THREE.MeshLambertMaterial({ color: 0x181820, side: THREE.DoubleSide });

        // Left Wing
        this.wingL = new THREE.Group();
        this.wingL.position.set(-1.1, 0.6, 0.5);
        this.dragonMesh.add(this.wingL);

        const wingArmL = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 0.4), blackMat);
        wingArmL.position.set(-1.75, 0, 0);
        this.wingL.add(wingArmL);

        const wingSkinL = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.2), wingMat);
        wingSkinL.position.set(-1.75, 0, -1.4);
        wingSkinL.rotation.x = Math.PI / 2;
        this.wingL.add(wingSkinL);

        // Right Wing
        this.wingR = new THREE.Group();
        this.wingR.position.set(1.1, 0.6, 0.5);
        this.dragonMesh.add(this.wingR);

        const wingArmR = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 0.4), blackMat);
        wingArmR.position.set(1.75, 0, 0);
        this.wingR.add(wingArmR);

        const wingSkinR = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.2), wingMat);
        wingSkinR.position.set(1.75, 0, -1.4);
        wingSkinR.rotation.x = Math.PI / 2;
        this.wingR.add(wingSkinR);

        // Tail (segmented)
        this.tail = new THREE.Group();
        this.tail.position.set(0, 0, -2.0);
        this.dragonMesh.add(this.tail);

        const t1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.8), blackMat);
        t1.position.set(0, 0, -0.9);
        this.tail.add(t1);

        const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.8), blackMat);
        t2.position.set(0, 0, -2.6);
        this.tail.add(t2);

        const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1.8), blackMat);
        t3.position.set(0, 0, -4.3);
        this.tail.add(t3);

        this.dragonMesh.position.set(0, 36, 0);
        this.dragonMesh.visible = false;
        this.scene.add(this.dragonMesh);
    }

    buildEndIsland() {
        this.endIslandGroup.clear();

        // End Stone Island (circular disc, radius 22)
        const islandGeo = new THREE.CylinderGeometry(24, 12, 10, 32);
        const endStoneMat = new THREE.MeshLambertMaterial({
            map: window.textureGenerator.atlasTexture,
            color: 0xeeeeaa
        });
        const islandMesh = new THREE.Mesh(islandGeo, endStoneMat);
        islandMesh.position.set(0, 15, 0);
        this.endIslandGroup.add(islandMesh);

        // Obsidian Pillars around the island
        const pillarMat = new THREE.MeshLambertMaterial({ color: 0x1b1424 });
        const crystalMat = new THREE.MeshBasicMaterial({ color: 0xcc44ff });

        const pillarAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        pillarAngles.forEach((ang, idx) => {
            const px = Math.cos(ang) * 16;
            const pz = Math.sin(ang) * 16;
            const height = 14 + (idx % 2) * 5;

            const pillar = new THREE.Mesh(new THREE.BoxGeometry(3, height, 3), pillarMat);
            pillar.position.set(px, 20 + height / 2, pz);
            this.endIslandGroup.add(pillar);

            // End Crystal at top
            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.0), crystalMat);
            crystal.position.set(px, 20 + height + 1.2, pz);
            this.endIslandGroup.add(crystal);
        });

        this.endIslandGroup.visible = false;
    }

    startFight() {
        this.active = true;
        this.health = this.maxHealth;
        this.isDying = false;
        this.isDefeated = false;
        this.exitPortalSpawned = false;
        this.dragonEggCollected = false;

        this.buildEndIsland();
        this.endIslandGroup.visible = true;
        this.dragonMesh.visible = true;
        this.dragonMesh.position.set(0, 38, 0);

        // Teleport player to the edge of the End Island
        this.player.position.set(0, 21, 16);
        this.player.velocity.set(0, 0, 0);

        if (window.gameUI) {
            window.gameUI.showBossBar(true, "ENDER DRAGON", 1.0);
            window.gameUI.showNotification("⚔️ THE END: Defeat the Ender Dragon! ⚔️");
        }
        window.audioManager.playDragonRoar();
    }

    takeDamage(amount) {
        if (!this.active || this.isDying) return;
        this.health -= amount;

        // Flash red
        this.dragonMesh.traverse(c => {
            if (c.isMesh && c.material) {
                c.material._origColor = c.material.color.getHex();
                c.material.color.setHex(0xff2222);
            }
        });
        setTimeout(() => {
            this.dragonMesh.traverse(c => {
                if (c.isMesh && c.material && c.material._origColor) {
                    c.material.color.setHex(c.material._origColor);
                }
            });
        }, 140);

        if (window.gameUI) {
            window.gameUI.updateBossHealth(this.health / this.maxHealth);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.startDeathSequence();
        }
    }

    startDeathSequence() {
        this.isDying = true;
        this.deathTimer = 0;
        window.audioManager.playDragonDeath();
        if (window.gameUI) {
            window.gameUI.showNotification("💥 THE DRAGON IS DEFEATED! 💥");
        }
    }

    spawnExitPortalAndEgg() {
        this.exitPortalSpawned = true;
        this.isDefeated = true;

        // Bedrock Portal frame in center of island
        const bedrockMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const portalMat = new THREE.MeshBasicMaterial({ color: 0x7b22d1 });

        const portalBase = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.8, 16), bedrockMat);
        portalBase.position.set(0, 20.4, 0);
        this.endIslandGroup.add(portalBase);

        // Active swirling exit portal in center
        this.exitPortalMesh = new THREE.Mesh(new THREE.CircleGeometry(2.5, 16), portalMat);
        this.exitPortalMesh.rotation.x = -Math.PI / 2;
        this.exitPortalMesh.position.set(0, 20.85, 0);
        this.endIslandGroup.add(this.exitPortalMesh);

        // Center Pillar for the Dragon Egg
        const centerPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.0, 1.2), bedrockMat);
        centerPillar.position.set(0, 22.0, 0);
        this.endIslandGroup.add(centerPillar);

        // THE DRAGON EGG on top!
        const eggMat = new THREE.MeshLambertMaterial({ color: 0x160d24 });
        this.eggMesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), eggMat);
        this.eggMesh.scale.set(0.85, 1.3, 0.85);
        this.eggMesh.position.set(0, 24.3, 0);
        this.endIslandGroup.add(this.eggMesh);

        window.audioManager.playVictory();
        if (window.gameUI) {
            window.gameUI.showBossBar(false);
            window.gameUI.showNotification("🏆 Victory Exit Portal & Dragon Egg Spawned! Claim the egg and step into portal! 🏆");
        }
    }

    update(dt) {
        if (!this.active) return;

        // Death Sequence Animation
        if (this.isDying) {
            this.deathTimer += dt;
            this.dragonMesh.position.y += dt * 3;
            this.dragonMesh.rotation.y += dt * 3;

            // Spurt radiant light beams / particles
            this.player.spawnBreakParticles(this.dragonMesh.position, 0xd83bfb);

            if (this.deathTimer >= 3.5) {
                this.scene.remove(this.dragonMesh);
                this.dragonMesh.visible = false;
                this.isDying = false;
                this.spawnExitPortalAndEgg();
            }
            return;
        }

        // Active Flying & Attack AI
        this.wingFlapCycle = (this.wingFlapCycle || 0) + dt * 10;
        const flapAngle = Math.sin(this.wingFlapCycle) * 0.45;
        this.wingL.rotation.z = flapAngle;
        this.wingR.rotation.z = -flapAngle;
        this.tail.rotation.y = Math.sin(this.wingFlapCycle * 0.5) * 0.2;

        if (this.state === 'FLYING_CIRCLE') {
            this.flightAngle += dt * 0.45;
            const tx = Math.cos(this.flightAngle) * this.flightRadius;
            const tz = Math.sin(this.flightAngle) * this.flightRadius;
            const ty = this.flightHeight + Math.sin(this.flightAngle * 2) * 3;

            this.dragonMesh.position.set(tx, ty, tz);

            // Orient towards flight tangent
            const nextAngle = this.flightAngle + 0.1;
            const targetLook = new THREE.Vector3(
                Math.cos(nextAngle) * this.flightRadius,
                ty,
                Math.sin(nextAngle) * this.flightRadius
            );
            this.dragonMesh.lookAt(targetLook);

            // Fireball shoot timer
            this.fireballTimer -= dt;
            if (this.fireballTimer <= 0) {
                this.fireballTimer = 5.0 + Math.random() * 3.0;
                this.shootDragonFireball();
            }

            // Swoop attack trigger
            if (Math.random() < dt * 0.2) {
                this.state = 'SWOOPING';
                this.swoopProgress = 0;
                this.swoopOrigin.copy(this.dragonMesh.position);
                this.swoopTarget.copy(this.player.position).add(new THREE.Vector3(0, 1.5, 0));
                window.audioManager.playDragonRoar();
            }
        } else if (this.state === 'SWOOPING') {
            this.swoopProgress += dt * 0.6;
            // Parabolic dive towards player and ascend back up
            const t = this.swoopProgress;
            const currentPos = new THREE.Vector3().lerpVectors(this.swoopOrigin, this.swoopTarget, Math.min(1, t * 2));
            if (t > 0.5) {
                currentPos.y += (t - 0.5) * 40;
            }
            this.dragonMesh.position.copy(currentPos);
            this.dragonMesh.lookAt(this.swoopTarget);

            // Check hit player during swoop
            if (this.dragonMesh.position.distanceTo(this.player.position) < 3.8) {
                this.player.takeDamage(8, this.dragonMesh.position);
            }

            if (t >= 1.0) {
                this.state = 'FLYING_CIRCLE';
            }
        }

        // Update Dragon Fireballs
        this.updateFireballs(dt);

        // Check Exit Portal & Egg Interaction when defeated
        if (this.exitPortalSpawned) {
            // Interact with Egg
            if (!this.dragonEggCollected && this.eggMesh) {
                const distToEgg = this.player.position.distanceTo(this.eggMesh.position);
                if (distToEgg < 3.2) {
                    this.dragonEggCollected = true;
                    this.endIslandGroup.remove(this.eggMesh);
                    this.player.addItemToInventory('dragon_egg', 1);
                    if (window.gameUI) {
                        window.gameUI.showNotification("🥚 DRAGON EGG OBTAINED! The Ultimate Trophy! 🥚");
                        window.gameUI.updateHotbarUI();
                    }
                }
            }

            // Check Exit Portal Jump
            if (this.exitPortalMesh) {
                const distToExit = this.player.position.distanceTo(new THREE.Vector3(0, 20.8, 0));
                if (distToExit < 2.5) {
                    this.triggerVictoryExit();
                }
            }
        }
    }

    shootDragonFireball() {
        const origin = this.dragonMesh.position.clone();
        const target = this.player.position.clone().add(new THREE.Vector3(0, 1, 0));
        const dir = target.sub(origin).normalize();

        const fbMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xaa22ff })
        );
        fbMesh.position.copy(origin);
        this.scene.add(fbMesh);

        this.fireballs.push({
            pos: origin,
            vel: dir.multiplyScalar(18),
            life: 5.0,
            mesh: fbMesh
        });
    }

    updateFireballs(dt) {
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            fb.pos.add(fb.vel.clone().multiplyScalar(dt));
            fb.mesh.position.copy(fb.pos);
            fb.life -= dt;

            // Check hit player
            if (fb.pos.distanceTo(this.player.position.clone().add(new THREE.Vector3(0, 1, 0))) < 1.6) {
                this.player.takeDamage(6, fb.pos);
                window.audioManager.playExplosion();
                this.scene.remove(fb.mesh);
                this.fireballs.splice(i, 1);
                continue;
            }

            // Check hit ground
            if (fb.pos.y <= 20.5) {
                window.audioManager.playExplosion();
                this.player.spawnBreakParticles(fb.pos, 0xaa22ff);
                this.scene.remove(fb.mesh);
                this.fireballs.splice(i, 1);
                continue;
            }

            if (fb.life <= 0) {
                this.scene.remove(fb.mesh);
                this.fireballs.splice(i, 1);
            }
        }
    }

    checkRaycastHit(camera, maxDist = 8.0) {
        if (!this.active || this.isDying) return false;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        const hits = raycaster.intersectObject(this.dragonMesh, true);
        return hits.length > 0 && hits[0].distance <= maxDist;
    }

    checkSphereHit(pos, radius = 2.5) {
        if (!this.active || this.isDying) return false;
        return this.dragonMesh.position.distanceTo(pos) <= (radius + 2.5);
    }

    triggerVictoryExit() {
        this.active = false;
        this.endIslandGroup.visible = false;
        window.audioManager.playTeleport();

        // Return player to Overworld Spawn Point
        this.player.respawnAtSurface();

        if (window.gameUI) {
            window.gameUI.showVictoryScreen();
        }
    }
}
window.DragonBossFight = DragonBossFight;
