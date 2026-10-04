// GPGPU Particle System

import * as THREE from 'three';
import { Shaders } from '../utils/shaderLoader.js';

export class ParticleSystem {
    constructor(options = {}) {
        this.options = {
            count: 30000,
            textureSize: 256, // sqrt(count) rounded up
            ...options
        };

        this.particleCount = this.options.count;
        this.textureSize = this.options.textureSize;
        this.simulationMaterial = null;
        this.renderMaterial = null;
        this.renderGeometry = null;
        this.renderMesh = null;

        // Ping-pong render targets
        this.positionTargets = [null, null];
        this.velocityTargets = [null, null];
        this.currentRead = 0;
        this.currentWrite = 1;

        // Simulation uniforms
        this.simulationUniforms = {
            uPositions: { value: null },
            uVelocities: { value: null },
            uTime: { value: 0 },
            uDeltaTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(this.textureSize, this.textureSize) },
            uAttractorPos: { value: new THREE.Vector3(0, 0, 0) },
            uAttractorStrength: { value: 0 },
            uCurlStrength: { value: 0.5 },
            uDissipation: { value: 0.02 },
            uGravity: { value: new THREE.Vector3(0, -0.08, 0) },
            uSpeed: { value: 1.0 },
            uMode: { value: 0 }
        };

        // Render uniforms
        this.renderUniforms = {
            uPositions: { value: null },
            uVelocities: { value: null },
            uTime: { value: 0 },
            uPixelRatio: { value: 1 },
            uSize: { value: 0.1 },
            uOpacity: { value: 1.0 }
        };

        this.attractorPosition = new THREE.Vector3(0, 0, 0);
        this.attractorStrength = 0;
        this.attractorTargetStrength = 0;
        this.curlStrength = 0.5;
        this.speed = 1.0;

        // State
        this.initialized = false;
        this.enabled = true;
    }

    async init(renderer) {
        this.renderer = renderer;
        const gl = renderer.getContext();

        // Check for required extensions
        const ext = gl.getExtension('OES_texture_float');
        if (!ext) {
            console.warn('[ParticleSystem] OES_texture_float not supported, falling back to half float');
        }

        // Use pre-loaded shaders
        const simulationShader = Shaders.particle.simulation;
        const renderVertShader = Shaders.particle.renderVert;
        const renderFragShader = Shaders.particle.renderFrag;

        this.renderUniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
        this.createRenderTargets();
        this.createSimulationMaterial(simulationShader);
        this.createRenderMaterial(renderVertShader, renderFragShader);
        this.createRenderGeometry();
        this.initializeParticles();

        this.initialized = true;
        return this;
    }

    createRenderTargets() {
        const options = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            colorSpace: THREE.LinearSRGBColorSpace,
            depthBuffer: false,
            stencilBuffer: false
        };

        // Try float, fallback to half float
        let useFloat = true;
        try {
            this.positionTargets[0] = new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, options);
            this.positionTargets[1] = new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, options);
            this.velocityTargets[0] = new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, options);
            this.velocityTargets[1] = new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, options);
        } catch (e) {
            useFloat = false;
            options.type = THREE.HalfFloatType;
            this.positionTargets[0] = new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, options);
            this.positionTargets[1] = new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, options);
            this.velocityTargets[0] = new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, options);
            this.velocityTargets[1] = new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, options);
        }

        console.log(`[ParticleSystem] Using ${useFloat ? 'Float' : 'HalfFloat'} textures`);
    }

    createSimulationMaterial(shaderSource) {
        this.simulationMaterial = new THREE.ShaderMaterial({
            uniforms: this.simulationUniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: shaderSource
        });
    }

    createRenderMaterial(vertSource, fragSource) {
        this.renderMaterial = new THREE.ShaderMaterial({
            uniforms: this.renderUniforms,
            vertexShader: vertSource,
            fragmentShader: fragSource,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: false
        });
    }

    createRenderGeometry() {
        // Full-screen quad for simulation
        this.simGeometry = new THREE.PlaneGeometry(2, 2);

        // Particle render geometry - one point per particle
        const count = this.particleCount;
        const positions = new Float32Array(count * 3);
        const aUvs = new Float32Array(count * 2);
        const aParticleIds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // UV maps to texture coordinate
            const x = (i % this.textureSize) / this.textureSize;
            const y = Math.floor(i / this.textureSize) / this.textureSize;
            aUvs[i * 2] = x + 0.5 / this.textureSize;
            aUvs[i * 2 + 1] = y + 0.5 / this.textureSize;
            aParticleIds[i] = i;
        }

        this.renderGeometry = new THREE.BufferGeometry();
        this.renderGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.renderGeometry.setAttribute('aUv', new THREE.BufferAttribute(aUvs, 2));
        this.renderGeometry.setAttribute('aParticleId', new THREE.BufferAttribute(aParticleIds, 1));

        this.renderMesh = new THREE.Points(this.renderGeometry, this.renderMaterial);
        this.renderMesh.frustumCulled = false; // Important for particle systems
    }

    initializeParticles() {
        // Initialize position texture with random sphere distribution
        const posData = new Float32Array(this.textureSize * this.textureSize * 4);
        const velData = new Float32Array(this.textureSize * this.textureSize * 4);

        for (let i = 0; i < this.particleCount; i++) {
            // Random spherical distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 2 + Math.random() * 4;

            posData[i * 4] = radius * Math.sin(phi) * Math.cos(theta);
            posData[i * 4 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            posData[i * 4 + 2] = radius * Math.cos(phi);
            posData[i * 4 + 3] = 1.0; // life

            velData[i * 4] = 0;
            velData[i * 4 + 1] = 0;
            velData[i * 4 + 2] = 0;
            velData[i * 4 + 3] = Math.random(); // age (random so particles do not all respawn together)
        }

        // Upload to first render target
        const posTexture = new THREE.DataTexture(
            posData, this.textureSize, this.textureSize,
            THREE.RGBAFormat, THREE.FloatType
        );
        posTexture.needsUpdate = true;

        const velTexture = new THREE.DataTexture(
            velData, this.textureSize, this.textureSize,
            THREE.RGBAFormat, THREE.FloatType
        );
        velTexture.needsUpdate = true;

        // Render to position target
        this.renderToTarget(this.positionTargets[0], posTexture);
        this.renderToTarget(this.velocityTargets[0], velTexture);

        // Set initial uniforms
        this.simulationUniforms.uPositions.value = this.positionTargets[0].texture;
        this.simulationUniforms.uVelocities.value = this.velocityTargets[0].texture;
        this.renderUniforms.uPositions.value = this.positionTargets[0].texture;
        this.renderUniforms.uVelocities.value = this.velocityTargets[0].texture;
    }

    renderToTarget(target, texture) {
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshBasicMaterial({ map: texture })
        );
        scene.add(mesh);

        this.renderer.setRenderTarget(target);
        this.renderer.render(scene, camera);
        this.renderer.setRenderTarget(null);
    }

    swapTargets() {
        [this.currentRead, this.currentWrite] = [this.currentWrite, this.currentRead];

        this.simulationUniforms.uPositions.value = this.positionTargets[this.currentRead].texture;
        this.simulationUniforms.uVelocities.value = this.velocityTargets[this.currentRead].texture;
        this.renderUniforms.uPositions.value = this.positionTargets[this.currentRead].texture;
        this.renderUniforms.uVelocities.value = this.velocityTargets[this.currentRead].texture;
    }

    setAttractor(position, strength) {
        this.attractorPosition.copy(position);
        this.attractorTargetStrength = strength;
    }

    setCurlStrength(strength) {
        this.curlStrength = strength;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    setGravity(gravity) {
        this.simulationUniforms.uGravity.value.copy(gravity);
    }

    setSize(size) {
        this.renderUniforms.uSize.value = size;
    }

    setOpacity(opacity) {
        this.renderUniforms.uOpacity.value = opacity;
    }

    setPixelRatio(ratio) {
        this.renderUniforms.uPixelRatio.value = ratio;
    }

    setCount(count) {
        // Would need to recreate geometry - for now just note
        this.particleCount = Math.min(count, this.textureSize * this.textureSize);
    }

    update(deltaTime, time) {
        if (!this.enabled || !this.initialized) return;

        // Smooth attractor strength
        this.attractorStrength += (this.attractorTargetStrength - this.attractorStrength) * 0.1;

        // Update uniforms
        this.simulationUniforms.uTime.value = time;
        this.simulationUniforms.uDeltaTime.value = Math.min(deltaTime, 1/30); // Cap for stability
        this.simulationUniforms.uAttractorPos.value.copy(this.attractorPosition);
        this.simulationUniforms.uAttractorStrength.value = this.attractorStrength;
        this.simulationUniforms.uCurlStrength.value = this.curlStrength;
        this.simulationUniforms.uSpeed.value = this.speed;

        this.renderUniforms.uTime.value = time;

        // Run simulation: one pass writes positions, a second writes velocities
        const simScene = this.simScene || this.createSimScene();
        this.simulationUniforms.uMode.value = 0;
        this.renderer.setRenderTarget(this.positionTargets[this.currentWrite]);
        this.renderer.render(simScene, this.simCamera);

        this.simulationUniforms.uMode.value = 1;
        this.renderer.setRenderTarget(this.velocityTargets[this.currentWrite]);
        this.renderer.render(simScene, this.simCamera);

        this.renderer.setRenderTarget(null);

        // Swap for next frame
        this.swapTargets();
    }

    createSimScene() {
        this.simScene = new THREE.Scene();
        this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.simMesh = new THREE.Mesh(this.simGeometry, this.simulationMaterial);
        this.simScene.add(this.simMesh);
        return this.simScene;
    }

    createSimCamera() {
        return this.simCamera;
    }

    render(camera) {
        if (!this.enabled || !this.initialized) return;

        this.renderMesh.rotation.copy(camera.rotation);
        this.renderer.render(this.renderMesh, camera);
    }

    getMesh() {
        return this.renderMesh;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    dispose() {
        this.positionTargets.forEach(rt => rt?.dispose());
        this.velocityTargets.forEach(rt => rt?.dispose());
        this.simulationMaterial?.dispose();
        this.renderMaterial?.dispose();
        this.renderGeometry?.dispose();
        this.simGeometry?.dispose();
    }
}