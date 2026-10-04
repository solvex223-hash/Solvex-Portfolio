// Contact Section 3D System

import * as THREE from 'three';
import { gsap } from 'gsap';
import { Easing } from '../utils/easing.js';

export class ContactSection {
    constructor(options = {}) {
        this.options = {
            ...options
        };

        this.particleTrail = null;
        this.whatsappIcon = null;
        this.container = new THREE.Group();
        this.container.name = 'ContactSection';

        this.formActive = false;
        this.trailParticles = [];

        this.initialized = false;
    }

    async init(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.createContactElements();

        scene.add(this.container);

        // Initial state - hidden
        this.container.scale.setScalar(0.01);
        this.container.position.y = -3;

        this.initialized = true;
        return this;
    }

    createContactElements() {
        // WhatsApp icon as 3D object
        this.createWhatsAppIcon();

        // Particle trail system
        this.createParticleTrail();

        // Floating ambient particles
        this.createAmbientParticles();
    }

    createWhatsAppIcon() {
        const group = new THREE.Group();
        group.position.set(0, 0, -2);

        // Background circle
        const bgGeometry = new THREE.CircleGeometry(0.8, 64);
        const bgMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x25D366,
            metalness: 0.2,
            roughness: 0.3,
            clearcoat: 1,
            clearcoatRoughness: 0.1
        });
        const bg = new THREE.Mesh(bgGeometry, bgMaterial);
        bg.rotation.x = -Math.PI / 2;
        group.add(bg);

        // Phone shape
        const phoneGeometry = new THREE.CapsuleGeometry(0.25, 0.5, 4, 8);
        const phoneMaterial = new THREE.MeshBasicMaterial({
            color: 0x0E1730,
            transparent: true,
            opacity: 0.9
        });
        const phone = new THREE.Mesh(phoneGeometry, phoneMaterial);
        phone.rotation.x = -Math.PI / 2;
        phone.position.y = 0.05;
        group.add(phone);

        // Message bubble
        const bubbleGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const bubbleMaterial = new THREE.MeshBasicMaterial({
            color: 0x0E1730,
            transparent: true,
            opacity: 0.8
        });
        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        bubble.position.set(0.4, 0.3, 0);
        group.add(bubble);

        // Pulse ring
        const ringGeometry = new THREE.RingGeometry(0.9, 1.1, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x25D366,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);

        this.whatsappIcon = {
            group,
            bg,
            phone,
            bubble,
            ring,
            ringMaterial
        };

        this.container.add(group);
    }

    createParticleTrail() {
        // Trail particles that flow from form to WhatsApp
        const count = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const life = new Float32Array(count);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            this.resetTrailParticle(positions, velocities, life, sizes, i);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('life', new THREE.BufferAttribute(life, 1));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: 0x25D366,
            size: 0.04,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            vertexColors: false
        });

        this.particleTrail = new THREE.Points(geometry, material);
        this.container.add(this.particleTrail);

        this.trailGeometry = geometry;
        this.trailMaterial = material;
    }

    resetTrailParticle(positions, velocities, life, sizes, index) {
        // Start from form area (left side)
        positions[index * 3] = -4 + Math.random() * 0.5;
        positions[index * 3 + 1] = (Math.random() - 0.5) * 1.5;
        positions[index * 3 + 2] = -2 + Math.random() * 0.5;

        // Velocity toward WhatsApp
        velocities[index * 3] = 1.5 + Math.random() * 1;
        velocities[index * 3 + 1] = (Math.random() - 0.5) * 0.5;
        velocities[index * 3 + 2] = (Math.random() - 0.5) * 0.5;

        life[index] = 1.0;
        sizes[index] = 0.02 + Math.random() * 0.03;
    }

    createAmbientParticles() {
        const count = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const delays = new Float32Array(count);

        const colors_list = [
            new THREE.Color(0x25D366),
            new THREE.Color(0x128C7E),
            new THREE.Color(0x075E54),
            new THREE.Color(0xF2561D)
        ];

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 2.5 + Math.random() * 2;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi) - 1;

            const color = colors_list[Math.floor(Math.random() * colors_list.length)];
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = 0.01 + Math.random() * 0.02;
            delays[i] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('delay', new THREE.BufferAttribute(delays, 1));

        const material = new THREE.PointsMaterial({
            size: 0.02,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.ambientParticles = new THREE.Points(geometry, material);
        this.container.add(this.ambientParticles);

        this.ambientGeometry = geometry;
        this.ambientMaterial = material;
    }

    onEnter(progress) {
        gsap.to(this.container.scale, {
            x: 1, y: 1, z: 1,
            duration: 1.2,
            delay: 0.2,
            ease: Easing.backOut
        });

        gsap.to(this.container.position, {
            y: 0,
            duration: 1,
            delay: 0.2,
            ease: Easing.cubicOut
        });
    }

    onLeave(progress, direction) {
        gsap.to(this.container.scale, {
            x: 0.01, y: 0.01, z: 0.01,
            duration: 0.6,
            ease: Easing.cubicIn
        });

        gsap.to(this.container.position, {
            y: direction > 0 ? 5 : -5,
            duration: 0.6,
            ease: Easing.cubicIn
        });
    }

    // Called when user focuses form input
    onFormFocus() {
        this.formActive = true;
    }

    onFormBlur() {
        this.formActive = false;
    }

    onFormInput() {
        // Spawn trail particle
        this.spawnTrailParticle();
    }

    spawnTrailParticle() {
        const positions = this.trailGeometry.attributes.position.array;
        const velocities = this.trailGeometry.attributes.velocity.array;
        const life = this.trailGeometry.attributes.life.array;
        const sizes = this.trailGeometry.attributes.size.array;

        // Find dead particle
        for (let i = 0; i < life.length; i++) {
            if (life[i] <= 0) {
                this.resetTrailParticle(positions, velocities, life, sizes, i);
                break;
            }
        }

        this.trailGeometry.attributes.position.needsUpdate = true;
        this.trailGeometry.attributes.velocity.needsUpdate = true;
        this.trailGeometry.attributes.life.needsUpdate = true;
        this.trailGeometry.attributes.size.needsUpdate = true;
    }

    update(deltaTime, time) {
        if (!this.initialized) return;

        // Animate WhatsApp icon
        if (this.whatsappIcon) {
            const icon = this.whatsappIcon;

            // Floating
            icon.group.position.y = Math.sin(time * 1.5) * 0.1;
            icon.group.rotation.z = Math.sin(time * 0.7) * 0.03;

            // Phone bob
            icon.phone.position.y = 0.05 + Math.sin(time * 2) * 0.02;
            icon.phone.rotation.z = Math.sin(time * 1.3) * 0.05;

            // Bubble pulse
            const bubbleScale = 1 + Math.sin(time * 3) * 0.1;
            icon.bubble.scale.setScalar(bubbleScale);

            // Ring pulse
            icon.ring.scale.setScalar(1 + Math.sin(time * 1.2) * 0.15);
            icon.ringMaterial.opacity = 0.15 + Math.sin(time * 1.2) * 0.1;
        }

        // Update trail particles
        if (this.particleTrail) {
            const positions = this.trailGeometry.attributes.position.array;
            const velocities = this.trailGeometry.attributes.velocity.array;
            const life = this.trailGeometry.attributes.life.array;
            const sizes = this.trailGeometry.attributes.size.array;

            const targetPos = new THREE.Vector3(0, 0, -2); // WhatsApp position

            for (let i = 0; i < life.length; i++) {
                if (life[i] > 0) {
                    // Move toward target
                    const dx = targetPos.x - positions[i * 3];
                    const dy = targetPos.y - positions[i * 3 + 1];
                    const dz = targetPos.z - positions[i * 3 + 2];
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist < 0.3) {
                        // Reached target - respawn
                        life[i] = 0;
                    } else {
                        // Attract toward target
                        const attractStrength = 2.0;
                        velocities[i * 3] += (dx / dist) * attractStrength * deltaTime;
                        velocities[i * 3 + 1] += (dy / dist) * attractStrength * deltaTime;
                        velocities[i * 3 + 2] += (dz / dist) * attractStrength * deltaTime;

                        // Apply velocity
                        positions[i * 3] += velocities[i * 3] * deltaTime;
                        positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
                        positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;

                        // Dampen
                        velocities[i * 3] *= 0.98;
                        velocities[i * 3 + 1] *= 0.98;
                        velocities[i * 3 + 2] *= 0.98;

                        // Fade life
                        life[i] -= deltaTime * 0.5;
                    }
                } else if (this.formActive && Math.random() < 0.1) {
                    // Respawn from form when active
                    this.resetTrailParticle(positions, velocities, life, sizes, i);
                }
            }

            this.trailGeometry.attributes.position.needsUpdate = true;
            this.trailGeometry.attributes.velocity.needsUpdate = true;
            this.trailGeometry.attributes.life.needsUpdate = true;
        }

        // Ambient particles
        if (this.ambientParticles) {
            this.ambientParticles.rotation.y += 0.02 * deltaTime;

            const positions = this.ambientGeometry.attributes.position.array;
            const delays = this.ambientGeometry.attributes.delay.array;

            for (let i = 0; i < positions.length; i += 3) {
                const delay = delays[i / 3];
                const phase = time * 0.3 + delay * 10;
                positions[i + 1] += Math.sin(phase) * 0.001;
            }
            this.ambientGeometry.attributes.position.needsUpdate = true;
        }
    }

    render(camera) {
        if (!this.initialized) return;
        this.renderer.render(this.container, camera);
    }

    setEnabled(enabled) {
        this.container.visible = enabled;
    }

    dispose() {
        this.scene.remove(this.container);

        if (this.whatsappIcon) {
            this.whatsappIcon.bg.geometry.dispose();
            this.whatsappIcon.bg.material.dispose();
            this.whatsappIcon.phone.geometry.dispose();
            this.whatsappIcon.phone.material.dispose();
            this.whatsappIcon.bubble.geometry.dispose();
            this.whatsappIcon.bubble.material.dispose();
            this.whatsappIcon.ring.geometry.dispose();
            this.whatsappIcon.ringMaterial.dispose();
        }

        this.trailGeometry?.dispose();
        this.trailMaterial?.dispose();
        this.ambientGeometry?.dispose();
        this.ambientMaterial?.dispose();
    }
}