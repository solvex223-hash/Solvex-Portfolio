// Animated Line Network System

import * as THREE from 'three';
import { Shaders } from '../utils/shaderLoader.js';

export class LineNetwork {
    constructor(options = {}) {
        this.options = {
            nodeCount: 84,
            connectionDistance: 1.4,
            ...options
        };

        this.nodeCount = this.options.nodeCount;
        this.connectionDistance = this.options.connectionDistance;
        this.nodes = [];
        this.connections = [];
        this.lineMesh = null;
        this.lineMaterial = null;
        this.lineGeometry = null;
        this.coreMesh = null;
        this.initialized = false;
        this.enabled = true;

        // Animation
        this.time = 0;
        this.flowSpeed = 0.3;
        this.lineWidth = 1.0;
        this.lineColor = new THREE.Color(0x13203C);
        this.accentColor = new THREE.Color(0xF2561D);
    }

    async init(renderer) {
        this.renderer = renderer;

        // Use pre-loaded shaders
        const vertShader = Shaders.line.vert;
        const fragShader = Shaders.line.frag;

        this.generateNetwork();
        this.createLineMaterial(vertShader, fragShader);
        this.createLineGeometry();
        this.createCore();

        this.initialized = true;
        return this;
    }

    generateNetwork() {
        // Generate nodes on sphere (Fibonacci sphere)
        this.nodes = [];
        for (let i = 0; i < this.nodeCount; i++) {
            const y = 1 - (i + 0.5) * 2 / this.nodeCount;
            const radius = Math.sqrt(1 - y * y);
            const theta = i * 2.39996; // Golden angle
            const k = 2 + Math.random() * 0.5;

            this.nodes.push(new THREE.Vector3(
                Math.cos(theta) * radius * k,
                y * k,
                Math.sin(theta) * radius * k
            ));
        }

        // Find connections
        this.connections = [];
        for (let i = 0; i < this.nodeCount; i++) {
            for (let j = i + 1; j < this.nodeCount; j++) {
                if (this.nodes[i].distanceTo(this.nodes[j]) < this.connectionDistance) {
                    this.connections.push({ a: i, b: j });
                }
            }
        }

        console.log(`[LineNetwork] Generated ${this.nodes.length} nodes, ${this.connections.length} connections`);
    }

    createLineMaterial(vertSource, fragSource) {
        this.lineMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uLineWidth: { value: this.lineWidth },
                uLineColor: { value: this.lineColor },
                uAccentColor: { value: this.accentColor },
                uOpacity: { value: 0.45 }
            },
            vertexShader: vertSource,
            fragmentShader: fragSource,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });
    }

    createLineGeometry() {
        // Each connection = line segment with multiple vertices for flow animation
        const segmentsPerLine = 4;
        const vertexCount = this.connections.length * segmentsPerLine * 2;

        const positions = new Float32Array(vertexCount * 3);
        const nextPositions = new Float32Array(vertexCount * 3);
        const lineIds = new Float32Array(vertexCount);
        const segmentIds = new Float32Array(vertexCount);

        let idx = 0;
        this.connections.forEach((conn, connIdx) => {
            const start = this.nodes[conn.a];
            const end = this.nodes[conn.b];

            for (let s = 0; s < segmentsPerLine; s++) {
                const t0 = s / segmentsPerLine;
                const t1 = (s + 1) / segmentsPerLine;

                // Vertex 0
                positions[idx * 3] = start.x + (end.x - start.x) * t0;
                positions[idx * 3 + 1] = start.y + (end.y - start.y) * t0;
                positions[idx * 3 + 2] = start.z + (end.z - start.z) * t0;

                nextPositions[idx * 3] = start.x + (end.x - start.x) * t1;
                nextPositions[idx * 3 + 1] = start.y + (end.y - start.y) * t1;
                nextPositions[idx * 3 + 2] = start.z + (end.z - start.z) * t1;

                lineIds[idx] = connIdx;
                segmentIds[idx] = s;
                idx++;

                // Vertex 1 (same positions for line strip)
                positions[idx * 3] = start.x + (end.x - start.x) * t1;
                positions[idx * 3 + 1] = start.y + (end.y - start.y) * t1;
                positions[idx * 3 + 2] = start.z + (end.z - start.z) * t1;

                nextPositions[idx * 3] = start.x + (end.x - start.x) * t1;
                nextPositions[idx * 3 + 1] = start.y + (end.y - start.y) * t1;
                nextPositions[idx * 3 + 2] = start.z + (end.z - start.z) * t1;

                lineIds[idx] = connIdx;
                segmentIds[idx] = s;
                idx++;
            }
        });

        this.lineGeometry = new THREE.BufferGeometry();
        this.lineGeometry.setAttribute('aPosition', new THREE.BufferAttribute(positions, 3));
        this.lineGeometry.setAttribute('aNextPosition', new THREE.BufferAttribute(nextPositions, 3));
        this.lineGeometry.setAttribute('aLineId', new THREE.BufferAttribute(lineIds, 1));
        this.lineGeometry.setAttribute('aSegmentId', new THREE.BufferAttribute(segmentIds, 1));

        this.lineMesh = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    }

    createCore() {
        const coreGeometry = new THREE.IcosahedronGeometry(1.15, 1);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: this.lineColor,
            wireframe: true,
            transparent: true,
            opacity: 0.85,
            depthWrite: false
        });
        this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    }

    setColors(lineColor, accentColor) {
        this.lineColor.copy(lineColor);
        this.accentColor.copy(accentColor);

        if (this.lineMaterial) {
            this.lineMaterial.uniforms.uLineColor.value.copy(lineColor);
            this.lineMaterial.uniforms.uAccentColor.value.copy(accentColor);
        }

        if (this.coreMesh) {
            this.coreMesh.material.color.copy(lineColor);
        }
    }

    setLineWidth(width) {
        this.lineWidth = width;
        if (this.lineMaterial) {
            this.lineMaterial.uniforms.uLineWidth.value = width;
        }
    }

    setOpacity(opacity) {
        if (this.lineMaterial) {
            this.lineMaterial.uniforms.uOpacity.value = opacity;
        }

        if (this.coreMesh) {
            this.coreMesh.material.opacity = opacity * 0.85 / 0.45;
        }
    }

    setFlowSpeed(speed) {
        this.flowSpeed = speed;
    }

    update(deltaTime, time) {
        if (!this.enabled || !this.initialized) return;

        this.time = time;
        this.lineMaterial.uniforms.uTime.value = time * this.flowSpeed;

        // Slow core rotation
        if (this.coreMesh) {
            this.coreMesh.rotation.y = -time * 0.25;
        }
    }

    render(camera) {
        if (!this.enabled || !this.initialized) return;

        this.renderer.render(this.lineMesh, camera);
        this.renderer.render(this.coreMesh, camera);
    }

    getGroup() {
        const group = new THREE.Group();
        group.add(this.lineMesh);
        group.add(this.coreMesh);
        return group;
    }

    getLineMesh() {
        return this.lineMesh;
    }

    getCoreMesh() {
        return this.coreMesh;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    dispose() {
        this.lineGeometry?.dispose();
        this.lineMaterial?.dispose();
        this.coreMesh?.geometry?.dispose();
        this.coreMesh?.material?.dispose();
    }
}