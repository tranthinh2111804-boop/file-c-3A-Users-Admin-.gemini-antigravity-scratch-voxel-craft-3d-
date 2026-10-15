# 3D Minecraft: The Ancient Portal & Ender Dragon

A full 3D first-person voxel game built with Three.js, procedural audio (Web Audio API), procedural 16x16 pixel textures, 3D cave generation, depth-scaled ores, day/night cycles, mob AI, crafting, and an Ender Dragon boss fight.

## How to Play

### 1. Solo Play (Offline / Local)
- Double-click or open [index.html](file:///C:/Users/Admin/.gemini/antigravity/scratch/minecraft-3d/index.html) in any modern browser.

### 2. Online Multiplayer (Play with friends!)
Run the multiplayer server in PowerShell:
```powershell
python server.py
```
- **Play on your PC**: Open `http://localhost:8080`
- **Play with friends on the same Wi-Fi / LAN**: Share your local IP (e.g. `http://192.168.100.64:8080`)
- **Play with friends over the Internet**:
  - Run `ngrok http 8080` or `cloudflared tunnel --url http://localhost:8080` to get a public link to share with anyone in the world!
- **Features in Multiplayer**:
  - Real-time 3D player models with walking animations and floating name tags.
  - Synchronized block mining and block placement.
  - In-game chat (<kbd>T</kbd> or <kbd>Enter</kbd> to type and send messages).
  - Co-op Ender Dragon boss fight!

---

## Controls
- **W, A, S, D**: Movement (forward, left, backward, right).
- **Mouse**: 1st Person look (Click on screen to lock pointer, ESC to release).
- **Space**: Jump.
- **Space while in mid-air**: ⚡ **DOUBLE JUMP!** (Provides high-flying vertical boost with air particles and sound).
- **Left Click**: Mine block or attack mobs/dragon with held weapon.
- **Right Click**: Place selected block from hotbar / eat food / shoot bow.
- **1 – 9 / Mouse Wheel**: Select active hotbar slot.
- **E**: Open / close **Crafting Menu**.
- **F**: Unlock Spawn Portal when holding the Ancient Key.

---

## Game Features & Mechanics

### 1. Day / Night Cycle (5 min Day, 4 min Night)
- **Daytime (5 minutes)**: Bright sun and sky. Peaceful animals (**Pigs**, **Cows**) spawn on surface grass.
- **Nighttime (4 minutes)**: Dark midnight sky with stars and moon. Dangerous monsters (**Zombies**, **Skeletons**, **Creepers**) spawn and hunt you!
- **Clock Display**: Top-left HUD shows live countdown for the active phase (`☀️ Day: MM:SS` or `🌙 Night: MM:SS`).

### 2. Difficulty Modes (Easy & Hard)
- Toggle button located on the top-right HUD:
  - **Easy**: Lower monster damage, spawn interval of 12 seconds, max 6 monsters.
  - **Hard**: Faster and much more aggressive monsters, 2.5x damage, spawn interval of **3.5 seconds** (frequent hordes!), max 18 monsters.

### 3. Caves & Depth-Scaled Rare Ores
- Underground caves are carved dynamically using 3D Simplex noise.
- **Ore Distribution**:
  - **Coal Ore**: Most frequent ore; found throughout all underground depths (y: 1 to 38).
  - **Iron Ore**: Second most frequent; found from medium to deep levels (y: 1 to 32).
  - **Gold Ore**: Rare ore; found only in deep caves (y: 1 to 18), frequency scales with depth.
  - **Diamond Ore**: Rarest ore; found only in the deepest layers (y: 1 to 10) near bedrock, frequency scales steeply with depth!

### 4. Tools, Weapons & The Ancient Key
Press **E** to open the Crafting Menu:
- **Wood Planks**: 1 Wood &rarr; 4 Planks
- **Sticks**: 2 Planks &rarr; 4 Sticks
- **Swords**: Wooden (+5 dmg), Stone (+7 dmg), Iron (+10 dmg), Diamond (+16 dmg)
- **Pickaxes**: Wooden, Stone, Iron, Diamond
- **Bow & Arrows**: 3 Sticks + 1 Iron &rarr; Bow; 1 Stick + 1 Iron &rarr; 4 Arrows
- 🔑 **Ancient Portal Key**: **1 Diamond + 2 Gold** (Required to unlock the spawn portal).

### 5. Spawn Point Portal & The End Dimension
- An **Obsidian Portal Frame** is located at the spawn point `(0, 0)`.
- It is initially sealed by an ancient runic lock.
- Craft the **Ancient Key** (1 Diamond + 2 Gold) and press **F** or click the portal to unlock it.
- Stepping into the swirling purple vortex transports you into **The End**.

### 6. Ender Dragon Boss Fight
- In **The End**, navigate the floating End Stone island with towering obsidian pillars and End Crystals.
- **Ender Dragon Boss**:
  - Full 3D animated model with flapping wings, horns, glowing eyes, and segmented tail.
  - Boss health bar displayed at the top of the screen.
  - Circling flight path, swoop dive attacks, and purple explosive fireballs.
  - Attack it with your Bow & Arrows from a distance or strike it with your Sword when it swoops near!
- **Defeat & Reward**:
  - The dragon explodes in radiant light beams and thunder.
  - Spawns the central **Exit Portal** with the legendary **Dragon Egg** on the central pillar!
  - Collect the Dragon Egg into your inventory as the ultimate trophy.
  - Jump into the Exit Portal to return to the Overworld with a Victory screen!
