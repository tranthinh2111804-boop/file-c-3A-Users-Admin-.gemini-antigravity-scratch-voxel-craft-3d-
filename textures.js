// Procedural 16x16 Pixel Texture & Atlas Generator
class TextureGenerator {
    constructor() {
        this.textures = {};
        this.atlasCanvas = document.createElement('canvas');
        this.atlasWidth = 256;
        this.atlasHeight = 256;
        this.atlasCanvas.width = this.atlasWidth;
        this.atlasCanvas.height = this.atlasHeight;
        this.atlasCtx = this.atlasCanvas.getContext('2d');
        this.uvMap = {}; // Maps textureName -> { u0, v0, u1, v1 }
        
        this.generateAll();
    }

    create16x16(painter) {
        const c = document.createElement('canvas');
        c.width = 16;
        c.height = 16;
        const ctx = c.getContext('2d');
        painter(ctx);
        return c;
    }

    generateAll() {
        // 1. Grass Top
        this.textures['grass_top'] = this.create16x16(ctx => {
            const greens = ['#5b8f22', '#629924', '#6ba627', '#53821f', '#73b22a'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    ctx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        // 2. Dirt
        this.textures['dirt'] = this.create16x16(ctx => {
            const browns = ['#866043', '#725139', '#63442f', '#593d2a', '#7a573d'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    ctx.fillStyle = browns[Math.floor(Math.random() * browns.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        // 3. Grass Side (Dirt with grass top)
        this.textures['grass_side'] = this.create16x16(ctx => {
            // Dirt base
            ctx.drawImage(this.textures['dirt'], 0, 0);
            const greens = ['#5b8f22', '#629924', '#6ba627', '#73b22a'];
            for (let x = 0; x < 16; x++) {
                const depth = 2 + Math.floor(Math.sin(x * 1.5) * 1.5 + Math.random());
                for (let y = 0; y < depth; y++) {
                    ctx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
                // occasional hanging blade
                if (Math.random() > 0.5) {
                    ctx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
                    ctx.fillRect(x, depth, 1, 1);
                }
            }
        });

        // 4. Stone
        this.textures['stone'] = this.create16x16(ctx => {
            const grays = ['#757575', '#6b6b6b', '#808080', '#5e5e5e', '#8a8a8a'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    ctx.fillStyle = grays[Math.floor(Math.random() * grays.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        // Helper for Ore painting onto stone
        const makeOre = (oreColors) => {
            return this.create16x16(ctx => {
                ctx.drawImage(this.textures['stone'], 0, 0);
                const clumps = [
                    { cx: 5, cy: 6, r: 2.5 },
                    { cx: 11, cy: 10, r: 2.8 },
                    { cx: 8, cy: 12, r: 1.8 },
                    { cx: 12, cy: 4, r: 1.6 }
                ];
                clumps.forEach(clump => {
                    for (let dy = -3; dy <= 3; dy++) {
                        for (let dx = -3; dx <= 3; dx++) {
                            const d = Math.sqrt(dx*dx + dy*dy);
                            if (d <= clump.r && Math.random() > 0.15) {
                                const px = clump.cx + dx;
                                const py = clump.cy + dy;
                                if (px >= 0 && px < 16 && py >= 0 && py < 16) {
                                    ctx.fillStyle = oreColors[Math.floor(Math.random() * oreColors.length)];
                                    ctx.fillRect(px, py, 1, 1);
                                }
                            }
                        }
                    }
                });
            });
        };

        // 5. Coal Ore (dark charcoal flecks)
        this.textures['coal_ore'] = makeOre(['#111111', '#222222', '#333333', '#1a1a1a']);

        // 6. Iron Ore (tan/peach metallic flecks)
        this.textures['iron_ore'] = makeOre(['#d8af93', '#bc8e6f', '#e5c5ad', '#966a4d']);

        // 7. Gold Ore (gleaming yellow-gold flecks)
        this.textures['gold_ore'] = makeOre(['#fcee4b', '#f5b825', '#dca018', '#fff580']);

        // 8. Diamond Ore (brilliant cyan-blue gems)
        this.textures['diamond_ore'] = makeOre(['#2ee7d6', '#5df9e9', '#1dbcb4', '#aafff7', '#169993']);

        // 9. Bedrock (rugged near-black indestructible stone)
        this.textures['bedrock'] = this.create16x16(ctx => {
            const darks = ['#1a1a1a', '#2b2b2b', '#111111', '#383838', '#080808'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    ctx.fillStyle = darks[Math.floor(Math.random() * darks.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        // 10. Wood Side (Oak log)
        this.textures['wood_side'] = this.create16x16(ctx => {
            const bark = ['#685232', '#584428', '#4b3920', '#745d3c'];
            for (let x = 0; x < 16; x++) {
                for (let y = 0; y < 16; y++) {
                    const idx = Math.floor(Math.abs(Math.sin(x * 1.8 + y * 0.1)) * bark.length);
                    ctx.fillStyle = bark[idx % bark.length];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        // 11. Wood Top (Oak rings)
        this.textures['wood_top'] = this.create16x16(ctx => {
            const rings = ['#9e8156', '#876b42', '#735732', '#b39569'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const dist = Math.sqrt((x - 7.5)**2 + (y - 7.5)**2);
                    const ringIdx = Math.floor(dist * 0.8) % rings.length;
                    ctx.fillStyle = rings[ringIdx];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        // 12. Leaves (Oak leaves)
        this.textures['leaves'] = this.create16x16(ctx => {
            const greens = ['#296818', '#388822', '#1f5312', '#4ea632', '#2f741b'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    ctx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        // 13. Planks (Wood planks)
        this.textures['planks'] = this.create16x16(ctx => {
            const wood = ['#9e7b4e', '#8f6e43', '#af8c5c', '#7d5e37'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    ctx.fillStyle = wood[Math.floor(Math.random() * wood.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
            // Plank seams
            ctx.fillStyle = '#553d20';
            ctx.fillRect(0, 3, 16, 1);
            ctx.fillRect(0, 7, 16, 1);
            ctx.fillRect(0, 11, 16, 1);
            ctx.fillRect(0, 15, 16, 1);
            ctx.fillRect(8, 0, 1, 3);
            ctx.fillRect(4, 4, 1, 3);
            ctx.fillRect(12, 8, 1, 3);
            ctx.fillRect(7, 12, 1, 3);
        });

        // 14. Crafting Table
        this.textures['crafting_table'] = this.create16x16(ctx => {
            ctx.drawImage(this.textures['planks'], 0, 0);
            // Tools and borders
            ctx.fillStyle = '#3a2712';
            ctx.strokeRect(1.5, 1.5, 13, 13);
            // Grid representation
            ctx.fillStyle = '#1e1409';
            ctx.fillRect(4, 4, 2, 8);
            ctx.fillRect(10, 4, 2, 8);
            ctx.fillRect(4, 7, 8, 2);
        });

        // 15. Obsidian (deep dark purple-black)
        this.textures['obsidian'] = this.create16x16(ctx => {
            const obs = ['#161326', '#221d3b', '#100c1e', '#2e274f', '#3c2466'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    ctx.fillStyle = obs[Math.floor(Math.random() * obs.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        // 16. Portal Block (Swirling purple vortex)
        this.textures['portal'] = this.create16x16(ctx => {
            const purples = ['#6922aa', '#843bd1', '#4d1480', '#ad5efb', '#c78eff', '#2e0854'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const wave = Math.sin(x * 0.4 + y * 0.4) + Math.cos(x * 0.3 - y * 0.2);
                    const idx = Math.floor(Math.abs(wave) * 2.5) % purples.length;
                    ctx.fillStyle = purples[idx];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        // 17. End Stone (pale yellow-white lunar crater rock)
        this.textures['end_stone'] = this.create16x16(ctx => {
            const end = ['#d8dc93', '#e4e8a5', '#c8cc84', '#ecefb5', '#b6ba76'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    ctx.fillStyle = end[Math.floor(Math.random() * end.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        // 18. Dragon Egg (dark specked egg texture)
        this.textures['dragon_egg'] = this.create16x16(ctx => {
            const eggDarks = ['#0c0714', '#150d23', '#201336', '#08050e'];
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    ctx.fillStyle = eggDarks[Math.floor(Math.random() * eggDarks.length)];
                    ctx.fillRect(x, y, 1, 1);
                }
            }
            // Purple magical flecks
            const flecks = ['#b347fd', '#d78eff', '#801ecc'];
            for (let i = 0; i < 18; i++) {
                ctx.fillStyle = flecks[i % flecks.length];
                ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
            }
        });

        // Build the Texture Atlas (16x16 grid on 256x256 atlas)
        this.buildAtlas();
    }

    buildAtlas() {
        const textureList = [
            'grass_top', 'grass_side', 'dirt', 'stone',
            'bedrock', 'wood_side', 'wood_top', 'leaves',
            'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore',
            'obsidian', 'portal', 'end_stone', 'dragon_egg',
            'planks', 'crafting_table'
        ];

        const tileSize = 16;
        const cols = this.atlasWidth / tileSize; // 16 cols

        this.atlasCtx.clearRect(0, 0, this.atlasWidth, this.atlasHeight);

        textureList.forEach((name, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = col * tileSize;
            const y = row * tileSize;

            if (this.textures[name]) {
                this.atlasCtx.drawImage(this.textures[name], x, y);
            }

            // UV mapping (OpenGL UV convention: v goes 0 at bottom to 1 at top)
            const u0 = x / this.atlasWidth;
            const u1 = (x + tileSize) / this.atlasWidth;
            const v0 = 1.0 - (y + tileSize) / this.atlasHeight;
            const v1 = 1.0 - y / this.atlasHeight;

            this.uvMap[name] = { u0, v0, u1, v1 };
        });

        this.atlasTexture = new THREE.CanvasTexture(this.atlasCanvas);
        this.atlasTexture.magFilter = THREE.NearestFilter;
        this.atlasTexture.minFilter = THREE.NearestFilter;
        this.atlasTexture.generateMipmaps = false;
    }

    // Helper to get item icons as DataURL for UI / inventory
    getItemIcon(type) {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const drawSword = (bladeColor, hiltColor = '#855e34') => {
            ctx.fillStyle = hiltColor;
            ctx.fillRect(6, 24, 4, 4);
            ctx.fillStyle = '#444';
            ctx.fillRect(4, 20, 8, 4);
            ctx.fillStyle = bladeColor;
            for (let i = 0; i < 7; i++) {
                ctx.fillRect(8 + i * 2, 18 - i * 2, 4, 4);
            }
        };

        const drawPickaxe = (headColor) => {
            // handle
            ctx.fillStyle = '#855e34';
            for (let i = 0; i < 9; i++) {
                ctx.fillRect(6 + i * 2, 24 - i * 2, 3, 3);
            }
            // head
            ctx.fillStyle = headColor;
            ctx.fillRect(16, 4, 12, 4);
            ctx.fillRect(24, 8, 4, 8);
            ctx.fillRect(12, 6, 4, 4);
        };

        switch (type) {
            case 'wood':
                ctx.drawImage(this.textures['wood_side'], 0, 0, 32, 32);
                break;
            case 'planks':
                ctx.drawImage(this.textures['planks'], 0, 0, 32, 32);
                break;
            case 'stick':
                ctx.fillStyle = '#855e34';
                for (let i = 0; i < 10; i++) ctx.fillRect(6 + i * 2, 24 - i * 2, 3, 3);
                break;
            case 'stone':
                ctx.drawImage(this.textures['stone'], 0, 0, 32, 32);
                break;
            case 'coal':
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.arc(16, 16, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#444';
                ctx.fillRect(12, 12, 4, 4);
                break;
            case 'iron':
                ctx.fillStyle = '#d8af93';
                ctx.fillRect(8, 10, 16, 12);
                ctx.fillStyle = '#f3ddcb';
                ctx.fillRect(10, 12, 12, 4);
                break;
            case 'gold':
                ctx.fillStyle = '#f5b825';
                ctx.fillRect(8, 10, 16, 12);
                ctx.fillStyle = '#fff580';
                ctx.fillRect(10, 12, 12, 4);
                break;
            case 'diamond':
                ctx.fillStyle = '#2ee7d6';
                ctx.beginPath();
                ctx.moveTo(16, 6);
                ctx.lineTo(26, 14);
                ctx.lineTo(16, 26);
                ctx.lineTo(6, 14);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#aafff7';
                ctx.fillRect(14, 12, 4, 4);
                break;
            case 'sword_wood':
                drawSword('#9e7b4e');
                break;
            case 'sword_stone':
                drawSword('#757575');
                break;
            case 'sword_iron':
                drawSword('#e0e0e0');
                break;
            case 'sword_diamond':
                drawSword('#2ee7d6');
                break;
            case 'pickaxe_wood':
                drawPickaxe('#9e7b4e');
                break;
            case 'pickaxe_stone':
                drawPickaxe('#757575');
                break;
            case 'pickaxe_iron':
                drawPickaxe('#e0e0e0');
                break;
            case 'pickaxe_diamond':
                drawPickaxe('#2ee7d6');
                break;
            case 'bow':
                ctx.strokeStyle = '#855e34';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(16, 16, 12, -Math.PI / 4, (3 * Math.PI) / 4);
                ctx.stroke();
                ctx.strokeStyle = '#eee';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(8, 24);
                ctx.lineTo(24, 8);
                ctx.stroke();
                break;
            case 'arrow':
                ctx.fillStyle = '#855e34';
                for (let i = 0; i < 9; i++) ctx.fillRect(6 + i * 2, 24 - i * 2, 2, 2);
                ctx.fillStyle = '#888';
                ctx.fillRect(22, 6, 6, 6);
                ctx.fillStyle = '#fff';
                ctx.fillRect(4, 24, 4, 4);
                break;
            case 'key':
                // Ornate Golden Key with glowing diamond gem
                ctx.fillStyle = '#f5b825';
                // handle ring
                ctx.beginPath();
                ctx.arc(10, 10, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#111';
                ctx.beginPath();
                ctx.arc(10, 10, 3.5, 0, Math.PI * 2);
                ctx.fill();
                // key shaft
                ctx.fillStyle = '#f5b825';
                ctx.fillRect(14, 13, 12, 4);
                // key teeth
                ctx.fillRect(22, 17, 4, 5);
                ctx.fillRect(17, 17, 3, 3);
                // Diamond socket inside ring
                ctx.fillStyle = '#2ee7d6';
                ctx.fillRect(9, 9, 3, 3);
                break;
            case 'meat':
                ctx.fillStyle = '#b83b3b';
                ctx.beginPath();
                ctx.arc(16, 16, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#eee';
                ctx.fillRect(20, 16, 6, 4);
                break;
            case 'dragon_egg':
                ctx.drawImage(this.textures['dragon_egg'], 0, 0, 32, 32);
                break;
            default:
                if (this.textures[type]) {
                    ctx.drawImage(this.textures[type], 0, 0, 32, 32);
                } else {
                    ctx.fillStyle = '#999';
                    ctx.fillRect(4, 4, 24, 24);
                }
        }
        return c.toDataURL();
    }
}
window.textureGenerator = new TextureGenerator();
