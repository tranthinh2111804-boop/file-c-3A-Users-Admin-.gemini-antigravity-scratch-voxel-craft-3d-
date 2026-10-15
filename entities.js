// Daytime Animals & Nighttime Monsters with Easy/Hard Difficulties
class BaseMob {
    constructor(scene, world, player, type, position) {
        this.scene = scene;
        this.world = world;
        this.player = player;
        this.type = type;
        this.position = position.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);

        this.health = 10;
        this.maxHealth = 10;
        this.isDead = false;
        this.walkCycle = 0;
        this.invulnerableTimer = 0;

        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);
        this.mesh.position.copy(this.position);

        this.buildModel();
    }

    buildModel() {
        // Implemented by subclasses
    }

    takeDamage(amount, sourcePos) {
        if (this.isDead || this.invulnerableTimer > 0) return;
        this.health -= amount;
        this.invulnerableTimer = 0.35;

        // Flash red
        this.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.material._origColor = child.material.color.getHex();
                child.material.color.setHex(0xff3333);
            }
        });
        setTimeout(() => {
            this.mesh.traverse(child => {
                if (child.isMesh && child.material && child.material._origColor) {
                    child.material.color.setHex(child.material._origColor);
                }
            });
        }, 150);

        // Knockback
        if (sourcePos) {
            const kb = this.position.clone().sub(sourcePos).setY(0).normalize().multiplyScalar(5);
            kb.y = 4;
            this.velocity.add(kb);
        }

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.onDeath();
        this.scene.remove(this.mesh);
    }

    onDeath() {
        // Implemented by subclasses for item drops
    }

    update(dt) {
        if (this.isDead) return;

        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
        }

        // Apply Gravity
        this.velocity.y -= 20 * dt;

        // Apply Movement
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
        this.position.y += this.velocity.y * dt;

        // Voxel Ground check
        const bx = Math.floor(this.position.x);
        const by = Math.floor(this.position.y);
        const bz = Math.floor(this.position.z);
        const blockBelow = this.world.getBlock(bx, by, bz);

        if (blockBelow !== BLOCKS.AIR && blockBelow !== BLOCKS.PORTAL_BLOCK) {
            this.position.y = by + 1;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Horizontal friction
        this.velocity.x *= 0.85;
        this.velocity.z *= 0.85;

        this.mesh.position.copy(this.position);
    }
}

// ---------------- DAYTIME ANIMALS ----------------

class PigMob extends BaseMob {
    constructor(scene, world, player, pos) {
        super(scene, world, player, 'pig', pos);
        this.health = 10;
        this.changeDirTimer = 0;
        this.moveDir = new THREE.Vector2(0, 0);
    }

    buildModel() {
        const pinkMat = new THREE.MeshLambertMaterial({ color: 0xf08d9b });
        const snoutMat = new THREE.MeshLambertMaterial({ color: 0xd96f80 });
        const blackMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

        // Body
        this.body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.1), pinkMat);
        this.body.position.y = 0.6;
        this.mesh.add(this.body);

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), pinkMat);
        this.head.position.set(0, 0.8, 0.65);
        this.mesh.add(this.head);

        // Snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.12), snoutMat);
        snout.position.set(0, -0.08, 0.28);
        this.head.add(snout);

        // Legs
        this.legs = [];
        const legGeo = new THREE.BoxGeometry(0.2, 0.45, 0.2);
        const legOffsets = [
            [-0.25, 0.22, 0.35],
            [0.25, 0.22, 0.35],
            [-0.25, 0.22, -0.35],
            [0.25, 0.22, -0.35]
        ];
        legOffsets.forEach(off => {
            const leg = new THREE.Mesh(legGeo, pinkMat);
            leg.position.set(...off);
            this.mesh.add(leg);
            this.legs.push(leg);
        });
    }

    onDeath() {
        // Drop Meat
        this.player.addItemToInventory('meat', 2);
        if (window.gameUI) {
            window.gameUI.showNotification("Porkchop obtained! (Eat to restore health)");
            window.gameUI.updateHotbarUI();
        }
        window.audioManager.playPigOink();
    }

    update(dt) {
        super.update(dt);
        if (this.isDead) return;

        this.changeDirTimer -= dt;
        if (this.changeDirTimer <= 0) {
            this.changeDirTimer = 3 + Math.random() * 4;
            if (Math.random() < 0.6) {
                const angle = Math.random() * Math.PI * 2;
                this.moveDir.set(Math.cos(angle), Math.sin(angle));
                this.mesh.rotation.y = angle + Math.PI / 2;
            } else {
                this.moveDir.set(0, 0);
            }
        }

        if (this.moveDir.lengthSq() > 0) {
            this.velocity.x = this.moveDir.x * 1.8;
            this.velocity.z = this.moveDir.y * 1.8;

            this.walkCycle += dt * 8;
            this.legs.forEach((leg, i) => {
                leg.rotation.x = Math.sin(this.walkCycle + (i % 2) * Math.PI) * 0.45;
            });
        }
    }
}

class CowMob extends BaseMob {
    constructor(scene, world, player, pos) {
        super(scene, world, player, 'cow', pos);
        this.health = 12;
        this.changeDirTimer = 0;
        this.moveDir = new THREE.Vector2(0, 0);
    }

    buildModel() {
        const cowMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
        const whiteMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
        const hornMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });

        // Body
        this.body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 1.3), cowMat);
        this.body.position.y = 0.8;
        this.mesh.add(this.body);

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.5), whiteMat);
        this.head.position.set(0, 1.1, 0.8);
        this.mesh.add(this.head);

        // Horns
        const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), hornMat);
        hornL.position.set(-0.25, 0.35, 0);
        this.head.add(hornL);
        const hornR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), hornMat);
        hornR.position.set(0.25, 0.35, 0);
        this.head.add(hornR);

        // Legs
        this.legs = [];
        const legGeo = new THREE.BoxGeometry(0.22, 0.6, 0.22);
        const legOffsets = [
            [-0.28, 0.3, 0.45],
            [0.28, 0.3, 0.45],
            [-0.28, 0.3, -0.45],
            [0.28, 0.3, -0.45]
        ];
        legOffsets.forEach(off => {
            const leg = new THREE.Mesh(legGeo, cowMat);
            leg.position.set(...off);
            this.mesh.add(leg);
            this.legs.push(leg);
        });
    }

    onDeath() {
        this.player.addItemToInventory('meat', 3);
        if (window.gameUI) {
            window.gameUI.showNotification("Raw Beef obtained! (Eat to restore health)");
            window.gameUI.updateHotbarUI();
        }
        window.audioManager.playCowMoo();
    }

    update(dt) {
        super.update(dt);
        if (this.isDead) return;

        this.changeDirTimer -= dt;
        if (this.changeDirTimer <= 0) {
            this.changeDirTimer = 3 + Math.random() * 5;
            if (Math.random() < 0.6) {
                const angle = Math.random() * Math.PI * 2;
                this.moveDir.set(Math.cos(angle), Math.sin(angle));
                this.mesh.rotation.y = angle + Math.PI / 2;
            } else {
                this.moveDir.set(0, 0);
            }
        }

        if (this.moveDir.lengthSq() > 0) {
            this.velocity.x = this.moveDir.x * 1.5;
            this.velocity.z = this.moveDir.y * 1.5;

            this.walkCycle += dt * 7;
            this.legs.forEach((leg, i) => {
                leg.rotation.x = Math.sin(this.walkCycle + (i % 2) * Math.PI) * 0.4;
            });
        }
    }
}

// ---------------- NIGHTTIME MONSTERS ----------------

class ZombieMob extends BaseMob {
    constructor(scene, world, player, pos, difficulty = 'easy') {
        super(scene, world, player, 'zombie', pos);
        this.difficulty = difficulty;
        this.health = difficulty === 'hard' ? 22 : 14;
        this.speed = difficulty === 'hard' ? 4.2 : 2.8;
        this.damage = difficulty === 'hard' ? 5 : 2; // 2.5 hearts on hard, 1 heart on easy
        this.attackCooldown = 0;
    }

    buildModel() {
        const greenMat = new THREE.MeshLambertMaterial({ color: 0x3d7426 });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0x226b80 });
        const pantsMat = new THREE.MeshLambertMaterial({ color: 0x223366 });

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), greenMat);
        this.head.position.y = 1.6;
        this.mesh.add(this.head);

        // Body
        this.body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), shirtMat);
        this.body.position.y = 1.05;
        this.mesh.add(this.body);

        // Arms (outstretched forward)
        this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), greenMat);
        this.armL.position.set(-0.38, 1.1, 0.3);
        this.armL.rotation.x = -Math.PI / 2;
        this.mesh.add(this.armL);

        this.armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), greenMat);
        this.armR.position.set(0.38, 1.1, 0.3);
        this.armR.rotation.x = -Math.PI / 2;
        this.mesh.add(this.armR);

        // Legs
        this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), pantsMat);
        this.legL.position.set(-0.15, 0.35, 0);
        this.mesh.add(this.legL);

        this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), pantsMat);
        this.legR.position.set(0.15, 0.35, 0);
        this.mesh.add(this.legR);
    }

    onDeath() {
        // Chance to drop Iron or Coal
        if (Math.random() < 0.4) {
            this.player.addItemToInventory('iron', 1);
            if (window.gameUI) window.gameUI.showNotification("Zombie dropped Iron Ingot!");
        }
        window.audioManager.playZombieGroan();
    }

    update(dt) {
        super.update(dt);
        if (this.isDead) return;

        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Pursue player
        const distToPlayer = this.position.distanceTo(this.player.position);
        if (distToPlayer < 24) {
            const dir = this.player.position.clone().sub(this.position).setY(0).normalize();
            this.velocity.x = dir.x * this.speed;
            this.velocity.z = dir.z * this.speed;

            this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

            this.walkCycle += dt * 9;
            this.legL.rotation.x = Math.sin(this.walkCycle) * 0.5;
            this.legR.rotation.x = -Math.sin(this.walkCycle) * 0.5;

            // Attack player
            if (distToPlayer < 1.6 && this.attackCooldown <= 0) {
                this.player.takeDamage(this.damage, this.position);
                this.attackCooldown = 1.0;
                window.audioManager.playZombieGroan();
            }
        }
    }
}

class SkeletonMob extends BaseMob {
    constructor(scene, world, player, pos, difficulty = 'easy') {
        super(scene, world, player, 'skeleton', pos);
        this.difficulty = difficulty;
        this.health = difficulty === 'hard' ? 18 : 12;
        this.shootTimer = 2.0;
        this.arrows = [];
    }

    buildModel() {
        const boneMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), boneMat);
        this.head.position.y = 1.6;
        this.mesh.add(this.head);

        // Body (Ribcage)
        this.body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.25), boneMat);
        this.body.position.y = 1.05;
        this.mesh.add(this.body);

        // Arms
        this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), boneMat);
        this.armL.position.set(-0.32, 1.1, 0.15);
        this.armL.rotation.x = -Math.PI / 3;
        this.mesh.add(this.armL);

        this.armR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), boneMat);
        this.armR.position.set(0.32, 1.1, 0.15);
        this.armR.rotation.x = -Math.PI / 3;
        this.mesh.add(this.armR);

        // Bow in hand
        const bow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), new THREE.MeshLambertMaterial({ color: 0x685232 }));
        bow.position.set(0, -0.2, 0.15);
        this.armR.add(bow);

        // Legs
        this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), boneMat);
        this.legL.position.set(-0.12, 0.35, 0);
        this.mesh.add(this.legL);

        this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), boneMat);
        this.legR.position.set(0.12, 0.35, 0);
        this.mesh.add(this.legR);
    }

    onDeath() {
        this.player.addItemToInventory('arrow', 3);
        if (window.gameUI) window.gameUI.showNotification("Skeleton dropped Arrows!");
    }

    update(dt) {
        super.update(dt);
        if (this.isDead) return;

        const dist = this.position.distanceTo(this.player.position);
        if (dist < 26) {
            const dir = this.player.position.clone().sub(this.position).setY(0).normalize();
            this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

            // Keep distance between 8 and 14 blocks
            if (dist > 12) {
                this.velocity.x = dir.x * 2.2;
                this.velocity.z = dir.z * 2.2;
            } else if (dist < 6) {
                this.velocity.x = -dir.x * 2.2;
                this.velocity.z = -dir.z * 2.2;
            }

            // Shoot arrow
            this.shootTimer -= dt;
            const shootInterval = this.difficulty === 'hard' ? 1.8 : 3.0;
            if (this.shootTimer <= 0) {
                this.shootTimer = shootInterval;
                this.shootArrowAtPlayer();
            }
        }

        // Update skeleton arrows
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arr = this.arrows[i];
            arr.pos.add(arr.vel.clone().multiplyScalar(dt));
            arr.mesh.position.copy(arr.pos);
            arr.life -= dt;

            // Check hit player
            if (arr.pos.distanceTo(this.player.position.clone().add(new THREE.Vector3(0, 1, 0))) < 1.0) {
                const dmg = this.difficulty === 'hard' ? 4 : 2;
                this.player.takeDamage(dmg, this.position);
                this.scene.remove(arr.mesh);
                this.arrows.splice(i, 1);
                continue;
            }

            if (arr.life <= 0) {
                this.scene.remove(arr.mesh);
                this.arrows.splice(i, 1);
            }
        }
    }

    shootArrowAtPlayer() {
        const origin = this.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        const target = this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        const dir = target.sub(origin).normalize();

        const arrowMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.06, 0.4),
            new THREE.MeshBasicMaterial({ color: 0xcccccc })
        );
        arrowMesh.position.copy(origin);
        this.scene.add(arrowMesh);

        this.arrows.push({
            pos: origin,
            vel: dir.multiplyScalar(22),
            life: 3.0,
            mesh: arrowMesh
        });
        window.audioManager.playBowShoot();
    }
}

class CreeperMob extends BaseMob {
    constructor(scene, world, player, pos, difficulty = 'easy') {
        super(scene, world, player, 'creeper', pos);
        this.difficulty = difficulty;
        this.health = 16;
        this.fuseTimer = 0;
        this.isHissing = false;
        this.fuseDuration = difficulty === 'hard' ? 1.1 : 1.6;
    }

    buildModel() {
        const greenMat = new THREE.MeshLambertMaterial({ color: 0x4aa338 });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), greenMat);
        this.head.position.y = 1.35;
        this.mesh.add(this.head);

        // Body
        this.body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), greenMat);
        this.body.position.y = 0.8;
        this.mesh.add(this.body);

        // 4 Stubby Legs
        this.legs = [];
        const legGeo = new THREE.BoxGeometry(0.2, 0.35, 0.2);
        const offsets = [
            [-0.18, 0.18, 0.15],
            [0.18, 0.18, 0.15],
            [-0.18, 0.18, -0.15],
            [0.18, 0.18, -0.15]
        ];
        offsets.forEach(off => {
            const leg = new THREE.Mesh(legGeo, greenMat);
            leg.position.set(...off);
            this.mesh.add(leg);
            this.legs.push(leg);
        });
    }

    update(dt) {
        super.update(dt);
        if (this.isDead) return;

        const dist = this.position.distanceTo(this.player.position);
        if (dist < 20) {
            const dir = this.player.position.clone().sub(this.position).setY(0).normalize();
            this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

            if (dist > 2.2) {
                // Sprint toward player
                const speed = this.difficulty === 'hard' ? 4.4 : 3.0;
                this.velocity.x = dir.x * speed;
                this.velocity.z = dir.z * speed;
                this.isHissing = false;
                this.fuseTimer = 0;
            } else {
                // Within blast radius: start hissing & swelling!
                if (!this.isHissing) {
                    this.isHissing = true;
                    window.audioManager.playCreeperHiss();
                }

                this.fuseTimer += dt;
                // Swell visual
                const swell = 1 + (this.fuseTimer / this.fuseDuration) * 0.4;
                this.mesh.scale.set(swell, swell, swell);

                if (this.fuseTimer >= this.fuseDuration) {
                    this.explode();
                }
            }
        }
    }

    explode() {
        this.die();
        window.audioManager.playExplosion();

        // Blast damage to player
        const dist = this.position.distanceTo(this.player.position);
        if (dist < 6.0) {
            const maxDmg = this.difficulty === 'hard' ? 16 : 8;
            const damage = Math.round(maxDmg * (1 - dist / 6.0));
            this.player.takeDamage(damage, this.position);
        }

        // Particle cloud
        this.player.spawnBreakParticles(this.position, 0x4aa338);
    }
}

// ---------------- ENTITY MANAGER & SPAWNER ----------------

class EntityManager {
    constructor(scene, world, player) {
        this.scene = scene;
        this.world = world;
        this.player = player;

        this.mobs = [];
        this.difficulty = 'easy'; // 'easy' or 'hard'
        this.spawnTimer = 0;

        // Difficulty spawn settings
        // Easy: spawn every 12s, max 6 monsters
        // Hard: "the harder mode make the monster spawn more frequently" -> spawn every 3.5s, max 18 monsters!
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        console.log("Difficulty set to:", diff);
    }

    spawnAnimal() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 14 + Math.random() * 22;
        const wx = Math.floor(this.player.position.x + Math.cos(angle) * dist);
        const wz = Math.floor(this.player.position.z + Math.sin(angle) * dist);
        const wy = this.world.getSurfaceHeight(wx, wz);

        if (wy < 20 || wy > 44) return;
        if (this.world.getBlock(wx, wy, wz) !== BLOCKS.GRASS) return;

        const pos = new THREE.Vector3(wx + 0.5, wy + 1, wz + 0.5);
        const mob = (Math.random() < 0.5) ?
            new PigMob(this.scene, this.world, this.player, pos) :
            new CowMob(this.scene, this.world, this.player, pos);

        this.mobs.push(mob);
    }

    spawnMonster() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 16 + Math.random() * 24;
        const wx = Math.floor(this.player.position.x + Math.cos(angle) * dist);
        const wz = Math.floor(this.player.position.z + Math.sin(angle) * dist);
        const wy = this.world.getSurfaceHeight(wx, wz);

        if (wy < 15 || wy > 44) return;

        const pos = new THREE.Vector3(wx + 0.5, wy + 1, wz + 0.5);
        const roll = Math.random();
        let mob;
        if (roll < 0.45) {
            mob = new ZombieMob(this.scene, this.world, this.player, pos, this.difficulty);
        } else if (roll < 0.75) {
            mob = new SkeletonMob(this.scene, this.world, this.player, pos, this.difficulty);
        } else {
            mob = new CreeperMob(this.scene, this.world, this.player, pos, this.difficulty);
        }

        this.mobs.push(mob);
    }

    update(dt, isDaytime) {
        // Update all living mobs
        for (let i = this.mobs.length - 1; i >= 0; i--) {
            const mob = this.mobs[i];
            if (mob.isDead) {
                this.mobs.splice(i, 1);
                continue;
            }
            mob.update(dt);
        }

        // Spawn timer
        this.spawnTimer += dt;
        const isHard = (this.difficulty === 'hard');

        if (isDaytime) {
            // Daytime: Animals spawn
            const animalCount = this.mobs.filter(m => m.type === 'pig' || m.type === 'cow').length;
            if (this.spawnTimer >= 10.0 && animalCount < 8) {
                this.spawnTimer = 0;
                this.spawnAnimal();
            }
        } else {
            // Nighttime: Monsters spawn! Harder mode spawns much more frequently
            const monsterInterval = isHard ? 3.5 : 12.0;
            const maxMonsters = isHard ? 18 : 6;
            const monsterCount = this.mobs.filter(m => m.type === 'zombie' || m.type === 'skeleton' || m.type === 'creeper').length;

            if (this.spawnTimer >= monsterInterval && monsterCount < maxMonsters) {
                this.spawnTimer = 0;
                this.spawnMonster();
                if (isHard && Math.random() < 0.5 && monsterCount < maxMonsters - 1) {
                    // In hard mode, spawn in pairs occasionally!
                    this.spawnMonster();
                }
            }
        }
    }

    checkHit(camera, maxDist = 3.5) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        for (let mob of this.mobs) {
            if (mob.isDead) continue;
            const dist = camera.position.distanceTo(mob.position);
            if (dist <= maxDist) {
                const hits = raycaster.intersectObject(mob.mesh, true);
                if (hits.length > 0) return mob;
            }
        }
        return null;
    }

    getMobNear(pos, radius = 1.5) {
        for (let mob of this.mobs) {
            if (mob.isDead) continue;
            if (mob.position.distanceTo(pos) <= radius) return mob;
        }
        return null;
    }
}
window.EntityManager = EntityManager;
