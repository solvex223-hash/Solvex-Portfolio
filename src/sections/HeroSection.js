// Hero Section 3D System

import * as THREE from 'three';
import { gsap } from 'gsap';
import { Shaders } from '../utils/shaderLoader.js';
import { Easing } from '../utils/easing.js';

export class HeroSection {
    constructor(options = {}) {
        this.options = {
            particleCount: 30000,
            ...options
        };

        this.particleSystem = null;
        this.logoParticles = null;
        this.logoGeometry = null;
        this.logoMaterial = null;
        this.logoMesh = null;

        this.state = 'loading'; // loading, forming, formed, dispersing, idle
        this.formProgress = 0;
        this.disperseProgress = 0;

        this.titleElement = null;
        this.leadElement = null;
        this.buttonsElement = null;

        this.initialized = false;
    }

    async init(renderer, scene, camera, particleSystem) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.particleSystem = particleSystem;

        // Cache DOM elements
        this.titleElement = document.getElementById('h1');
        this.leadElement = document.querySelector('.lead.hin');
        this.buttonsElement = document.querySelector('.hin:last-child');

        // Create logo particle formation
        await this.createLogoParticles();

        // Initial state - hide content
        this.hideContent();

        this.initialized = true;
        return this;
    }

    async createLogoParticles() {
        // Sample "SolveX" text to get particle positions
        const positions = await this.sampleText('SolveX', '700 250px "Bricolage Grotesque", system-ui, sans-serif');

        // Create geometry for logo particles
        const count = positions.length;
        const geometry = new THREE.BufferGeometry();

        const posAttr = new Float32Array(count * 3);
        const targetAttr = new Float32Array(count * 3);
        const delayAttr = new Float32Array(count);
        const colorAttr = new Float32Array(count * 3);
        const aUvAttr = new Float32Array(count * 2);
        const aParticleIdAttr = new Float32Array(count);

        const accentColor = new THREE.Color(0xF2561D);
        const lineColor = new THREE.Color(0x13203C);

        for (let i = 0; i < count; i++) {
            const p = positions[i];
            // Random start position (sphere)
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 5 + Math.random() * 6;

            posAttr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            posAttr[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            posAttr[i * 3 + 2] = radius * Math.cos(phi);

            targetAttr[i * 3] = p[0];
            targetAttr[i * 3 + 1] = p[1];
            targetAttr[i * 3 + 2] = p[2];

            delayAttr[i] = Math.random();

            // UV for texture lookup
            const uvX = (i % 256) / 256;
            const uvY = Math.floor(i / 256) / 256;
            aUvAttr[i * 2] = uvX + 0.5 / 256;
            aUvAttr[i * 2 + 1] = uvY + 0.5 / 256;
            aParticleIdAttr[i] = i;

            // Alternate colors
            const color = (i % 6 === 0) ? accentColor : lineColor;
            colorAttr[i * 3] = color.r;
            colorAttr[i * 3 + 1] = color.g;
            colorAttr[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(posAttr, 3));
        geometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetAttr, 3));
        geometry.setAttribute('delay', new THREE.BufferAttribute(delayAttr, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
        geometry.setAttribute('aUv', new THREE.BufferAttribute(aUvAttr, 2));
        geometry.setAttribute('aParticleId', new THREE.BufferAttribute(aParticleIdAttr, 1));

        // Shader material for logo formation - custom vertex shader for formation/dispersal
        const fragShader = Shaders.particle.renderFrag;

        const vertShader = `
precision highp float;

uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uProgress;
uniform float uDisperseProgress;

attribute vec2 aUv;
attribute float aParticleId;
attribute vec3 targetPosition;
attribute float delay;

varying vec2 vUv;
varying float vLife;
varying float vSpeed;
varying vec3 vColor;
varying float vSize;

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

void main() {
    vUv = aUv;

    vec4 posData = texture2D(uPositions, aUv);
    vec4 velData = texture2D(uVelocities, aUv);

    vec3 position = posData.xyz;
    vec3 velocity = velData.xyz;
    float life = posData.w;
    float age = velData.w;

    vLife = life;
    vSpeed = length(velocity) / 8.0;

    vec3 colorSlow = vec3(0.9, 0.35, 0.12);
    vec3 colorFast = vec3(1.0, 0.6, 0.25);
    vec3 colorLine = vec3(0.07, 0.12, 0.23);

    float idHash = hash(aParticleId * 17.0);
    vec3 baseColor = mix(colorLine, colorSlow, idHash * 0.5 + 0.5);
    vColor = mix(baseColor, colorFast, vSpeed * 0.5);

    float formProgress = smoothstep(delay * 0.5, 0.5 + delay * 0.5, uProgress);
    position = mix(position, targetPosition, formProgress);

    float disperseProgress = smoothstep(delay * 0.5, 0.5 + delay * 0.5, uDisperseProgress);
    vec3 disperseDir = normalize(position);
    position += disperseDir * disperseProgress * 15.0;

    float dist = length(position - cameraPosition);
    float sizeAtten = 1.0 / max(dist * 0.3, 1.0);
    float lifeSize = smoothstep(0.0, 0.2, life) * smoothstep(1.0, 0.8, life);
    vSize = uSize * sizeAtten * lifeSize * (0.5 + vSpeed * 0.5) * uPixelRatio;

    position += normalize(velocity + vec3(0.001)) * sin(uTime * 10.0 + aParticleId) * 0.01 * vSpeed;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(vSize, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

        this.logoMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uProgress: { value: 0 },
                uDisperseProgress: { value: 0 },
                uPixelRatio: { value: 1 },
                uSize: { value: 0.12 },
                uOpacity: { value: 1.0 },
                uPositions: { value: null },
                uVelocities: { value: null },
            },
            vertexShader: vertShader,
            fragmentShader: fragShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        // Set initial particle textures from particleSystem (available after init3DSystems)
        if (this.particleSystem && this.particleSystem.renderUniforms) {
            this.logoMaterial.uniforms.uPositions.value = this.particleSystem.renderUniforms.uPositions.value;
            this.logoMaterial.uniforms.uVelocities.value = this.particleSystem.renderUniforms.uVelocities.value;
        }

        this.logoMesh = new THREE.Points(geometry, this.logoMaterial);
        this.logoMesh.frustumCulled = false;
        this.scene.add(this.logoMesh);
    }

    sampleText(text, font) {
        return new Promise((resolve) => {
            const loadFont = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1024;
                canvas.height = 256;
                const ctx = canvas.getContext('2d');
                ctx.font = font;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, 512, 140);

                const data = ctx.getImageData(0, 0, 1024, 256).data;
                const points = [];

                for (let y = 0; y < 256; y += 4) {
                    for (let x = 0; x < 1024; x += 4) {
                        if (data[(y * 1024 + x) * 4 + 3] > 128) {
                            points.push([
                                (x / 1024 - 0.5) * 9,
                                -(y / 256 - 0.5) * 2.25
                            ]);
                        }
                    }
                }

                // Downsample to target count
                const targetCount = this.options.particleCount;
                const step = Math.max(1, Math.ceil(points.length / targetCount));
                const result = points.filter((_, i) => i % step === 0);

                resolve(result);
            };

            if (document.fonts && document.fonts.load) {
                document.fonts.load(font, text).then(loadFont).catch(loadFont);
            } else {
                loadFont();
            }
        });
    }

    hideContent() {
        if (this.titleElement) {
            this.titleElement.innerHTML = this.titleElement.textContent.split(' ').map(w =>
                `<span class="wl"><span class="w">${w}</span></span>`
            ).join('');
            gsap.set('.w', { yPercent: 115 });
        }

        gsap.set('.hin', { opacity: 0, y: 24 });
        gsap.set('header', { opacity: 0, y: -20 });
    }

    // Start the loading sequence
    startLoading() {
        this.state = 'loading';
        this.formProgress = 0;
        this.animateForm();
    }

    animateForm() {
        this.state = 'forming';

        gsap.to(this, {
            formProgress: 1,
            duration: 3,
            ease: Easing.cubicInOut,
            onUpdate: () => {
                if (this.logoMaterial) {
                    this.logoMaterial.uniforms.uProgress.value = this.formProgress;
                }
            },
            onComplete: () => {
                this.onFormed();
            }
        });
    }

    onFormed() {
        this.state = 'formed';

        // Reveal text content
        gsap.to('.w', { yPercent: 0, duration: 1.1, stagger: 0.07, ease: 'power4.out' });
        gsap.from('.hin', { opacity: 0, y: 24, duration: 0.9, delay: 0.6, stagger: 0.12, ease: 'power3.out' });
        gsap.from('header', { opacity: 0, y: -20, duration: 0.8, delay: 0.9 });

        // Start dispersing after delay
        setTimeout(() => this.startDisperse(), 600);
    }

    startDisperse() {
        this.state = 'dispersing';

        gsap.to(this, {
            disperseProgress: 1,
            duration: 1.1,
            ease: 'power2.in',
            onUpdate: () => {
                if (this.logoMaterial) {
                    this.logoMaterial.uniforms.uDisperseProgress.value = this.disperseProgress;
                }
            },
            onComplete: () => {
                this.onDispersed();
            }
        });

        // Fade out logo particles
        gsap.to(this.logoMaterial.uniforms.uOpacity, {
            value: 0,
            duration: 1.1,
            delay: 0.25,
            ease: 'power2.in'
        });
    }

    onDispersed() {
        this.state = 'idle';

        // Remove logo mesh
        if (this.logoMesh) {
            this.scene.remove(this.logoMesh);
            this.logoGeometry?.dispose();
            this.logoMaterial?.dispose();
            this.logoMesh = null;
        }

        // Enable main particle system
        if (this.particleSystem) {
            this.particleSystem.setEnabled(true);
        }
    }

    update(deltaTime, time) {
        if (!this.initialized) return;

        if (this.logoMaterial) {
            this.logoMaterial.uniforms.uTime.value = time;
            this.logoMaterial.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();

            // Sync with main particle system textures
            if (this.particleSystem) {
                this.logoMaterial.uniforms.uPositions.value = this.particleSystem.renderUniforms.uPositions.value;
                this.logoMaterial.uniforms.uVelocities.value = this.particleSystem.renderUniforms.uVelocities.value;
            }
        }

        if (this.particleSystem && this.state === 'idle') {
            this.particleSystem.update(deltaTime, time);
        }
    }

    render(camera) {
        if (!this.initialized) return;

        if (this.logoMesh && this.state !== 'idle') {
            this.renderer.render(this.logoMesh, camera);
        }
    }

    setEnabled(enabled) {
        if (this.particleSystem) {
            this.particleSystem.setEnabled(enabled);
        }
    }

    dispose() {
        if (this.logoMesh) {
            this.scene.remove(this.logoMesh);
            this.logoGeometry?.dispose();
            this.logoMaterial?.dispose();
        }
    }
}