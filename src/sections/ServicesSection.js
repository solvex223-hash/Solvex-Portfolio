// Services Section 3D System

import * as THREE from 'three';
import { gsap } from 'gsap';
import { Easing } from '../utils/easing.js';

export class ServicesSection {
    constructor(options = {}) {
        this.options = {
            ...options
        };

        this.serviceNodes = [];
        this.serviceMeshes = [];
        this.connectionLines = [];
        this.container = new THREE.Group();
        this.container.name = 'ServicesSection';

        this.activeService = -1;
        this.hoverProgress = 0;
        this.targetHover = -1;

        this.initialized = false;
    }

    async init(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.createServiceNodes();
        this.createConnections();

        scene.add(this.container);

        // Initial state - hidden
        this.container.scale.setScalar(0.01);
        this.container.position.y = -5;

        this.initialized = true;
        return this;
    }

    createServiceNodes() {
        // Three service types with their configurations
        const services = [
            {
                id: 'websites',
                name: 'Websites that take bookings',
                icon: 'calendar',
                color: new THREE.Color(0xF2561D), // accent
                position: new THREE.Vector3(-3, 0, 0),
                description: 'Fast, mobile-first sites with direct booking flow'
            },
            {
                id: 'whatsapp',
                name: 'WhatsApp bots',
                icon: 'message',
                color: new THREE.Color(0x25D366), // WhatsApp green
                position: new THREE.Vector3(0, 0, 0),
                description: 'Automatic replies for prices, availability, orders'
            },
            {
                id: 'automation',
                name: 'Automation and outreach',
                icon: 'gear',
                color: new THREE.Color(0x7C4DFF), // purple
                position: new THREE.Vector3(3, 0, 0),
                description: 'Lead capture, follow-ups, CRM updates, cold outreach'
            }
        ];

        services.forEach((service, index) => {
            const node = this.createServiceNode(service, index);
            this.serviceNodes.push({ ...service, ...node });
            this.container.add(node.group);
        });
    }

    createServiceNode(service, index) {
        const group = new THREE.Group();
        group.position.copy(service.position);

        // Outer glow ring
        const ringGeometry = new THREE.RingGeometry(0.8, 1.0, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: service.color,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);

        // Core sphere
        const coreGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const coreMaterial = new THREE.MeshPhysicalMaterial({
            color: service.color,
            metalness: 0.3,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            transparent: true,
            opacity: 0.9
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        group.add(core);

        // Inner pulse sphere
        const pulseGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const pulseMaterial = new THREE.MeshBasicMaterial({
            color: service.color,
            transparent: true,
            opacity: 0.3,
            depthWrite: false
        });
        const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
        group.add(pulse);

        // Icon placeholder (could be replaced with actual geometry)
        const iconGeometry = new THREE.OctahedronGeometry(0.25, 0);
        const iconMaterial = new THREE.MeshBasicMaterial({
            color: 0x0E1730,
            transparent: true,
            opacity: 0.9
        });
        const icon = new THREE.Mesh(iconGeometry, iconMaterial);
        group.add(icon);

        // Particles around node
        const particleCount = 100;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        const particleDelays = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 0.6 + Math.random() * 0.4;

            particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            particlePositions[i * 3 + 2] = radius * Math.cos(phi);

            particleSizes[i] = 0.01 + Math.random() * 0.02;
            particleDelays[i] = Math.random();
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        particleGeometry.setAttribute('delay', new THREE.BufferAttribute(particleDelays, 1));

        const particleMaterial = new THREE.PointsMaterial({
            color: service.color,
            size: 0.02,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(particles);

        // Store references for animation
        return {
            group,
            ring,
            core,
            pulse,
            icon,
            particles,
            particleGeometry,
            particleMaterial,
            baseScale: 1,
            hoverScale: 1.3,
            rotationSpeed: 0.2 + index * 0.1
        };
    }

    createConnections() {
        // Subtle lines connecting service nodes
        for (let i = 0; i < this.serviceNodes.length - 1; i++) {
            const start = this.serviceNodes[i].group.position;
            const end = this.serviceNodes[i + 1].group.position;

            const points = [];
            const segments = 20;
            for (let s = 0; s <= segments; s++) {
                const t = s / segments;
                const x = THREE.MathUtils.lerp(start.x, end.x, t);
                const y = Math.sin(t * Math.PI) * 0.5; // Arc upward
                const z = THREE.MathUtils.lerp(start.z, end.z, t);
                points.push(new THREE.Vector3(x, y, z));
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: 0x13203C,
                transparent: true,
                opacity: 0.2,
                depthWrite: false
            });

            const line = new THREE.Line(geometry, material);
            this.container.add(line);
            this.connectionLines.push({ line, geometry, material, startIndex: i });
        }
    }

    // Called when section becomes active
    onEnter(progress) {
        // Animate in
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

        // Stagger service nodes
        this.serviceNodes.forEach((node, index) => {
            gsap.from(node.group.position, {
                y: -2,
                duration: 0.8,
                delay: 0.3 + index * 0.15,
                ease: Easing.cubicOut
            });

            gsap.from(node.group.scale, {
                x: 0, y: 0, z: 0,
                duration: 0.6,
                delay: 0.4 + index * 0.15,
                ease: Easing.backOut
            });
        });
    }

    // Called when section becomes inactive
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

    // Set hover state for a service
    setHover(index) {
        this.targetHover = index;
    }

    clearHover() {
        this.targetHover = -1;
    }

    update(deltaTime, time) {
        if (!this.initialized) return;

        // Smooth hover progress
        this.hoverProgress += (this.targetHover - this.hoverProgress) * 0.15;

        this.serviceNodes.forEach((node, index) => {
            const isHovered = index === this.targetHover;
            const hoverAmount = isHovered ? 1 : 0;

            // Scale
            const targetScale = THREE.MathUtils.lerp(node.baseScale, node.hoverScale, hoverAmount);
            node.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

            // Rotation
            node.group.rotation.y += node.rotationSpeed * deltaTime;
            node.icon.rotation.x += 0.3 * deltaTime;
            node.icon.rotation.y += 0.5 * deltaTime;

            // Pulse
            const pulseScale = 1 + Math.sin(time * 2 + index) * 0.05;
            node.pulse.scale.setScalar(pulseScale);

            // Ring rotation
            node.ring.rotation.z += 0.15 * deltaTime;

            // Particles
            if (node.particles) {
                node.particles.rotation.y += 0.1 * deltaTime;

                // Animate particle positions
                const positions = node.particleGeometry.attributes.position.array;
                const delays = node.particleGeometry.attributes.delay.array;

                for (let i = 0; i < positions.length; i += 3) {
                    const delay = delays[i / 3];
                    const phase = time * 0.5 + delay * 10;
                    positions[i + 1] += Math.sin(phase) * 0.002;
                }
                node.particleGeometry.attributes.position.needsUpdate = true;
            }

            // Connection lines pulse
            if (index < this.connectionLines.length) {
                const conn = this.connectionLines[index];
                const pulseOpacity = 0.1 + 0.15 * Math.sin(time * 1.5 + index);
                conn.material.opacity = pulseOpacity;
            }
        });

        // Camera subtle follow
        if (this.targetHover >= 0) {
            const target = this.serviceNodes[this.targetHover].group.position;
            // Could add camera lerp here
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

        this.serviceNodes.forEach(node => {
            node.ring.geometry.dispose();
            node.ring.material.dispose();
            node.core.geometry.dispose();
            node.core.material.dispose();
            node.pulse.geometry.dispose();
            node.pulse.material.dispose();
            node.icon.geometry.dispose();
            node.icon.material.dispose();
            node.particles.geometry.dispose();
            node.particles.material.dispose();
        });

        this.connectionLines.forEach(conn => {
            conn.geometry.dispose();
            conn.material.dispose();
        });
    }
}