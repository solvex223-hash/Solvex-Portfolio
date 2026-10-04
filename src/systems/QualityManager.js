// Adaptive Quality Manager

export class QualityManager {
    constructor(options = {}) {
        this.tiers = {
            ultra: {
                name: 'Ultra',
                pixelRatio: 2.0,
                particleCount: 50000,
                bloomEnabled: true,
                bloomStrength: 0.5,
                grainEnabled: true,
                grainIntensity: 0.02,
                vignetteEnabled: true,
                shadowEnabled: true,
                antialias: true,
                minFPS: 55
            },
            high: {
                name: 'High',
                pixelRatio: 1.5,
                particleCount: 30000,
                bloomEnabled: true,
                bloomStrength: 0.4,
                grainEnabled: true,
                grainIntensity: 0.015,
                vignetteEnabled: true,
                shadowEnabled: true,
                antialias: true,
                minFPS: 50
            },
            medium: {
                name: 'Medium',
                pixelRatio: 1.5,
                particleCount: 15000,
                bloomEnabled: true,
                bloomStrength: 0.25,
                grainEnabled: false,
                grainIntensity: 0,
                vignetteEnabled: true,
                shadowEnabled: false,
                antialias: true,
                minFPS: 45
            },
            low: {
                name: 'Low',
                pixelRatio: 1.0,
                particleCount: 5000,
                bloomEnabled: false,
                bloomStrength: 0,
                grainEnabled: false,
                grainIntensity: 0,
                vignetteEnabled: false,
                shadowEnabled: false,
                antialias: false,
                minFPS: 30
            }
        };

        this.currentTier = 'high';
        this.fpsHistory = [];
        this.historySize = 120; // 2 seconds at 60fps
        this.checkInterval = 2000; // Check every 2 seconds
        this.lastCheck = 0;
        this.autoAdjust = true;
        this.manualOverride = false;

        // Callbacks
        this.onTierChange = options.onTierChange || (() => {});
        this.onSettingsChange = options.onSettingsChange || (() => {});
    }

    // Detect initial quality tier based on hardware
    detectTier() {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            return 'low';
        }

        // Check device memory (if available)
        const memory = navigator.deviceMemory || 4; // GB
        const cores = navigator.hardwareConcurrency || 4;
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        const dpr = window.devicePixelRatio || 1;

        // Heuristic scoring
        let score = 0;
        score += Math.min(memory / 2, 4); // 0-4 for memory
        score += Math.min(cores / 2, 4);  // 0-4 for cores
        if (!isMobile) score += 2;
        if (dpr <= 1.5) score += 1;

        // GPU benchmark would be better but this is a start
        if (score >= 9) return 'ultra';
        if (score >= 6) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    }

    // Get URL parameter override
    getURLOverride() {
        const params = new URLSearchParams(window.location.search);
        const quality = params.get('quality');
        if (quality && this.tiers[quality]) {
            this.manualOverride = true;
            return quality;
        }
        return null;
    }

    init() {
        const override = this.getURLOverride();
        const detected = this.detectTier();
        this.currentTier = override || detected;

        console.log(`[QualityManager] Initial tier: ${this.currentTier} (${override ? 'manual' : 'auto'})`);
        return this.getSettings();
    }

    getSettings() {
        return { ...this.tiers[this.currentTier] };
    }

    getTier() {
        return this.currentTier;
    }

    setTier(tier) {
        if (!this.tiers[tier]) {
            console.warn(`[QualityManager] Unknown tier: ${tier}`);
            return false;
        }

        if (this.manualOverride && tier !== this.currentTier) {
            console.log('[QualityManager] Manual override active, ignoring auto-adjust');
            return false;
        }

        const oldTier = this.currentTier;
        this.currentTier = tier;

        if (oldTier !== tier) {
            console.log(`[QualityManager] Tier changed: ${oldTier} -> ${tier}`);
            this.onTierChange(tier, this.getSettings());
        }

        return true;
    }

    // Call this every frame with current FPS
    update(fps, deltaTime) {
        if (!this.autoAdjust || this.manualOverride) return;

        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > this.historySize) {
            this.fpsHistory.shift();
        }

        const now = performance.now();
        if (now - this.lastCheck < this.checkInterval) return;
        this.lastCheck = now;

        // Need enough samples
        if (this.fpsHistory.length < 30) return;

        // Calculate average FPS
        const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        const currentSettings = this.tiers[this.currentTier];

        // Check if we should downgrade
        if (avgFPS < currentSettings.minFPS) {
            const tiers = ['ultra', 'high', 'medium', 'low'];
            const currentIndex = tiers.indexOf(this.currentTier);
            if (currentIndex < tiers.length - 1) {
                this.setTier(tiers[currentIndex + 1]);
                this.onSettingsChange(this.getSettings());
            }
        }
        // Check if we can upgrade (sustained high FPS)
        else if (avgFPS > currentSettings.minFPS + 10) {
            const tiers = ['ultra', 'high', 'medium', 'low'];
            const currentIndex = tiers.indexOf(this.currentTier);
            if (currentIndex > 0) {
                // Be conservative - only upgrade after sustained performance
                const recentFPS = this.fpsHistory.slice(-30);
                const recentAvg = recentFPS.reduce((a, b) => a + b, 0) / recentFPS.length;
                if (recentAvg > this.tiers[tiers[currentIndex - 1]].minFPS + 5) {
                    this.setTier(tiers[currentIndex - 1]);
                    this.onSettingsChange(this.getSettings());
                }
            }
        }
    }

    // Force specific setting (for user preferences)
    setSetting(key, value) {
        if (this.tiers[this.currentTier].hasOwnProperty(key)) {
            this.tiers[this.currentTier][key] = value;
            this.onSettingsChange(this.getSettings());
        }
    }

    // Get all available tiers
    getTiers() {
        return Object.entries(this.tiers).map(([key, value]) => ({ key, ...value }));
    }

    enableAutoAdjust(enabled) {
        this.autoAdjust = enabled;
    }
}