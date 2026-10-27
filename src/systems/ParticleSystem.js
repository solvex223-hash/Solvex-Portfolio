// Constellation background: soft glowing nodes joined by thin lines, plus slow violet/orange glow orbs.
// Drop-in replacement for the old particle system (same methods the app calls).
import * as THREE from 'three';

export class ParticleSystem {
    constructor(options = {}) {
        this.options = options;
        this.enabled = true;
        this.nodeCount = Math.max(40, Math.min(130, Math.round((options.count || 15000) / 380)));
        this.linkDist = 2.3;
        this.maxLinks = 900;
        this.renderUniforms = { uPositions: { value: null }, uVelocities: { value: null } };
        this.renderMesh = new THREE.Group();
        this._t = -1; this.mx = 0; this.my = 0;
    }

    async init() {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r; g.fillRect(0, 0, 64, 64);
        this.glow = new THREE.CanvasTexture(c);

        const blank = new THREE.DataTexture(new Float32Array([0, 0, 0, 1]), 1, 1, THREE.RGBAFormat, THREE.FloatType);
        blank.needsUpdate = true;
        this.renderUniforms.uPositions.value = this.renderUniforms.uVelocities.value = blank;

        const n = this.nodeCount, violet = new THREE.Color(0xA78BFA), orange = new THREE.Color(0xFF9A5A);
        this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3);
        this.nodeCol = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            const th = Math.random() * 6.2832, ph = Math.acos(2 * Math.random() - 1), rad = 2 + Math.random() * 5;
            this.pos.set([rad * Math.sin(ph) * Math.cos(th), rad * Math.sin(ph) * Math.sin(th), rad * Math.cos(ph)], i * 3);
            this.vel.set([(Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18], i * 3);
            (Math.random() < 0.2 ? orange : violet).toArray(this.nodeCol, i * 3);
        }

        this.pointGeo = new THREE.BufferGeometry();
        this.pointGeo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
        this.pointGeo.setAttribute('color', new THREE.BufferAttribute(this.nodeCol, 3));
        this.points = new THREE.Points(this.pointGeo, new THREE.PointsMaterial({
            map: this.glow, size: 0.32, sizeAttenuation: true, vertexColors: true, transparent: true,
            opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        this.points.frustumCulled = false;

        this.linePos = new Float32Array(this.maxLinks * 6); this.lineCol = new Float32Array(this.maxLinks * 6);
        this.lineGeo = new THREE.BufferGeometry();
        this.lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3).setUsage(THREE.DynamicDrawUsage));
        this.lineGeo.setAttribute('color', new THREE.BufferAttribute(this.lineCol, 3).setUsage(THREE.DynamicDrawUsage));
        this.lines = new THREE.LineSegments(this.lineGeo, new THREE.LineBasicMaterial({
            vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        this.lines.frustumCulled = false;

        // Big soft glow orbs behind everything
        this.orbs = [[0x7C4DFF, 12, -5, 2, -4], [0xFF7A45, 9, 5, -3, -5], [0x7C4DFF, 14, 0, -5, -7]].map(([hex, s, x, y, z]) => {
            const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: hex, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false }));
            o.scale.set(s, s, 1); o.position.set(x, y, z); o.userData.base = o.position.clone();
            this.renderMesh.add(o); return o;
        });
        this.renderMesh.add(this.lines, this.points);

        this._pm = (e) => { this.mx = e.clientX / innerWidth - 0.5; this.my = e.clientY / innerHeight - 0.5; };
        window.addEventListener('pointermove', this._pm, { passive: true });
        return this;
    }

    update(deltaTime, time) {
        if (!this.enabled || !this.pos || time === this._t) return;
        this._t = time;
        const dt = Math.min(deltaTime || 0.016, 0.05), n = this.nodeCount, p = this.pos, v = this.vel;
        for (let i = 0; i < n * 3; i += 3) {
            p[i] += v[i] * dt; p[i + 1] += v[i + 1] * dt; p[i + 2] += v[i + 2] * dt;
            if (p[i] * p[i] + p[i + 1] * p[i + 1] + p[i + 2] * p[i + 2] > 49) { v[i] *= -1; v[i + 1] *= -1; v[i + 2] *= -1; }
        }
        let k = 0; const D = this.linkDist, D2 = D * D, lp = this.linePos, lc = this.lineCol, nc = this.nodeCol;
        for (let a = 0; a < n && k < this.maxLinks; a++) {
            for (let b = a + 1; b < n && k < this.maxLinks; b++) {
                const dx = p[a * 3] - p[b * 3], dy = p[a * 3 + 1] - p[b * 3 + 1], dz = p[a * 3 + 2] - p[b * 3 + 2];
                const d2 = dx * dx + dy * dy + dz * dz;
                if (d2 > D2) continue;
                const f = (1 - Math.sqrt(d2) / D) * 0.9;
                for (let j = 0; j < 3; j++) {
                    lp[k * 6 + j] = p[a * 3 + j]; lp[k * 6 + 3 + j] = p[b * 3 + j];
                    lc[k * 6 + j] = nc[a * 3 + j] * f; lc[k * 6 + 3 + j] = nc[b * 3 + j] * f;
                }
                k++;
            }
        }
        this.lineGeo.setDrawRange(0, k * 2);
        this.lineGeo.attributes.position.needsUpdate = true; this.lineGeo.attributes.color.needsUpdate = true;
        this.pointGeo.attributes.position.needsUpdate = true;
        this.orbs.forEach((o, i) => {
            o.position.x = o.userData.base.x + Math.sin(time * 0.1 + i * 2) * 1.5;
            o.position.y = o.userData.base.y + Math.cos(time * 0.08 + i * 3) * 1.2;
        });
        const g = this.renderMesh;
        g.rotation.y += ((time * 0.02 + this.mx * 0.3) - g.rotation.y) * 0.04;
        g.rotation.x += (this.my * 0.2 - g.rotation.x) * 0.04;
    }

    // Methods the rest of the app may call (kept so nothing breaks)
    setAttractor() {} setCurlStrength() {} setSpeed() {} setGravity() {} setSize() {} setOpacity() {} setPixelRatio() {} setCount() {}
    render() {}
    getMesh() { return this.renderMesh; }
    setEnabled(e) { this.enabled = e; this.renderMesh.visible = e; }

    dispose() {
        window.removeEventListener('pointermove', this._pm);
        this.pointGeo?.dispose(); this.lineGeo?.dispose(); this.glow?.dispose();
        this.points?.material.dispose(); this.lines?.material.dispose();
        this.orbs?.forEach((o) => o.material.dispose());
    }
}