// Glass cube hero: a rotatable glass cuboid refracting a huge SOLVEX headline.
// Scrolling magnifies the cube until you fall through it into the particle scene behind.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glassVS, glassFS } from '../shaders/glassShader.js';

export function initGlassHero() {
    const cv = document.getElementById('scene');
    const ui = document.getElementById('heroUI');
    if (!cv) return null;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let r;
    try {
        r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
    } catch (e) {
        document.documentElement.classList.add('nogl');
        return null;
    }
    r.setClearColor(0x000000);
    r.outputColorSpace = THREE.SRGBColorSpace;

    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    cam.position.set(0, 0, 10);
    const scene = new THREE.Scene();
    const bgScene = new THREE.Scene();

    // Headline is drawn on a 2D canvas so the glass can refract it
    const hc = document.createElement('canvas');
    const bgTex = new THREE.CanvasTexture(hc);
    bgTex.colorSpace = THREE.SRGBColorSpace;
    bgTex.minFilter = bgTex.magFilter = THREE.LinearFilter;
    bgTex.generateMipmaps = false;

    const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
            uniforms: { uTex: { value: bgTex } },
            depthTest: false,
            depthWrite: false,
            vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
            fragmentShader: 'uniform sampler2D uTex;varying vec2 vUv;void main(){gl_FragColor=texture2D(uTex,vUv);\n#include <colorspace_fragment>\n}'
        })
    );
    quad.frustumCulled = false;
    bgScene.add(quad);

    const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    const rtBack = new THREE.WebGLRenderTarget(4, 4, rtOpts);
    const rtFront = new THREE.WebGLRenderTarget(4, 4, rtOpts);
    const res = new THREE.Vector2(1, 1);

    const mk = (back) => new THREE.ShaderMaterial({
        vertexShader: glassVS,
        fragmentShader: glassFS,
        side: back ? THREE.BackSide : THREE.FrontSide,
        uniforms: {
            uTexture: { value: null }, uResolution: { value: res },
            uIorR: { value: 1.15 }, uIorY: { value: 1.16 }, uIorG: { value: 1.18 },
            uIorC: { value: 1.22 }, uIorB: { value: 1.22 }, uIorP: { value: 1.22 },
            uRefractPower: { value: back ? 0.22 : 0.3 }, uChromatic: { value: 0.5 },
            uSaturation: { value: 1.08 }, uShininess: { value: 90 }, uDiffuseness: { value: 0.02 },
            uFresnelPower: { value: 5 }, uLight: { value: new THREE.Vector3(-1, 1, 1) },
            uBackside: { value: back ? 1 : 0 }
        }
    });
    const backMat = mk(true);
    const frontMat = mk(false);
    backMat.uniforms.uTexture.value = rtBack.texture;
    frontMat.uniforms.uTexture.value = rtFront.texture;

    const cube = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 8, 0.12), frontMat);
    const pivot = new THREE.Group();
    const spin = new THREE.Group();
    spin.add(cube);
    pivot.add(spin);
    scene.add(pivot);
    spin.rotation.set(-0.42, 0.62, 0.18);

    let W = 1, H = 1, base = 1, ready = false;
    const mobile = () => W < 768 || W / H < 1;

    function draw() {
        const m = mobile();
        hc.width = W * DPR;
        hc.height = H * DPR;
        const x = hc.getContext('2d');
        x.scale(DPR, DPR);
        x.fillStyle = '#000';
        x.fillRect(0, 0, W, H);
        x.font = '800 100px Poppins, sans-serif';
        const w100 = x.measureText('SOLVEX').width;
        const fs = Math.min(H * (m ? 0.3 : 0.5), 100 * W * (m ? 0.9 : 0.64) / w100);
        x.font = `800 ${fs}px Poppins, sans-serif`;
        x.fillStyle = '#e9e9e9';
        x.textAlign = 'center';
        x.textBaseline = 'alphabetic';
        x.fillText('SOLVEX', W * (m ? 0.5 : 0.505), H * (m ? 0.45 : 0.468) + fs * 0.35);
        bgTex.needsUpdate = true;
    }

    function layout() {
        W = window.innerWidth;
        H = window.innerHeight;
        r.setPixelRatio(DPR);
        r.setSize(W, H, false);
        cam.aspect = W / H;
        cam.updateProjectionMatrix();
        const db = r.getDrawingBufferSize(new THREE.Vector2());
        rtBack.setSize(db.x, db.y);
        rtFront.setSize(db.x, db.y);
        res.copy(db);
        const m = mobile();
        const visH = 2 * Math.tan(THREE.MathUtils.degToRad(15)) * 10;
        const visW = visH * cam.aspect;
        const sx = m ? 0.5 : 0.517, sy = m ? 0.45 : 0.488;
        pivot.position.set((sx - 0.5) * visW, (0.5 - sy) * visH, 0);
        const px = Math.min(H * 0.44, W * (m ? 0.45 : 0.29));
        base = (px / H) * visH;
        draw();
    }
    window.addEventListener('resize', layout);
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => { if (W > 1) draw(); });

    // Drag to rotate, with inertia and idle drift
    const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
    const rot = (dx, dy) => {
        q.setFromAxisAngle(AY, dx); spin.quaternion.premultiply(q);
        q.setFromAxisAngle(AX, dy); spin.quaternion.premultiply(q);
    };
    let drag = false, lx = 0, ly = 0, vx = 0, vy = 0, tgt = 0, lastUp = -9, blend = 0, lastCm = 1;
    cv.addEventListener('pointerdown', (e) => {
        drag = true; lx = e.clientX; ly = e.clientY; vx = vy = 0; tgt = 0;
        cv.setPointerCapture(e.pointerId); cv.classList.add('dragging');
    });
    cv.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = (e.clientX - lx) * 0.008, dy = (e.clientY - ly) * 0.008;
        rot(dx, dy); vx = dx; vy = dy; lx = e.clientX; ly = e.clientY;
    });
    const up = () => { if (!drag) return; drag = false; lastUp = performance.now() / 1000; cv.classList.remove('dragging'); };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    document.getElementById('gPrev')?.addEventListener('click', () => { vx = vy = 0; tgt -= Math.PI / 2; });
    document.getElementById('gNext')?.addEventListener('click', () => { vx = vy = 0; tgt += Math.PI / 2; });
    document.getElementById('gExplore')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: window.innerHeight * 1.05, behavior: 'smooth' });
    });
    document.querySelectorAll('.g-dot').forEach((d) => d.addEventListener('click', () => {
        document.querySelectorAll('.g-dot').forEach((x) => x.classList.remove('active'));
        d.classList.add('active');
    }));

    function render() {
        r.setRenderTarget(rtBack); r.autoClear = true; r.render(bgScene, cam);
        r.setRenderTarget(rtFront); r.autoClear = true; r.render(bgScene, cam);
        r.autoClear = false; cube.material = backMat; r.render(scene, cam);
        r.setRenderTarget(null); r.autoClear = true; r.render(bgScene, cam);
        r.autoClear = false; r.clearDepth(); cube.material = frontMat; r.render(scene, cam);
        r.autoClear = true;
    }

    const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    let last = performance.now(), t0 = last, raf = 0;
    // Wait for the opening screen to fade before the cube swells in
    let revealed = !document.getElementById('preloader');
    window.addEventListener('solvex:reveal', () => { revealed = true; t0 = performance.now(); });

    function frame(now) {
        raf = requestAnimationFrame(frame);
        if (!ready) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        // Scroll drives the fall-through: the cube swells, then the whole hero fades away
        const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.95)));
        cv.style.opacity = String(1 - smooth((p - 0.5) / 0.5));
        const gone = p >= 1;
        cv.style.visibility = gone ? 'hidden' : 'visible';
        if (ui) {
            ui.style.opacity = String(Math.max(0, 1 - p * 3));
            ui.style.visibility = p > 0.34 ? 'hidden' : 'visible';
        }
        if (gone) return;

        const f = dt * 60;
        const intro = reduce ? 1 : (revealed ? Math.min(1, (now - t0) / 1900) : 0);
        const e = 1 - Math.pow(1 - intro, 3);
        const cm = 1 + p * p * 4.5;
        pivot.scale.setScalar(Math.max(0.001, base * e * cm));
        const dc = cm - lastCm; lastCm = cm;
        if (dc) rot(dc * 0.9, dc * 0.35);
        if (intro < 1) rot((1 - intro) * 0.09 * f, 0);

        if (!drag) {
            if (Math.abs(tgt) > 0.0005) {
                const s = tgt * Math.min(1, 0.09 * f); rot(s, 0); tgt -= s;
            } else {
                rot(vx * f, vy * f);
                vx *= Math.pow(0.94, f); vy *= Math.pow(0.94, f);
            }
            if (!reduce && now / 1000 - lastUp > 0.6) {
                blend = Math.min(1, blend + dt);
                rot(0.0035 * f * blend, 0.0012 * f * blend);
            }
        } else blend = 0;

        render();
    }

    const fontsReady = Promise.race([
        Promise.all([document.fonts.load('800 100px Poppins'), document.fonts.ready]),
        new Promise((res2) => setTimeout(res2, 2500))
    ]);
    fontsReady.then(() => {
        layout();
        ready = true;
        t0 = last = performance.now();
        document.documentElement.classList.add('glass-ready');
    });
    raf = requestAnimationFrame(frame);

    return {
        dispose() {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', layout);
            r.dispose();
        }
    };
}