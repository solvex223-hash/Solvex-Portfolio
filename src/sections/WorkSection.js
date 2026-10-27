// Work Section - 3D Case Study Cards

import * as THREE from 'three';
import { gsap } from 'gsap';
import { Shaders } from '../utils/shaderLoader.js';
import { Easing } from '../utils/easing.js';

export class WorkSection {
    constructor(options = {}) {
        this.options = {
            cases: [
                {
                    id: 'jsignature',
                    title: "J's Signature Hotel",
                    description: 'A cinematic, scroll-driven hotel website that opens with a zoom from space down to the hotel, with rooms, dining, gallery and events, plus a direct booking engine.',
                    tags: ['Hotel', 'Website rebuild', 'Booking engine'],
                    colors: {
                        primary: new THREE.Color(0x0B0B0B),
                        secondary: new THREE.Color(0xD4AF37),
                        accent: new THREE.Color(0xF4EFE3)
                    },
                    position: new THREE.Vector3(-4, 0, -2)
                },
                {
                    id: 'laybel',
                    title: 'Laybel Collections',
                    description: 'A premium dark and gold landing page for a fashion brand, with a full garment gallery and WhatsApp booking links on every piece.',
                    tags: ['Fashion', 'Landing page', 'WhatsApp booking'],
                    colors: {
                        primary: new THREE.Color(0x14110C),
                        secondary: new THREE.Color(0xC9A24A),
                        accent: new THREE.Color(0xF3E7C8)
                    },
                    position: new THREE.Vector3(0, 0, -2)
                },
                {
                    id: 'dptl',
                    title: 'DPTL Intercloud',
                    description: 'A landing page for a smart security, solar and CCTV company, built to turn visitors into quote requests.',
                    tags: ['Security & Solar', 'Landing page'],
                    colors: {
                        primary: new THREE.Color(0x2A1458),
                        secondary: new THREE.Color(0x7C4DFF),
                        accent: new THREE.Color(0xE6DDFF)
                    },
                    position: new THREE.Vector3(4, 0, -2)
                }
            ],
            ...options
        };

        this.cases = this.options.cases;
        this.caseMeshes = [];
        this.container = new THREE.Group();
        this.container.name = 'WorkSection';

        this.hoveredCase = -1;
        this.hoverProgress = 0;
        this.targetHover = -1;

        this.initialized = false;
    }

    async init(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Use pre-loaded card shader
        this.cardFragmentShader = Shaders.ui.card;

        this.createCaseCards();

        scene.add(this.container);

        // Initial state - hidden
        this.container.scale.setScalar(0.01);
        this.container.position.y = -3;

        this.initialized = true;
        return this;
    }

    createCaseCards() {
        this.cases.forEach((caseData, index) => {
            const card = this.createCaseCard(caseData, index);
            this.caseMeshes.push({ ...caseData, ...card });
            this.container.add(card.group);
        });
    }

    createCaseCard(caseData, index) {
        const group = new THREE.Group();
        group.position.copy(caseData.position);
        group.userData = { caseIndex: index };

        // Card dimensions
        const width = 3.2;
        const height = 2.0;
        const depth = 0.08;
        const radius = 0.12;

        // Card back (dark)
        const backGeometry = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
        const backMaterial = new THREE.MeshPhysicalMaterial({
            color: caseData.colors.primary,
            metalness: 0.1,
            roughness: 0.9,
            transparent: true,
            opacity: 0.95,
            side: THREE.BackSide
        });
        const back = new THREE.Mesh(backGeometry, backMaterial);
        back.position.z = -depth / 2;
        group.add(back);

        // Card front (shader-based for hover effects)
        const frontGeometry = new THREE.PlaneGeometry(width - 0.1, height - 0.1);
        const frontMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uHoverProgress: { value: 0 },
                uLiftProgress: { value: 0 },
                uPaletteColor1: { value: caseData.colors.primary },
                uPaletteColor2: { value: caseData.colors.secondary },
                uPaletteColor3: { value: caseData.colors.accent },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uResolution: { value: new THREE.Vector2(width, height) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: this.cardFragmentShader,
            transparent: true,
            depthWrite: true,
            side: THREE.FrontSide
        });
        const front = new THREE.Mesh(frontGeometry, frontMaterial);
        front.position.z = depth / 2 + 0.001;
        group.add(front);

        // Edge highlight
        const edgeGeometry = new THREE.EdgesGeometry(backGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: caseData.colors.secondary,
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        group.add(edges);

        // Floating particles around card
        const particleCount = 50;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        const particleDelays = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 1.8 + Math.random() * 0.5;

            particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            particlePositions[i * 3 + 2] = radius * Math.cos(phi) - 0.5;

            // Color from palette
            const colorChoice = Math.random();
            let color;
            if (colorChoice < 0.4) color = caseData.colors.primary;
            else if (colorChoice < 0.7) color = caseData.colors.secondary;
            else color = caseData.colors.accent;

            particleColors[i * 3] = color.r;
            particleColors[i * 3 + 1] = color.g;
            particleColors[i * 3 + 2] = color.b;

            particleSizes[i] = 0.015 + Math.random() * 0.015;
            particleDelays[i] = Math.random();
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        particleGeometry.setAttribute('delay', new THREE.BufferAttribute(particleDelays, 1));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.03,
            vertexColors: true,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(particles);

        return {
            group,
            front,
            frontMaterial,
            back,
            edges,
            edgeMaterial,
            particles,
            particleGeometry,
            particleMaterial,
            width,
            height
        };
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

        // Stagger cards with 3D entrance
        this.caseMeshes.forEach((card, index) => {
            gsap.from(card.group.position, {
                z: 5,
                y: -2,
                duration: 1,
                delay: 0.3 + index * 0.2,
                ease: Easing.cubicOut
            });

            gsap.from(card.group.rotation, {
                x: 0.3,
                duration: 1,
                delay: 0.3 + index * 0.2,
                ease: Easing.cubicOut
            });

            gsap.from(card.group.scale, {
                x: 0.5, y: 0.5, z: 0.5,
                duration: 0.8,
                delay: 0.4 + index * 0.2,
                ease: Easing.backOut
            });
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

    // Raycast for hover detection
    checkHover(raycaster) {
        const cardFronts = this.caseMeshes.map(c => c.front);
        const intersects = raycaster.intersectObjects(cardFronts, false);

        if (intersects.length > 0) {
            const index = intersects[0].object.parent.userData.caseIndex;
            this.targetHover = index;

            // Update mouse position for shader
            const card = this.caseMeshes[index];
            const localMouse = intersects[0].uv;
            card.frontMaterial.uniforms.uMouse.value.set(
                (localMouse.x - 0.5) * 2,
                (localMouse.y - 0.5) * 2
            );
        } else {
            this.targetHover = -1;
        }
    }

    update(deltaTime, time) {
        if (!this.initialized) return;

        // Smooth hover progress
        this.hoverProgress += (this.targetHover - this.hoverProgress) * 0.15;

        this.caseMeshes.forEach((card, index) => {
            const isHovered = index === this.targetHover;
            const hoverAmount = isHovered ? 1 : 0;

            // Lift progress for shader
            const liftProgress = isHovered ? 1 : 0;

            // Update shader uniforms
            card.frontMaterial.uniforms.uTime.value = time;
            card.frontMaterial.uniforms.uHoverProgress.value = hoverAmount;
            card.frontMaterial.uniforms.uLiftProgress.value = liftProgress;

            // Physical lift
            const targetY = hoverAmount * 0.3;
            card.group.position.y += (targetY - card.group.position.y) * 0.1;

            // Subtle rotation toward mouse
            if (isHovered) {
                card.group.rotation.x += (card.frontMaterial.uniforms.uMouse.value.y * 0.05 - card.group.rotation.x) * 0.1;
                card.group.rotation.y += (-card.frontMaterial.uniforms.uMouse.value.x * 0.05 - card.group.rotation.y) * 0.1;
            } else {
                card.group.rotation.x *= 0.95;
                card.group.rotation.y *= 0.95;
            }

            // Edge glow on hover
            const edgeOpacity = 0.2 + hoverAmount * 0.5;
            card.edgeMaterial.opacity = edgeOpacity;
            card.edges.material.color.lerp(card.frontMaterial.uniforms.uPaletteColor3.value, hoverAmount * 0.5);

            // Particles appear on hover
            const particleOpacity = hoverAmount * 0.6;
            card.particleMaterial.opacity = particleOpacity;

            // Animate particles
            if (particleOpacity > 0.01) {
                card.particles.rotation.y += 0.05 * deltaTime;

                const positions = card.particleGeometry.attributes.position.array;
                const delays = card.particleGeometry.attributes.delay.array;

                for (let i = 0; i < positions.length; i += 3) {
                    const delay = delays[i / 3];
                    const phase = time * 0.7 + delay * 10;
                    positions[i] += Math.sin(phase) * 0.001;
                    positions[i + 1] += Math.cos(phase) * 0.001;
                    positions[i + 2] += Math.sin(phase * 0.5) * 0.001;
                }
                card.particleGeometry.attributes.position.needsUpdate = true;
            }
        });
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

        this.caseMeshes.forEach(card => {
            card.front.geometry.dispose();
            card.frontMaterial.dispose();
            card.back.geometry.dispose();
            card.back.material.dispose();
            card.edges.geometry.dispose();
            card.edgeMaterial.dispose();
            card.particles.geometry.dispose();
            card.particles.material.dispose();
        });
    }
}