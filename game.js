// Main Game Coordinator, UI, Crafting Engine & Game Loop
class GameUI {
    constructor(game) {
        this.game = game;

        this.heartsContainer = document.getElementById('hearts-container');
        this.hotbarContainer = document.getElementById('hotbar-container');
        this.clockDisplay = document.getElementById('day-night-clock');
        this.diffBtn = document.getElementById('difficulty-btn');
        this.bossContainer = document.getElementById('boss-container');
        this.bossFill = document.getElementById('boss-health-fill');
        this.craftingModal = document.getElementById('crafting-modal');
        this.craftingList = document.getElementById('crafting-recipes');
        this.notificationEl = document.getElementById('notification-banner');
        this.damageOverlay = document.getElementById('damage-overlay');
        this.portalOverlay = document.getElementById('portal-overlay');
        this.deathModal = document.getElementById('death-modal');
        this.victoryModal = document.getElementById('victory-modal');
        this.promptBox = document.getElementById('interaction-prompt');

        this.initRecipes();
        this.setupEventListeners();
    }

    initRecipes() {
        this.recipes = [
            {
                id: 'planks',
                name: 'Wood Planks',
                gives: { item: 'planks', count: 4 },
                needs: { 'wood': 1 },
                desc: 'Refined lumber from raw wood logs.'
            },
            {
                id: 'stick',
                name: 'Sticks (x4)',
                gives: { item: 'stick', count: 4 },
                needs: { 'planks': 2 },
                desc: 'Crafting handles for tools and weapons.'
            },
            {
                id: 'crafting_table',
                name: 'Crafting Table',
                gives: { item: 'crafting_table', count: 1 },
                needs: { 'planks': 4 },
                desc: 'A solid crafting workbench.'
            },
            {
                id: 'sword_wood',
                name: 'Wooden Sword',
                gives: { item: 'sword_wood', count: 1 },
                needs: { 'planks': 2, 'stick': 1 },
                desc: 'Basic starter weapon (+5 Attack).'
            },
            {
                id: 'sword_stone',
                name: 'Stone Sword',
                gives: { item: 'sword_stone', count: 1 },
                needs: { 'stone': 2, 'stick': 1 },
                desc: 'Sturdy sharpened stone blade (+7 Attack).'
            },
            {
                id: 'sword_iron',
                name: 'Iron Sword',
                gives: { item: 'sword_iron', count: 1 },
                needs: { 'iron': 2, 'stick': 1 },
                desc: 'Forged iron broadsword (+10 Attack).'
            },
            {
                id: 'sword_diamond',
                name: 'Diamond Sword',
                gives: { item: 'sword_diamond', count: 1 },
                needs: { 'diamond': 2, 'stick': 1 },
                desc: 'Unstoppable razor-sharp diamond blade (+16 Attack)!'
            },
            {
                id: 'pickaxe_wood',
                name: 'Wooden Pickaxe',
                gives: { item: 'pickaxe_wood', count: 1 },
                needs: { 'planks': 3, 'stick': 2 },
                desc: 'Basic mining tool.'
            },
            {
                id: 'pickaxe_stone',
                name: 'Stone Pickaxe',
                gives: { item: 'pickaxe_stone', count: 1 },
                needs: { 'stone': 3, 'stick': 2 },
                desc: 'Mining tool to extract iron ore.'
            },
            {
                id: 'pickaxe_iron',
                name: 'Iron Pickaxe',
                gives: { item: 'pickaxe_iron', count: 1 },
                needs: { 'iron': 3, 'stick': 2 },
                desc: 'Durable pickaxe to mine gold & diamonds.'
            },
            {
                id: 'pickaxe_diamond',
                name: 'Diamond Pickaxe',
                gives: { item: 'pickaxe_diamond', count: 1 },
                needs: { 'diamond': 3, 'stick': 2 },
                desc: 'Fastest legendary mining pickaxe!'
            },
            {
                id: 'bow',
                name: 'Bow',
                gives: { item: 'bow', count: 1 },
                needs: { 'stick': 3, 'iron': 1 },
                desc: 'Ranged bow to shoot the Ender Dragon and mobs.'
            },
            {
                id: 'arrow',
                name: 'Arrows (x4)',
                gives: { item: 'arrow', count: 4 },
                needs: { 'stick': 1, 'iron': 1 },
                desc: 'Ranged ammunition for Bow.'
            },
            {
                id: 'key',
                name: 'Ancient Portal Key',
                gives: { item: 'key', count: 1 },
                needs: { 'diamond': 1, 'gold': 2 },
                desc: '★ REQUIRED: Golden key infused with diamond to unlock the spawn portal to The End!'
            }
        ];
    }

    setupEventListeners() {
        // Difficulty toggle button
        this.diffBtn.addEventListener('click', () => {
            const current = this.game.entityManager.difficulty;
            const next = (current === 'easy') ? 'hard' : 'easy';
            this.game.entityManager.setDifficulty(next);
            this.diffBtn.textContent = `Difficulty: ${next.toUpperCase()}`;
            this.diffBtn.className = `diff-btn ${next}`;
            this.showNotification(`Difficulty switched to: ${next.toUpperCase()}`);
        });

        // Close crafting button
        document.getElementById('close-crafting').addEventListener('click', () => {
            this.toggleCrafting(false);
        });

        // Respawn button
        document.getElementById('respawn-btn').addEventListener('click', () => {
            this.deathModal.classList.remove('active');
            this.game.player.respawnAtSurface();
            this.updateHearts();
            document.body.requestPointerLock();
        });

        // Victory button
        document.getElementById('victory-btn').addEventListener('click', () => {
            this.victoryModal.classList.remove('active');
            document.body.requestPointerLock();
        });
    }

    updateHearts() {
        const hp = this.game.player.health;
        const totalHearts = 10;
        let html = '';
        for (let i = 0; i < totalHearts; i++) {
            const heartValue = (i + 1) * 2;
            if (hp >= heartValue) {
                html += '<span class="heart full">❤️</span>';
            } else if (hp >= heartValue - 1) {
                html += '<span class="heart half">💔</span>';
            } else {
                html += '<span class="heart empty">🖤</span>';
            }
        }
        this.heartsContainer.innerHTML = html;
    }

    updateHotbarUI() {
        const player = this.game.player;
        let html = '';
        for (let i = 0; i < 9; i++) {
            const item = player.hotbar[i];
            const isSelected = (i === player.selectedSlot);
            const iconUrl = item ? window.textureGenerator.getItemIcon(item.type) : '';
            const countStr = (item && item.count > 1) ? `<span class="slot-count">${item.count}</span>` : '';

            html += `
                <div class="hotbar-slot ${isSelected ? 'active' : ''}" data-slot="${i}">
                    <span class="slot-num">${i + 1}</span>
                    ${item ? `<img src="${iconUrl}" class="slot-icon" alt="${item.type}">` : ''}
                    ${countStr}
                </div>
            `;
        }
        this.hotbarContainer.innerHTML = html;

        // Click on hotbar slot to select
        const slots = this.hotbarContainer.querySelectorAll('.hotbar-slot');
        slots.forEach(slotEl => {
            slotEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const slotIdx = parseInt(slotEl.dataset.slot, 10);
                this.game.player.selectSlot(slotIdx);
            });
        });
    }

    updateDayNightClock() {
        this.clockDisplay.textContent = this.game.dayNight.getTimeRemainingFormatted();
    }

    toggleCrafting(forceState = null) {
        const isCurrentlyOpen = this.craftingModal.classList.contains('active');
        const open = (forceState !== null) ? forceState : !isCurrentlyOpen;

        if (open) {
            document.exitPointerLock();
            this.craftingModal.classList.add('active');
            this.renderCraftingMenu();
        } else {
            this.craftingModal.classList.remove('active');
            document.body.requestPointerLock();
        }
    }

    renderCraftingMenu() {
        const player = this.game.player;
        let html = '';

        this.recipes.forEach(rec => {
            // Check if player has all required ingredients
            let canCraft = true;
            let needsHtml = '';

            for (let [itemType, reqCount] of Object.entries(rec.needs)) {
                const owned = player.getItemCount(itemType);
                const hasEnough = (owned >= reqCount);
                if (!hasEnough) canCraft = false;

                needsHtml += `
                    <span class="recipe-need ${hasEnough ? 'ok' : 'missing'}">
                        <img src="${window.textureGenerator.getItemIcon(itemType)}" class="mini-icon">
                        ${owned}/${reqCount}
                    </span>
                `;
            }

            const givesIcon = window.textureGenerator.getItemIcon(rec.gives.item);
            const isSpecialKey = (rec.id === 'key');

            html += `
                <div class="recipe-card ${canCraft ? 'craftable' : 'disabled'} ${isSpecialKey ? 'key-recipe' : ''}">
                    <div class="recipe-left">
                        <img src="${givesIcon}" class="recipe-icon">
                        <div class="recipe-info">
                            <div class="recipe-title">${rec.name}</div>
                            <div class="recipe-desc">${rec.desc}</div>
                            <div class="recipe-needs">${needsHtml}</div>
                        </div>
                    </div>
                    <button class="craft-btn ${canCraft ? 'enabled' : 'disabled'}" data-recipe="${rec.id}">
                        Craft
                    </button>
                </div>
            `;
        });

        this.craftingList.innerHTML = html;

        // Bind craft buttons
        const craftBtns = this.craftingList.querySelectorAll('.craft-btn.enabled');
        craftBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const recId = btn.dataset.recipe;
                this.craftRecipe(recId);
            });
        });
    }

    craftRecipe(recipeId) {
        const rec = this.recipes.find(r => r.id === recipeId);
        if (!rec) return;

        const player = this.game.player;
        // Verify ingredients
        for (let [itemType, reqCount] of Object.entries(rec.needs)) {
            if (player.getItemCount(itemType) < reqCount) return;
        }

        // Deduct ingredients
        for (let [itemType, reqCount] of Object.entries(rec.needs)) {
            player.removeItem(itemType, reqCount);
        }

        // Add result
        player.addItemToInventory(rec.gives.item, rec.gives.count);
        window.audioManager.playBlockPlace();

        if (rec.id === 'key') {
            window.audioManager.playUnlockChime();
            this.showNotification("🔑 ANCIENT KEY CRAFTED! Use it at the spawn portal to unlock The End!");
        } else {
            this.showNotification(`Crafted: ${rec.name}!`);
        }

        this.updateHotbarUI();
        this.renderCraftingMenu();
    }

    updateInventoryUI() {
        this.updateHotbarUI();
        if (this.craftingModal.classList.contains('active')) {
            this.renderCraftingMenu();
        }
    }

    showBossBar(show, title = "ENDER DRAGON", ratio = 1.0) {
        if (show) {
            this.bossContainer.style.display = 'block';
            document.getElementById('boss-title').textContent = title;
            this.updateBossHealth(ratio);
        } else {
            this.bossContainer.style.display = 'none';
        }
    }

    updateBossHealth(ratio) {
        this.bossFill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
    }

    showNotification(msg) {
        this.notificationEl.textContent = msg;
        this.notificationEl.classList.add('show');
        clearTimeout(this.notifTimer);
        this.notifTimer = setTimeout(() => {
            this.notificationEl.classList.remove('show');
        }, 3200);
    }

    flashDamage() {
        this.damageOverlay.classList.add('flash');
        setTimeout(() => this.damageOverlay.classList.remove('flash'), 180);
    }

    flashPortalWarp() {
        this.portalOverlay.classList.add('warp');
        setTimeout(() => this.portalOverlay.classList.remove('warp'), 800);
    }

    showDeathScreen() {
        document.exitPointerLock();
        this.deathModal.classList.add('active');
    }

    showVictoryScreen() {
        document.exitPointerLock();
        this.victoryModal.classList.add('active');
    }

    setPrompt(text) {
        if (text) {
            this.promptBox.innerHTML = text;
            this.promptBox.style.display = 'block';
        } else {
            this.promptBox.style.display = 'none';
        }
    }
}

// ---------------- MAIN GAME CONTROLLER ----------------

class Minecraft3DGame {
    constructor() {
        this.initThree();
        this.world = new VoxelWorld(this.scene);
        this.player = new PlayerController(this.camera, this.scene, this.world);
        this.dayNight = new DayNightCycle(this.scene, this.renderer);
        this.entityManager = new EntityManager(this.scene, this.world, this.player);
        this.dragonBoss = new DragonBossFight(this.scene, this.player, this.world);
        this.dimensionManager = new DimensionManager(this.scene, this.player, this.world, this.dragonBoss);

        this.multiplayer = new MultiplayerManager(this.scene, this.world, this.player);
        window.gameMultiplayer = this.multiplayer;

        window.gameDimensions = this.dimensionManager;
        window.dragonBoss = this.dragonBoss;
        window.gameEntityManager = this.entityManager;

        this.ui = new GameUI(this);
        window.gameUI = this.ui;

        this.clock = new THREE.Clock();
        this.setupPointerLock();
        this.setupWindowResize();

        this.ui.updateHearts();
        this.ui.updateHotbarUI();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);

        this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    setupPointerLock() {
        const startOverlay = document.getElementById('start-overlay');
        const startBtn = document.getElementById('start-btn');
        const canvasContainer = document.getElementById('canvas-container');

        const enterGame = () => {
            window.audioManager.ensureContext();
            startOverlay.style.display = 'none';
            this.player.isLocked = true;
            try {
                const promise = document.body.requestPointerLock();
                if (promise && promise.catch) {
                    promise.catch(err => {
                        console.warn("Pointer lock request handled:", err);
                    });
                }
            } catch (e) {
                console.warn("Pointer lock error:", e);
            }
        };

        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            enterGame();
        });

        // Click on screen to resume/lock
        canvasContainer.addEventListener('click', () => {
            if (startOverlay.style.display === 'none' && !this.ui.craftingModal.classList.contains('active') && !this.player.isDead) {
                this.player.isLocked = true;
                try {
                    document.body.requestPointerLock();
                } catch (e) {}
            }
        });

        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === document.body) {
                this.player.isLocked = true;
                startOverlay.style.display = 'none';
            } else {
                if (this.ui.craftingModal.classList.contains('active') || this.player.isDead || this.ui.victoryModal.classList.contains('active')) {
                    this.player.isLocked = false;
                } else {
                    this.player.isLocked = false;
                    startBtn.textContent = "RESUME GAME";
                    startOverlay.style.display = 'flex';
                }
            }
        });

        document.addEventListener('pointerlockerror', (err) => {
            console.warn("Pointer lock error:", err);
            this.player.isLocked = true;
            startOverlay.style.display = 'none';
        });
    }

    setupWindowResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.1);

        // 1. Day / Night cycle
        if (this.dimensionManager.currentDimension === 'OVERWORLD') {
            this.dayNight.update(dt, this.player.position);
            this.ui.updateDayNightClock();
        }

        // 2. Player update
        this.player.update(dt);

        // 3. Mobs & Spawner
        if (this.dimensionManager.currentDimension === 'OVERWORLD') {
            const isDay = this.dayNight.isDaytime();
            this.entityManager.update(dt, isDay);
        }

        // 4. Portal and Dimension manager
        this.dimensionManager.update(dt);

        // 5. Multiplayer update
        if (this.multiplayer) {
            this.multiplayer.update(dt);
        }

        // 6. Dragon Boss update
        if (this.dragonBoss.active) {
            this.dragonBoss.update(dt);
        }

        // 7. Portal interaction prompt check
        this.checkPortalPrompt();

        // 8. Render
        this.renderer.render(this.scene, this.camera);
    }

    checkPortalPrompt() {
        if (this.dimensionManager.currentDimension !== 'OVERWORLD') {
            this.ui.setPrompt(null);
            return;
        }

        const portalPos = this.world.portalPosition;
        const distToPortal = this.player.position.distanceTo(new THREE.Vector3(portalPos.x, portalPos.y + 2, portalPos.z));

        if (distToPortal < 5.0) {
            if (!this.world.portalUnlocked) {
                const hasKey = this.player.getItemCount('key') > 0;
                if (hasKey) {
                    this.ui.setPrompt("🔒 [F] Unlock Portal with Ancient Key!");
                } else {
                    this.ui.setPrompt("🔒 Portal Locked! Craft Ancient Key (1 Diamond + 2 Gold) in (E) Crafting.");
                }
            } else {
                this.ui.setPrompt("🌀 Step into the Portal to enter The End!");
            }
        } else {
            this.ui.setPrompt(null);
        }
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    window.gameInstance = new Minecraft3DGame();
});
