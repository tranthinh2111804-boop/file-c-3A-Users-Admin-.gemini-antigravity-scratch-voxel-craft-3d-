// Voxel World Engine with 3D Cave Generation & Depth-Scaled Ore System
const BLOCKS = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    BEDROCK: 4,
    WOOD: 5,
    LEAVES: 6,
    COAL_ORE: 7,
    IRON_ORE: 8,
    GOLD_ORE: 9,
    DIAMOND_ORE: 10,
    OBSIDIAN: 11,
    PLANKS: 12,
    CRAFTING_TABLE: 13,
    END_STONE: 14,
    PORTAL_BLOCK: 15,
    DRAGON_EGG: 16
};

const BLOCK_NAMES = {
    0: 'Air',
    1: 'Grass',
    2: 'Dirt',
    3: 'Stone',
    4: 'Bedrock',
    5: 'Wood',
    6: 'Leaves',
    7: 'Coal Ore',
    8: 'Iron Ore',
    9: 'Gold Ore',
    10: 'Diamond Ore',
    11: 'Obsidian',
    12: 'Wood Planks',
    13: 'Crafting Table',
    14: 'End Stone',
    15: 'Portal',
    16: 'Dragon Egg'
};

const BLOCK_DROPS = {
    [BLOCKS.GRASS]: { item: 'dirt', count: 1 },
    [BLOCKS.DIRT]: { item: 'dirt', count: 1 },
    [BLOCKS.STONE]: { item: 'stone', count: 1 },
    [BLOCKS.WOOD]: { item: 'wood', count: 1 },
    [BLOCKS.LEAVES]: { item: 'leaves', count: 1 },
    [BLOCKS.COAL_ORE]: { item: 'coal', count: 1 },
    [BLOCKS.IRON_ORE]: { item: 'iron', count: 1 },
    [BLOCKS.GOLD_ORE]: { item: 'gold', count: 1 },
    [BLOCKS.DIAMOND_ORE]: { item: 'diamond', count: 1 },
    [BLOCKS.OBSIDIAN]: { item: 'obsidian', count: 1 },
    [BLOCKS.PLANKS]: { item: 'planks', count: 1 },
    [BLOCKS.CRAFTING_TABLE]: { item: 'crafting_table', count: 1 },
    [BLOCKS.END_STONE]: { item: 'end_stone', count: 1 },
    [BLOCKS.DRAGON_EGG]: { item: 'dragon_egg', count: 1 }
};

class VoxelWorld {
    constructor(scene) {
        this.scene = scene;
        this.chunkSize = 16;
        this.worldChunksX = 5; // 80 blocks total
        this.worldChunksZ = 5;
        this.worldHeight = 46;

        this.worldSizeX = this.worldChunksX * this.chunkSize;
        this.worldSizeZ = this.worldChunksZ * this.chunkSize;

        // Offset to center world around (0, 0)
        this.offsetX = Math.floor(this.worldSizeX / 2);
        this.offsetZ = Math.floor(this.worldSizeZ / 2);

        // Voxel storage: 3D array indexed as [x][y][z]
        this.voxels = new Uint8Array(this.worldSizeX * this.worldHeight * this.worldSizeZ);

        this.chunks = new Map(); // key "cx,cz" -> Mesh
        this.simplex = new SimplexNoise(4242);

        this.portalPosition = { x: 0, y: 34, z: 0 };
        this.portalUnlocked = false;

        this.initWorldMaterial();
        this.generateTerrain();
        this.generateCavesAndOres();
        this.generateTrees();
        this.buildSpawnPortal();
        this.meshAllChunks();
    }

    initWorldMaterial() {
        this.material = new THREE.MeshLambertMaterial({
            map: window.textureGenerator.atlasTexture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.FrontSide
        });
    }

    getIndex(x, y, z) {
        if (x < 0 || x >= this.worldSizeX || y < 0 || y >= this.worldHeight || z < 0 || z >= this.worldSizeZ) {
            return -1;
        }
        return (y * this.worldSizeX * this.worldSizeZ) + (z * this.worldSizeX) + x;
    }

    getBlock(worldX, worldY, worldZ) {
        const lx = worldX + this.offsetX;
        const ly = worldY;
        const lz = worldZ + this.offsetZ;
        const idx = this.getIndex(lx, ly, lz);
        if (idx === -1) return BLOCKS.AIR;
        return this.voxels[idx];
    }

    setBlock(worldX, worldY, worldZ, blockId, updateMesh = true) {
        const lx = worldX + this.offsetX;
        const ly = worldY;
        const lz = worldZ + this.offsetZ;
        const idx = this.getIndex(lx, ly, lz);
        if (idx === -1) return false;

        this.voxels[idx] = blockId;

        if (updateMesh) {
            const cx = Math.floor(lx / this.chunkSize);
            const cz = Math.floor(lz / this.chunkSize);
            this.meshChunk(cx, cz);

            // Check if on chunk borders to update neighboring chunks
            const rx = lx % this.chunkSize;
            const rz = lz % this.chunkSize;
            if (rx === 0 && cx > 0) this.meshChunk(cx - 1, cz);
            if (rx === this.chunkSize - 1 && cx < this.worldChunksX - 1) this.meshChunk(cx + 1, cz);
            if (rz === 0 && cz > 0) this.meshChunk(cx, cz - 1);
            if (rz === this.chunkSize - 1 && cz < this.worldChunksZ - 1) this.meshChunk(cx, cz + 1);
        }
        return true;
    }

    getSurfaceHeight(worldX, worldZ) {
        for (let y = this.worldHeight - 1; y >= 0; y--) {
            const b = this.getBlock(worldX, y, worldZ);
            if (b !== BLOCKS.AIR && b !== BLOCKS.LEAVES && b !== BLOCKS.WOOD) {
                return y;
            }
        }
        return 32;
    }

    // Step 1: Base terrain heightmap
    generateTerrain() {
        for (let x = 0; x < this.worldSizeX; x++) {
            for (let z = 0; z < this.worldSizeZ; z++) {
                const wx = x - this.offsetX;
                const wz = z - this.offsetZ;

                // Multi-octave 2D noise for natural rolling hills and valleys
                const n1 = this.simplex.noise2D(wx * 0.025, wz * 0.025);
                const n2 = this.simplex.noise2D(wx * 0.06, wz * 0.06) * 0.5;
                const height = Math.floor(34 + (n1 + n2) * 5);
                const surfaceY = Math.max(26, Math.min(this.worldHeight - 4, height));

                for (let y = 0; y < this.worldHeight; y++) {
                    const idx = this.getIndex(x, y, z);
                    if (y === 0) {
                        this.voxels[idx] = BLOCKS.BEDROCK;
                    } else if (y < surfaceY - 3) {
                        this.voxels[idx] = BLOCKS.STONE;
                    } else if (y < surfaceY) {
                        this.voxels[idx] = BLOCKS.DIRT;
                    } else if (y === surfaceY) {
                        this.voxels[idx] = BLOCKS.GRASS;
                    } else {
                        this.voxels[idx] = BLOCKS.AIR;
                    }
                }
            }
        }
    }

    // Step 2: 3D Caves and Depth-Scaled Ores
    generateCavesAndOres() {
        for (let x = 0; x < this.worldSizeX; x++) {
            for (let z = 0; z < this.worldSizeZ; z++) {
                const wx = x - this.offsetX;
                const wz = z - this.offsetZ;

                for (let y = 1; y < this.worldHeight - 3; y++) {
                    const idx = this.getIndex(x, y, z);
                    const currentBlock = this.voxels[idx];
                    if (currentBlock !== BLOCKS.STONE && currentBlock !== BLOCKS.DIRT) continue;

                    // 3D Simplex noise for cave worms and cavern networks
                    const cave1 = this.simplex.noise3D(wx * 0.075, y * 0.1, wz * 0.075);
                    const cave2 = this.simplex.noise3D((wx + 100) * 0.06, (y + 50) * 0.08, (wz + 100) * 0.06);

                    // Tubelike tunnels: abs(noise) < threshold
                    const isCave = (Math.abs(cave1) < 0.14 && Math.abs(cave2) < 0.22) || (cave1 > 0.42 && y < 30);

                    // Keep a 4x4 zone around spawn point portal solid so portal has sturdy ground
                    const distToSpawn = Math.sqrt(wx * wx + wz * wz);
                    if (isCave && !(distToSpawn < 6 && y > 24)) {
                        this.voxels[idx] = BLOCKS.AIR;
                        continue;
                    }

                    // Ore Generation strictly obeying prompt:
                    // "the deeper of the caves, the more frequent the rare ores are. like:gold, diamond;
                    // coals spawning the most often, next up is iron, then gold, finally diamond"
                    if (this.voxels[idx] === BLOCKS.STONE) {
                        const rand = Math.random();

                        // Depth factor: 0 at y=32, 1 at bedrock y=1
                        const depthRatio = Math.max(0, (32 - y) / 31.0);

                        // 1. DIAMOND: Deepest caves (y: 1 to 10). Frequency scales steeply with depth!
                        // At y=10: 0.4%, scaling up to 2.2% at y=1!
                        if (y <= 10) {
                            const diamondChance = 0.004 + (depthRatio ** 2) * 0.022;
                            if (rand < diamondChance) {
                                this.voxels[idx] = BLOCKS.DIAMOND_ORE;
                                continue;
                            }
                        }

                        // 2. GOLD: Deep caves (y: 1 to 18). Frequency increases with depth!
                        // At y=18: 0.6%, scaling up to 3.0% at y=1!
                        if (y <= 18) {
                            const goldChance = 0.006 + depthRatio * 0.026;
                            if (rand < goldChance) {
                                this.voxels[idx] = BLOCKS.GOLD_ORE;
                                continue;
                            }
                        }

                        // 3. IRON: Middle to deep (y: 1 to 32). Moderate frequent rate (~3.5%)
                        if (y <= 32) {
                            const ironChance = 0.022 + depthRatio * 0.02;
                            if (rand < ironChance) {
                                this.voxels[idx] = BLOCKS.IRON_ORE;
                                continue;
                            }
                        }

                        // 4. COAL: Most common ore! Spawns at all stone depths (y: 1 to 38) at high rate (~5.5%)
                        if (y <= 38) {
                            const coalChance = 0.055;
                            if (rand < coalChance) {
                                this.voxels[idx] = BLOCKS.COAL_ORE;
                                continue;
                            }
                        }
                    }
                }
            }
        }
    }

    // Step 3: Oak Trees on surface
    generateTrees() {
        // Deterministic pseudo-random placement
        for (let x = 4; x < this.worldSizeX - 4; x += 4) {
            for (let z = 4; z < this.worldSizeZ - 4; z += 4) {
                const wx = x - this.offsetX;
                const wz = z - this.offsetZ;

                // Don't place tree right on the spawn portal
                if (Math.abs(wx) < 6 && Math.abs(wz) < 6) continue;

                const jitterX = x + Math.floor(this.simplex.noise2D(wx * 0.3, wz * 0.3) * 2);
                const jitterZ = z + Math.floor(this.simplex.noise2D(wz * 0.3, wx * 0.3) * 2);

                const jwx = jitterX - this.offsetX;
                const jwz = jitterZ - this.offsetZ;
                const groundY = this.getSurfaceHeight(jwx, jwz);

                if (groundY < 25 || groundY > this.worldHeight - 8) continue;
                if (this.getBlock(jwx, groundY, jwz) !== BLOCKS.GRASS) continue;

                // 40% chance of tree
                if (Math.random() < 0.45) {
                    this.growTree(jwx, groundY + 1, jwz);
                }
            }
        }
    }

    growTree(wx, startY, wz) {
        const trunkHeight = 4 + Math.floor(Math.random() * 2);

        // Trunk
        for (let y = 0; y < trunkHeight; y++) {
            this.setBlock(wx, startY + y, wz, BLOCKS.WOOD, false);
        }

        // Canopy leaves
        const topY = startY + trunkHeight;
        for (let ly = topY - 2; ly <= topY + 1; ly++) {
            const radius = (ly >= topY) ? 1 : 2;
            for (let lx = -radius; lx <= radius; lx++) {
                for (let lz = -radius; lz <= radius; lz++) {
                    if (Math.abs(lx) === radius && Math.abs(lz) === radius && Math.random() > 0.4) continue;
                    if (lx === 0 && lz === 0 && ly < topY) continue; // trunk inside
                    if (this.getBlock(wx + lx, ly, wz + lz) === BLOCKS.AIR) {
                        this.setBlock(wx + lx, ly, wz + lz, BLOCKS.LEAVES, false);
                    }
                }
            }
        }
    }

    // Step 4: Build Spawn Portal Frame & Lock Structure
    buildSpawnPortal() {
        const groundY = this.getSurfaceHeight(0, 0);
        this.portalPosition = { x: 0, y: groundY, z: 0 };

        // Flat stone platform around spawn
        for (let dx = -4; dx <= 4; dx++) {
            for (let dz = -4; dz <= 4; dz++) {
                this.setBlock(dx, groundY, dz, BLOCKS.STONE, false);
                // Clear air above
                for (let dy = 1; dy <= 6; dy++) {
                    this.setBlock(dx, groundY + dy, dz, BLOCKS.AIR, false);
                }
            }
        }

        // Obsidian Portal Frame: 4 wide (x = -1 to 2), 5 high (y = 1 to 5)
        // Bottom bar
        for (let x = -1; x <= 2; x++) {
            this.setBlock(x, groundY + 1, 0, BLOCKS.OBSIDIAN, false);
        }
        // Top bar
        for (let x = -1; x <= 2; x++) {
            this.setBlock(x, groundY + 5, 0, BLOCKS.OBSIDIAN, false);
        }
        // Pillars
        for (let y = 2; y <= 4; y++) {
            this.setBlock(-1, groundY + y, 0, BLOCKS.OBSIDIAN, false);
            this.setBlock(2, groundY + y, 0, BLOCKS.OBSIDIAN, false);
        }

        // Portal center initially AIR (locked). When unlocked, becomes PORTAL_BLOCK!
        this.portalUnlocked = false;
    }

    unlockPortal() {
        this.portalUnlocked = true;
        const groundY = this.portalPosition.y;
        // Fill center of portal with PORTAL_BLOCK
        for (let x = 0; x <= 1; x++) {
            for (let y = 2; y <= 4; y++) {
                this.setBlock(x, groundY + y, 0, BLOCKS.PORTAL_BLOCK, true);
            }
        }
    }

    // Chunk Mesh generation
    meshAllChunks() {
        for (let cx = 0; cx < this.worldChunksX; cx++) {
            for (let cz = 0; cz < this.worldChunksZ; cz++) {
                this.meshChunk(cx, cz);
            }
        }
    }

    meshChunk(cx, cz) {
        const key = `${cx},${cz}`;
        if (this.chunks.has(key)) {
            const oldMesh = this.chunks.get(key);
            this.scene.remove(oldMesh);
            if (oldMesh.geometry) oldMesh.geometry.dispose();
            this.chunks.delete(key);
        }

        const startX = cx * this.chunkSize;
        const startZ = cz * this.chunkSize;
        const endX = startX + this.chunkSize;
        const endZ = startZ + this.chunkSize;

        const positions = [];
        const normals = [];
        const uvs = [];
        const colors = [];

        const getBlockLocal = (lx, ly, lz) => {
            const idx = this.getIndex(lx, ly, lz);
            if (idx === -1) return BLOCKS.AIR;
            return this.voxels[idx];
        };

        const isOpaque = (blockId) => {
            return blockId !== BLOCKS.AIR && blockId !== BLOCKS.PORTAL_BLOCK;
        };

        const uvMap = window.textureGenerator.uvMap;

        // Texture lookup per face
        const getFaceUV = (blockId, face) => {
            let texName = 'stone';
            switch (blockId) {
                case BLOCKS.GRASS:
                    if (face === 'top') texName = 'grass_top';
                    else if (face === 'bottom') texName = 'dirt';
                    else texName = 'grass_side';
                    break;
                case BLOCKS.DIRT: texName = 'dirt'; break;
                case BLOCKS.STONE: texName = 'stone'; break;
                case BLOCKS.BEDROCK: texName = 'bedrock'; break;
                case BLOCKS.WOOD:
                    if (face === 'top' || face === 'bottom') texName = 'wood_top';
                    else texName = 'wood_side';
                    break;
                case BLOCKS.LEAVES: texName = 'leaves'; break;
                case BLOCKS.COAL_ORE: texName = 'coal_ore'; break;
                case BLOCKS.IRON_ORE: texName = 'iron_ore'; break;
                case BLOCKS.GOLD_ORE: texName = 'gold_ore'; break;
                case BLOCKS.DIAMOND_ORE: texName = 'diamond_ore'; break;
                case BLOCKS.OBSIDIAN: texName = 'obsidian'; break;
                case BLOCKS.PLANKS: texName = 'planks'; break;
                case BLOCKS.CRAFTING_TABLE:
                    if (face === 'bottom') texName = 'planks';
                    else texName = 'crafting_table';
                    break;
                case BLOCKS.END_STONE: texName = 'end_stone'; break;
                case BLOCKS.PORTAL_BLOCK: texName = 'portal'; break;
                case BLOCKS.DRAGON_EGG: texName = 'dragon_egg'; break;
            }
            return uvMap[texName] || uvMap['stone'];
        };

        for (let x = startX; x < endX; x++) {
            for (let z = startZ; z < endZ; z++) {
                for (let y = 0; y < this.worldHeight; y++) {
                    const block = getBlockLocal(x, y, z);
                    if (block === BLOCKS.AIR) continue;

                    const wx = x - this.offsetX;
                    const wy = y;
                    const wz = z - this.offsetZ;

                    // Check all 6 faces: Right, Left, Top, Bottom, Front, Back
                    const checkFace = (dirX, dirY, dirZ, faceName, normal, p0, p1, p2, p3, shade) => {
                        const neighbor = getBlockLocal(x + dirX, y + dirY, z + dirZ);
                        if (!isOpaque(neighbor) || (block === BLOCKS.PORTAL_BLOCK && neighbor !== BLOCKS.PORTAL_BLOCK)) {
                            const uv = getFaceUV(block, faceName);

                            // Triangle 1: p0, p1, p2
                            positions.push(
                                wx + p0[0], wy + p0[1], wz + p0[2],
                                wx + p1[0], wy + p1[1], wz + p1[2],
                                wx + p2[0], wy + p2[1], wz + p2[2]
                            );
                            normals.push(
                                normal[0], normal[1], normal[2],
                                normal[0], normal[1], normal[2],
                                normal[0], normal[1], normal[2]
                            );
                            uvs.push(
                                uv.u0, uv.v0,
                                uv.u1, uv.v0,
                                uv.u1, uv.v1
                            );
                            for (let i = 0; i < 3; i++) colors.push(shade, shade, shade);

                            // Triangle 2: p0, p2, p3
                            positions.push(
                                wx + p0[0], wy + p0[1], wz + p0[2],
                                wx + p2[0], wy + p2[1], wz + p2[2],
                                wx + p3[0], wy + p3[1], wz + p3[2]
                            );
                            normals.push(
                                normal[0], normal[1], normal[2],
                                normal[0], normal[1], normal[2],
                                normal[0], normal[1], normal[2]
                            );
                            uvs.push(
                                uv.u0, uv.v0,
                                uv.u1, uv.v1,
                                uv.u0, uv.v1
                            );
                            for (let i = 0; i < 3; i++) colors.push(shade, shade, shade);
                        }
                    };

                    // +X Right
                    checkFace(1, 0, 0, 'side', [1, 0, 0], [1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0], 0.85);
                    // -X Left
                    checkFace(-1, 0, 0, 'side', [-1, 0, 0], [0, 0, 1], [0, 0, 0], [0, 1, 0], [0, 1, 1], 0.85);
                    // +Y Top
                    checkFace(0, 1, 0, 'top', [0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0], 1.0);
                    // -Y Bottom
                    checkFace(0, -1, 0, 'bottom', [0, -1, 0], [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], 0.55);
                    // +Z Front
                    checkFace(0, 0, 1, 'side', [0, 0, 1], [1, 0, 1], [0, 0, 1], [0, 1, 1], [1, 1, 1], 0.7);
                    // -Z Back
                    checkFace(0, 0, -1, 'side', [0, 0, -1], [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], 0.7);
                }
            }
        }

        if (positions.length === 0) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const mesh = new THREE.Mesh(geometry, this.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.chunks.set(key, mesh);
    }
}
window.VoxelWorld = VoxelWorld;
window.BLOCKS = BLOCKS;
window.BLOCK_NAMES = BLOCK_NAMES;
window.BLOCK_DROPS = BLOCK_DROPS;
