// WebGL Renderer with Post-Processing Pipeline

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

export class Renderer {
    constructor(options = {}) {
        this.options = {
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
            logarithmicDepthBuffer: true,
            ...options
        };

        this.threeRenderer = null;
        this.composer = null;
        this.renderPass = null;
        this.bloomPass = null;
        this.fxaaPass = null;
        this.customPasses = [];

        this.width = 0;
        this.height = 0;
        this.pixelRatio = 1;
        this.qualityTier = 'high';

        this.bloomEnabled = true;
        this.bloomStrength = 0.4;
        this.bloomRadius = 0.6;
        this.bloomThreshold = 0.85;

        this.toneMappingEnabled = true;
        this.exposure = 1.0;
        this.contrast = 1.1;
        this.saturation = 1.05;
        this.temperature = 0.0;
        this.tint = 0.0;

        this.grainEnabled = true;
        this.grainIntensity = 0.015;
        this.grainSize = 1.0;

        this.vignetteEnabled = true;
        this.vignetteStrength = 0.25;
    }

    init() {
        this.threeRenderer = new THREE.WebGLRenderer({
            canvas: this.options.canvas,
            antialias: this.options.antialias,
            alpha: this.options.alpha,
            preserveDrawingBuffer: this.options.preserveDrawingBuffer,
            powerPreference: this.options.powerPreference,
            stencil: this.options.stencil,
            depth: this.options.depth,
            logarithmicDepthBuffer: this.options.logarithmicDepthBuffer
        });

        this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.threeRenderer.setSize(window.innerWidth, window.innerHeight);

        // Tone mapping
        this.threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.threeRenderer.toneMappingExposure = this.exposure;
        this.threeRenderer.outputColorSpace = THREE.SRGBColorSpace;

        // Physically correct lights
        this.threeRenderer.physicallyCorrectLights = true;

        // Shadow settings (if used)
        this.threeRenderer.shadowMap.enabled = false;
        this.threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.pixelRatio = this.threeRenderer.getPixelRatio();

        this.setupPostProcessing();

        return this.threeRenderer;
    }

    setupPostProcessing() {
        const renderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType,
            colorSpace: THREE.LinearSRGBColorSpace
        });

        this.composer = new EffectComposer(this.threeRenderer, renderTarget);

        // Render pass
        this.renderPass = new RenderPass(null, null);
        this.composer.addPass(this.renderPass);

        // Bloom pass (using Three's UnrealBloomPass for reliability)
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.width, this.height),
            this.bloomStrength,
            this.bloomRadius,
            this.bloomThreshold
        );
        this.bloomPass.threshold = this.bloomThreshold;
        this.bloomPass.strength = this.bloomStrength;
        this.bloomPass.radius = this.bloomRadius;
        this.composer.addPass(this.bloomPass);

        // FXAA pass
        this.fxaaPass = new ShaderPass(FXAAShader);
        this.fxaaPass.material.uniforms.resolution.value.set(1 / this.width, 1 / this.height);
        this.composer.addPass(this.fxaaPass);

        // Note: For custom shaders (film grain, color grading, vignette),
        // we'd add additional ShaderPasses here. For now, using Three's built-in
        // UnrealBloomPass + FXAA for maximum compatibility.
    }

    setScene(scene) {
        this.renderPass.scene = scene;
    }

    setCamera(camera) {
        this.renderPass.camera = camera;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.threeRenderer.setSize(width, height);
        this.composer.setSize(width, height);

        if (this.fxaaPass) {
            this.fxaaPass.material.uniforms.resolution.value.set(1 / width, 1 / height);
        }
    }

    setPixelRatio(ratio) {
        this.pixelRatio = Math.min(ratio, 2);
        this.threeRenderer.setPixelRatio(this.pixelRatio);
        this.composer.setPixelRatio(this.pixelRatio);
    }

    render() {
        if (this.composer) {
            this.composer.render();
        } else {
            this.threeRenderer.render(this.renderPass.scene, this.renderPass.camera);
        }
    }

    // Quality tier management
    setQualityTier(tier) {
        this.qualityTier = tier;

        const tiers = {
            ultra: { dpr: 2, bloom: true, grain: true, vignette: true, bloomStrength: 0.5 },
            high: { dpr: 1.5, bloom: true, grain: true, vignette: true, bloomStrength: 0.4 },
            medium: { dpr: 1.5, bloom: true, grain: false, vignette: true, bloomStrength: 0.25 },
            low: { dpr: 1, bloom: false, grain: false, vignette: false, bloomStrength: 0 }
        };

        const config = tiers[tier] || tiers.high;
        this.setPixelRatio(config.dpr);
        this.setBloomEnabled(config.bloom);
        this.setGrainEnabled(config.grain);
        this.setVignetteEnabled(config.vignette);
        this.setBloomStrength(config.bloomStrength);
    }

    setBloomEnabled(enabled) {
        this.bloomEnabled = enabled;
        if (this.bloomPass) {
            this.bloomPass.enabled = enabled;
        }
    }

    setBloomStrength(strength) {
        this.bloomStrength = strength;
        if (this.bloomPass) {
            this.bloomPass.strength = strength;
        }
    }

    setBloomThreshold(threshold) {
        this.bloomThreshold = threshold;
        if (this.bloomPass) {
            this.bloomPass.threshold = threshold;
        }
    }

    setBloomRadius(radius) {
        this.bloomRadius = radius;
        if (this.bloomPass) {
            this.bloomPass.radius = radius;
        }
    }

    setGrainEnabled(enabled) {
        this.grainEnabled = enabled;
    }

    setGrainIntensity(intensity) {
        this.grainIntensity = intensity;
    }

    setVignetteEnabled(enabled) {
        this.vignetteEnabled = enabled;
    }

    setExposure(exposure) {
        this.exposure = exposure;
        this.threeRenderer.toneMappingExposure = exposure;
    }

    setContrast(contrast) {
        this.contrast = contrast;
    }

    setSaturation(saturation) {
        this.saturation = saturation;
    }

    dispose() {
        if (this.composer) {
            this.composer.passes.forEach(pass => {
                if (pass.dispose) pass.dispose();
            });
        }
        if (this.threeRenderer) {
            this.threeRenderer.dispose();
        }
    }
}