// Day / Night Cycle Engine: 5 Minutes Day, 4 Minutes Night
class DayNightCycle {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;

        // Prompt specification: daytime 5 minutes (300s), night time 4 minutes (240s)
        this.dayDuration = 300;   // 5 minutes
        this.nightDuration = 240; // 4 minutes
        this.totalDuration = this.dayDuration + this.nightDuration; // 540 seconds (9 mins)

        this.cycleTime = 60; // Start at 1 minute into the daytime

        // Celestial objects
        this.sunMoonDistance = 180;
        this.initLighting();
        this.initCelestials();
    }

    initLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(this.ambientLight);

        // Directional Sun / Moon light
        this.dirLight = new THREE.DirectionalLight(0xfffaed, 0.9);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.near = 10;
        this.dirLight.shadow.camera.far = 300;
        const d = 50;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.scene.add(this.dirLight);
    }

    initCelestials() {
        this.celestialGroup = new THREE.Group();
        this.scene.add(this.celestialGroup);

        // Sun: Glowing yellow-white voxel cube
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffea78 });
        this.sunMesh = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), sunMat);
        this.celestialGroup.add(this.sunMesh);

        // Moon: Silvery white voxel cube
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xecf0f1 });
        this.moonMesh = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), moonMat);
        this.celestialGroup.add(this.moonMesh);

        // Starfield
        const starCount = 300;
        const starPositions = [];
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = 220;
            starPositions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.5, transparent: true, opacity: 0 });
        this.starMesh = new THREE.Points(starGeo, this.starMat);
        this.scene.add(this.starMesh);
    }

    isDaytime() {
        return this.cycleTime < this.dayDuration;
    }

    getTimeRemainingFormatted() {
        if (this.isDaytime()) {
            const remaining = Math.max(0, Math.floor(this.dayDuration - this.cycleTime));
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            return `☀️ Day: ${m}:${s < 10 ? '0' : ''}${s}`;
        } else {
            const remaining = Math.max(0, Math.floor(this.totalDuration - this.cycleTime));
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            return `🌙 Night: ${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }

    update(dt, playerPosition) {
        this.cycleTime = (this.cycleTime + dt) % this.totalDuration;

        // Keep celestials and starfield centered on player position
        if (playerPosition) {
            this.celestialGroup.position.copy(playerPosition);
            this.starMesh.position.copy(playerPosition);
        }

        // Calculate celestial rotation angle
        let sunAngle;
        if (this.isDaytime()) {
            // Day runs from angle 0 (East horizon) to PI (West horizon)
            sunAngle = (this.cycleTime / this.dayDuration) * Math.PI;
        } else {
            // Night runs from angle PI to 2 * PI
            const nightTime = this.cycleTime - this.dayDuration;
            sunAngle = Math.PI + (nightTime / this.nightDuration) * Math.PI;
        }

        const sunX = Math.cos(sunAngle) * this.sunMoonDistance;
        const sunY = Math.sin(sunAngle) * this.sunMoonDistance;
        this.sunMesh.position.set(sunX, sunY, 0);

        // Moon is opposite to the sun
        this.moonMesh.position.set(-sunX, -sunY, 0);

        // Sun / Moon directional light follows the visible body
        if (sunY > 0) {
            this.dirLight.position.set(sunX, sunY, 0);
            this.dirLight.intensity = Math.max(0.2, (sunY / this.sunMoonDistance) * 1.0);
            this.dirLight.color.setHex(0xfffaed);
        } else {
            this.dirLight.position.set(-sunX, -sunY, 0);
            this.dirLight.intensity = Math.max(0.1, (-sunY / this.sunMoonDistance) * 0.35);
            this.dirLight.color.setHex(0x8899cc);
        }

        // Sky background and ambient lighting
        const dayColor = new THREE.Color(0x7ec0ee);    // Bright day blue
        const sunsetColor = new THREE.Color(0xf38548); // Sunset orange
        const nightColor = new THREE.Color(0x0a0e1a);  // Deep midnight blue

        let currentSkyColor = new THREE.Color();

        if (this.isDaytime()) {
            const dayProgress = this.cycleTime / this.dayDuration;
            if (dayProgress < 0.1) {
                // Sunrise transition (0 to 10% of day)
                const factor = dayProgress / 0.1;
                currentSkyColor.lerpColors(sunsetColor, dayColor, factor);
                this.ambientLight.intensity = 0.35 + factor * 0.45;
                this.starMat.opacity = Math.max(0, 1 - factor * 2);
            } else if (dayProgress > 0.88) {
                // Sunset transition (88% to 100% of day)
                const factor = (dayProgress - 0.88) / 0.12;
                currentSkyColor.lerpColors(dayColor, sunsetColor, factor);
                this.ambientLight.intensity = 0.8 - factor * 0.45;
                this.starMat.opacity = factor * 0.8;
            } else {
                // Full daylight
                currentSkyColor.copy(dayColor);
                this.ambientLight.intensity = 0.8;
                this.starMat.opacity = 0;
            }
        } else {
            // Nighttime
            const nightProgress = (this.cycleTime - this.dayDuration) / this.nightDuration;
            if (nightProgress < 0.12) {
                const factor = nightProgress / 0.12;
                currentSkyColor.lerpColors(sunsetColor, nightColor, factor);
                this.ambientLight.intensity = 0.35 - factor * 0.17;
            } else if (nightProgress > 0.88) {
                const factor = (nightProgress - 0.88) / 0.12;
                currentSkyColor.lerpColors(nightColor, sunsetColor, factor);
                this.ambientLight.intensity = 0.18 + factor * 0.17;
            } else {
                currentSkyColor.copy(nightColor);
                this.ambientLight.intensity = 0.18;
            }
            this.starMat.opacity = 0.9;
        }

        this.scene.background = currentSkyColor;
        this.scene.fog = new THREE.FogExp2(currentSkyColor.getHex(), 0.015);
    }
}
window.DayNightCycle = DayNightCycle;
