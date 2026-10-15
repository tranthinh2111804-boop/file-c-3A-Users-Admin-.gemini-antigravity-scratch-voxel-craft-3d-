// Portal System, Dimensional Transitions & Spawn Lock Mechanism
class DimensionManager {
    constructor(scene, player, world, dragonBoss) {
        this.scene = scene;
        this.player = player;
        this.world = world;
        this.dragonBoss = dragonBoss;

        this.currentDimension = 'OVERWORLD'; // 'OVERWORLD' or 'THE_END'

        this.initPortalVisuals();
    }

    initPortalVisuals() {
        const portalPos = this.world.portalPosition;

        // Floating Lock Indicator when locked
        this.lockGroup = new THREE.Group();
        this.lockGroup.position.set(0.5, portalPos.y + 3.0, 0);

        // Golden Padlock Icon
        const goldMat = new THREE.MeshLambertMaterial({ color: 0xf5b825 });
        const padlockBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.25), goldMat);
        this.lockGroup.add(padlockBody);

        const shackleMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 8, 16, Math.PI), shackleMat);
        shackle.position.set(0, 0.35, 0);
        this.lockGroup.add(shackle);

        // Floating Diamond Gem in the lock center
        const diamondMat = new THREE.MeshBasicMaterial({ color: 0x2ee7d6 });
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), diamondMat);
        gem.position.set(0, 0, 0.14);
        this.lockGroup.add(gem);

        this.scene.add(this.lockGroup);

        // Swirling Portal Particle Aura
        this.auraParticles = [];
        const partGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const partMat = new THREE.MeshBasicMaterial({ color: 0xaa44ff });
        for (let i = 0; i < 20; i++) {
            const p = new THREE.Mesh(partGeo, partMat);
            p.position.set(
                (Math.random() - 0.5) * 2.0,
                portalPos.y + 1.5 + Math.random() * 2.5,
                (Math.random() - 0.5) * 0.8
            );
            p.baseY = p.position.y;
            this.scene.add(p);
            this.auraParticles.push(p);
        }
    }

    enterPortal() {
        if (this.currentDimension === 'OVERWORLD') {
            if (!this.world.portalUnlocked) {
                // Should not happen if PORTAL_BLOCK is only placed when unlocked, but safe check
                return;
            }
            this.teleportToEnd();
        }
    }

    teleportToEnd() {
        this.currentDimension = 'THE_END';
        if (window.gameUI) {
            window.gameUI.flashPortalWarp();
        }

        // Hide overworld chunks temporarily
        for (let mesh of this.world.chunks.values()) {
            mesh.visible = false;
        }

        // Hide spawn lock
        if (this.lockGroup) this.lockGroup.visible = false;

        // Start Dragon Boss Fight
        this.dragonBoss.startFight();
    }

    teleportToOverworld() {
        this.currentDimension = 'OVERWORLD';
        if (window.gameUI) {
            window.gameUI.flashPortalWarp();
        }

        // Restore overworld chunks
        for (let mesh of this.world.chunks.values()) {
            mesh.visible = true;
        }

        // Return player to Overworld Spawn Point
        this.player.respawnAtSurface();
    }

    update(dt) {
        // Floating lock bob & rotation
        if (this.lockGroup) {
            if (this.world.portalUnlocked) {
                this.lockGroup.visible = false;
            } else {
                this.lockGroup.visible = (this.currentDimension === 'OVERWORLD');
                this.lockGroup.rotation.y += dt * 1.5;
                const portalPos = this.world.portalPosition;
                this.lockGroup.position.y = portalPos.y + 3.0 + Math.sin(Date.now() * 0.003) * 0.15;
            }
        }

        // Swirling portal aura particles
        if (this.currentDimension === 'OVERWORLD') {
            this.auraParticles.forEach((p, i) => {
                p.position.y += dt * 0.8;
                if (p.position.y > p.baseY + 1.5) {
                    p.position.y = p.baseY - 0.5;
                }
                p.rotation.x += dt * 2;
                p.rotation.y += dt * 2;
            });
        }
    }
}
window.DimensionManager = DimensionManager;
