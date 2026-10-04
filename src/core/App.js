// Main Application Class

import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Renderer } from './Renderer.js';
import { CameraController } from './Camera.js';
import { SceneManager } from './Scene.js';
import { Clock } from './Clock.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { LineNetwork } from '../systems/LineNetwork.js';
import { ScrollController } from '../systems/ScrollController.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { QualityManager } from '../systems/QualityManager.js';
import { AudioEngine } from '../systems/AudioEngine.js';
import { HeroSection } from '../sections/HeroSection.js';
import { ServicesSection } from '../sections/ServicesSection.js';
import { WorkSection } from '../sections/WorkSection.js';
import { ContactSection } from '../sections/ContactSection.js';
import { Easing } from '../utils/easing.js';

gsap.registerPlugin(ScrollTrigger);

export class App {
    constructor(options = {}) {
        this.options = {
            canvas: options.canvas || document.getElementById('gl'),
            whatsappNumber: options.whatsappNumber || '234XXXXXXXXXX',
            ...options
        };

        // Core systems
        this.clock = new Clock();
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        this.quality = null;
        this.interaction = null;
        this.scroll = null;
        this.audio = null;

        // 3D Systems
        this.particleSystem = null;
        this.lineNetwork = null;

        // Sections
        this.hero = null;
        this.services = null;
        this.work = null;
        this.contact = null;

        // State
        this.currentSection = 0;
        this.sectionProgress = 0;
        this.totalProgress = 0;
        this.isLoading = true;
        this.loadProgress = 0;
        this.initialized = false;
        this.running = false;

        // DOM elements
        this.loadingElement = document.body;
        this.progressElement = document.getElementById('pct');
        this.headerElement = document.querySelector('header');

        // Section elements for scroll
        this.sectionElements = document.querySelectorAll('[data-s]');

        // Raycaster for hover
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    async init() {
        console.log('[App] Initializing SolveX Portfolio...');

        // Initialize core
        this.renderer = new Renderer({ canvas: this.options.canvas });
        this.renderer.init();

        this.camera = new CameraController();
        this.camera.init();

        this.scene = new SceneManager();
        this.scene.init();

        this.quality = new QualityManager({
            onTierChange: (tier, settings) => this.onQualityChange(tier, settings),
            onSettingsChange: (settings) => this.applyQualitySettings(settings)
        });
        this.quality.init();

        this.interaction = new InteractionManager();
        this.interaction.init();

        this.audio = new AudioEngine({ masterVolume: 0.2 });
        await this.audio.init();

        // Set up camera with renderer
        this.renderer.setScene(this.scene.scene);
        this.renderer.setCamera(this.camera.getCamera());

        // Initialize 3D systems
        await this.init3DSystems();

        // Initialize sections
        await this.initSections();

        // Set up scroll controller
        this.scroll = new ScrollController({
            sections: Array.from(this.sectionElements).map((el, i) => ({ element: el, index: i })),
            onSectionChange: (index, progress, direction) => this.onSectionChange(index, progress, direction),
            onProgress: (progress, direction) => this.onScrollProgress(progress, direction)
        });
        this.scroll.init(gsap);

        // Set up interaction callbacks
        this.setupInteraction();

        // Set up WhatsApp links
        this.setupWhatsApp();

        // Resize is handled via InteractionManager (debounced)
        // Start loading sequence
        this.startLoading();

        this.initialized = true;
        console.log('[App] Initialized successfully');

        return this;
    }

    async init3DSystems() {
        // Particle System
        this.particleSystem = new ParticleSystem({
            count: this.quality.getSettings().particleCount,
            simulationShader: '/src/shaders/particle/simulation.frag.glsl',
            renderVertexShader: '/src/shaders/particle/render.vert.glsl',
            renderFragmentShader: '/src/shaders/particle/render.frag.glsl'
        });
        await this.particleSystem.init(this.renderer.threeRenderer);
        this.scene.add(this.particleSystem.getMesh(), 'particles');

        // Line Network
        this.lineNetwork = new LineNetwork({
            nodeCount: 84,
            connectionDistance: 1.4,
            lineVertexShader: '/src/shaders/line/line.vert.glsl',
            lineFragmentShader: '/src/shaders/line/line.frag.glsl'
        });
        await this.lineNetwork.init(this.renderer.threeRenderer);
        this.scene.add(this.lineNetwork.getGroup(), 'lineNetwork');

        // Add camera section states
        this.setupCameraStates();
    }

    setupCameraStates() {
        // Hero - center, pulled back
        this.camera.addSectionState({
            position: new THREE.Vector3(0, 0, 7.5),
            target: new THREE.Vector3(0, 0, 0),
            fov: 45,
            rotation: new THREE.Euler(0, 0, 0)
        });

        // Services - shifted left, closer
        this.camera.addSectionState({
            position: new THREE.Vector3(-2.3, 0, 6),
            target: new THREE.Vector3(-1, 0, 0),
            fov: 40,
            rotation: new THREE.Euler(0, 0.1, 0)
        });

        // Work - shifted right
        this.camera.addSectionState({
            position: new THREE.Vector3(2.3, 0, 6),
            target: new THREE.Vector3(0, 0, -2),
            fov: 40,
            rotation: new THREE.Euler(0, -0.1, 0)
        });

        // Contact - center, closer
        this.camera.addSectionState({
            position: new THREE.Vector3(0, 0, 5.5),
            target: new THREE.Vector3(0, 0, -2),
            fov: 50,
            rotation: new THREE.Euler(0, 0, 0)
        });
    }

    async initSections() {
        this.hero = new HeroSection({ particleCount: this.quality.getSettings().particleCount });
        await this.hero.init(this.renderer.threeRenderer, this.scene.scene, this.camera.getCamera(), this.particleSystem);

        this.services = new ServicesSection();
        await this.services.init(this.renderer.threeRenderer, this.scene.scene, this.camera.getCamera());

        this.work = new WorkSection();
        await this.work.init(this.renderer.threeRenderer, this.scene.scene, this.camera.getCamera());

        this.contact = new ContactSection();
        await this.contact.init(this.renderer.threeRenderer, this.scene.scene, this.camera.getCamera());

        // Initially only hero is visible
        this.services.setEnabled(false);
        this.work.setEnabled(false);
        this.contact.setEnabled(false);
    }

    setupInteraction() {
        // Mouse move for parallax
        this.interaction.on('mouseMove', (mouse) => {
            this.camera.setMouseOffset(mouse.normalized.x * 0.5, mouse.normalized.y * 0.3);

            // Update work section hover
            this.updateWorkHover(mouse.normalized);
        });

        // Mouse down/up for click feedback
        this.interaction.on('click', (mouse) => {
            this.audio.click({ volume: 0.15 });
        });

        // Resize
        this.interaction.on('resize', (viewport) => {
            this.onResize(viewport.width, viewport.height);
        });

        // Keyboard (for debugging)
        this.interaction.on('keyDown', (e) => {
            if (e.code === 'KeyQ') {
                const tiers = ['ultra', 'high', 'medium', 'low'];
                const current = tiers.indexOf(this.quality.getTier());
                const next = (current + 1) % tiers.length;
                this.quality.setTier(tiers[next]);
            }
        });
    }

    updateWorkHover(normalizedMouse) {
        if (!this.work || !this.work.initialized) return;

        // Raycast to work section cards
        this.mouse.copy(normalizedMouse);
        this.raycaster.setFromCamera(this.mouse, this.camera.getCamera());
        this.work.checkHover(this.raycaster);
    }

    setupWhatsApp() {
        const waNumber = this.options.whatsappNumber;
        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('Hi SolveX, I\'d like to talk about my business.')}`;

        document.querySelectorAll('[data-wa]').forEach(el => {
            el.href = waUrl;
            el.target = '_blank';
            el.rel = 'noopener';
        });
    }

    onResize(width, height) {
        this.renderer.resize(width, height);
        this.camera.resize(width / height);
    }

    onQualityChange(tier, settings) {
        console.log(`[App] Quality changed to ${tier}`);
        this.applyQualitySettings(settings);
    }

    applyQualitySettings(settings) {
        // Update particle count
        if (this.particleSystem) {
            // Would need to recreate for count change, for now just adjust quality
        }

        // Update renderer settings
        this.renderer.setQualityTier(this.quality.getTier());
    }

    startLoading() {
        this.isLoading = true;
        this.loadProgress = 0;

        // Animate loading progress
        gsap.to(this, {
            loadProgress: 1,
            duration: 3,
            ease: Easing.cubicInOut,
            onUpdate: () => {
                if (this.progressElement) {
                    this.progressElement.textContent = Math.round(this.loadProgress * 100) + '%';
                }
            },
            onComplete: () => {
                this.onLoadComplete();
            }
        });

        // Start hero loading sequence
        this.hero.startLoading();

        // Failsafe
        setTimeout(() => this.forceLoadComplete(), 10000);
    }

    forceLoadComplete() {
        if (this.isLoading) {
            console.warn('[App] Load failsafe triggered');
            this.loadProgress = 1;
            this.onLoadComplete();
        }
    }

    onLoadComplete() {
        this.isLoading = false;
        this.loadingElement.classList.remove('loading');

        if (this.progressElement) {
            this.progressElement.remove();
        }

        // Start render loop
        this.running = true;
        this.animate();
    }

    onSectionChange(index, progress, direction) {
        this.currentSection = index;
        this.sectionProgress = progress;

        // Update camera
        this.camera.setSectionProgress(index, progress);

        // Section-specific enter/leave
        const sections = [this.hero, this.services, this.work, this.contact];

        sections.forEach((section, i) => {
            if (i === index) {
                section?.onEnter?.(progress);
                section?.setEnabled?.(true);
            } else if (section) {
                section.onLeave?.(progress, direction);
                // Keep enabled for smooth transitions, but could disable after
            }
        });

        // Audio feedback
        if (progress < 0.1) {
            this.audio.sectionChange({ volume: 0.1 });
        }
    }

    onScrollProgress(progress, direction) {
        this.totalProgress = progress;

        // Modulate ambient audio with scroll speed
        if (this.audio && this.scroll) {
            const speed = Math.abs(this.scroll.getScrollDirection() ? 1 : 0);
            this.audio.modulateAmbient(speed);
        }
    }

    animate() {
        if (!this.running) return;

        const { deltaTime, time } = this.clock.tick();

        // Update quality manager
        this.quality.update(this.clock.getFPS(), deltaTime);

        // Update camera
        this.camera.update(deltaTime);

        // Update 3D systems
        if (this.particleSystem) {
            this.particleSystem.update(deltaTime, time);
        }

        if (this.lineNetwork) {
            this.lineNetwork.update(deltaTime, time);
        }

        // Update sections (animations, uniforms only - no direct rendering)
        if (this.hero) this.hero.update(deltaTime, time);
        if (this.services) this.services.update(deltaTime, time);
        if (this.work) this.work.update(deltaTime, time);
        if (this.contact) this.contact.update(deltaTime, time);

        // Single render pass via EffectComposer (handles post-processing, respects visibility)
        this.renderer.render();

        requestAnimationFrame(() => this.animate());
    }

    // Public API
    getCamera() {
        return this.camera.getCamera();
    }

    getScene() {
        return this.scene.scene;
    }

    getRenderer() {
        return this.renderer.threeRenderer;
    }

    setQuality(tier) {
        this.quality.setTier(tier);
    }

    dispose() {
        this.running = false;

        this.hero?.dispose();
        this.services?.dispose();
        this.work?.dispose();
        this.contact?.dispose();

        this.particleSystem?.dispose();
        this.lineNetwork?.dispose();

        this.renderer?.dispose();
        this.audio?.dispose();
        this.scroll?.kill();

        this.initialized = false;
    }
}

// Auto-initialize on DOM ready
if (typeof window !== 'undefined') {
    window.SolveXApp = App;
}