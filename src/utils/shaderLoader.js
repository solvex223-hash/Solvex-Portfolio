// Shader Loader Utility - Inline shaders for reliability

import * as THREE from 'three';

// Particle Simulation Shader
export const particleSimulationShader = `
// GPGPU Particle Simulation Shader
precision highp float;

uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uTime;
uniform float uDeltaTime;
uniform vec2 uResolution;
uniform vec3 uAttractorPos;
uniform float uAttractorStrength;
uniform float uCurlStrength;
uniform float uDissipation;
uniform vec3 uGravity;
uniform float uSpeed;
uniform float uMode; // 0 = write position, 1 = write velocity

varying vec2 vUv;

vec3 curlNoise(vec3 p) {
    // smooth, divergence-free swirl field
    float t = uTime * 0.25;
    return vec3(
        sin(p.y * 1.7 + t) + cos(p.z * 1.3 - t * 0.7),
        sin(p.z * 1.9 + t * 0.8) + cos(p.x * 1.5 + t),
        sin(p.x * 1.1 - t * 0.6) + cos(p.y * 1.4 + t * 0.9)
    );
}

void main() {
    vec2 uv = vUv;
    vec4 posData = texture2D(uPositions, uv);
    vec4 velData = texture2D(uVelocities, uv);

    vec3 pos = posData.xyz;
    vec3 vel = velData.xyz;
    float life = posData.w;
    float age = velData.w;

    age += uDeltaTime * 0.12; // about 8 second lifetime

    if (life <= 0.0 || age > 1.0) {
        float theta = fract(sin(dot(uv + uTime, vec2(12.9898, 78.233))) * 43758.5453) * 6.283185;
        float phi = acos(2.0 * fract(sin(dot(uv * 2.0 + uTime, vec2(39.346, 11.135))) * 43758.5453) - 1.0);
        float radius = 2.0 + fract(sin(dot(uv * 3.0, vec2(44.123, 22.456))) * 43758.5453) * 3.0;

        pos = vec3(
            radius * sin(phi) * cos(theta),
            radius * sin(phi) * sin(theta),
            radius * cos(phi)
        );

        vel = vec3(0.0);
        life = 1.0;
        age = 0.0;
    }

    vec3 noisePos = pos * 0.5 + uTime * 0.1;
    vec3 curl = curlNoise(noisePos) * uCurlStrength;

    vec3 toAttractor = uAttractorPos - pos;
    float distToAttractor = length(toAttractor);
    vec3 attractorForce = (toAttractor / max(distToAttractor, 0.001)) * uAttractorStrength / max(distToAttractor * distToAttractor, 0.1);

    vec3 gravityForce = uGravity;

    vel *= (1.0 - (uDissipation + 1.2) * uDeltaTime);
    vel -= pos * 0.15 * uDeltaTime; // gentle pull keeps the cloud together

    vel += (curl + attractorForce + gravityForce) * uDeltaTime * uSpeed;

    float maxVel = 8.0;
    float velLen = length(vel);
    if (velLen > maxVel) {
        vel = normalize(vel) * maxVel;
    }

    pos += vel * uDeltaTime;

    life = 1.0 - smoothstep(0.0, 1.0, age);

    gl_FragColor = (uMode < 0.5) ? vec4(pos, life) : vec4(vel, age);
}
`;

// Particle Render Vertex Shader - NO Three.js built-in uniforms (they're auto-injected)
export const particleRenderVertShader = `
precision highp float;

uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;

attribute vec2 aUv;
attribute float aParticleId;

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

    vec3 pos = posData.xyz;
    vec3 velocity = velData.xyz;
    float age = velData.w;

    vLife = smoothstep(0.0, 0.1, age) * (1.0 - smoothstep(0.85, 1.0, age));
    vSpeed = clamp(length(velocity) / 3.0, 0.0, 1.0);

    vec3 colorSlow = vec3(0.55, 0.42, 1.0); // violet
    vec3 colorFast = vec3(1.0, 0.71, 0.28); // amber
    float idHash = hash(aParticleId * 17.0);
    vColor = mix(colorSlow, colorFast, clamp(vSpeed * 0.8 + step(0.92, idHash) * 0.6, 0.0, 1.0));

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float size = uSize * uPixelRatio * (300.0 / max(-mvPosition.z, 1.0)) * (0.7 + vSpeed * 0.6);
    vSize = size;
    gl_PointSize = clamp(size, 1.5, 14.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const particleRenderFragShader = `
precision highp float;

uniform float uTime;
uniform float uOpacity;

varying vec2 vUv;
varying float vLife;
varying float vSpeed;
varying vec3 vColor;
varying float vSize;

void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center) * 2.0;

    float alpha = 1.0 - smoothstep(0.0, 1.0, dist);
    alpha *= 0.8 + 0.2 * sin(uTime * 3.0 + vUv.x * 100.0);
    alpha *= vLife;

    float glow = vSpeed * (1.0 - dist) * 0.5;
    alpha += glow;

    vec3 color = vColor;
    color += vec3(glow * 0.5, glow * 0.2, glow * 0.05);

    gl_FragColor = vec4(color, alpha * uOpacity);

    if (gl_FragColor.a < 0.01) discard;
}
`;

// Line Vertex Shader - NO Three.js built-in uniforms
export const lineVertShader = `
precision highp float;

uniform float uTime;
uniform float uLineWidth;

attribute vec3 aPosition;
attribute vec3 aNextPosition;
attribute float aLineId;
attribute float aSegmentId;

varying float vLineId;
varying float vSegmentId;
varying float vProgress;

void main() {
    vLineId = aLineId;
    vSegmentId = aSegmentId;

    float linePhase = fract(sin(aLineId * 17.3) * 43758.5453);
    float drawProgress = smoothstep(0.0, 1.0, fract(uTime * 0.3 + linePhase) - aSegmentId * 0.1);
    vProgress = drawProgress;

    vec3 pos = mix(aPosition, aNextPosition, drawProgress);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

// Line Fragment Shader
export const lineFragShader = `
precision highp float;

uniform vec3 uLineColor;
uniform vec3 uAccentColor;
uniform float uTime;
uniform float uOpacity;

varying float vLineId;
varying float vSegmentId;
varying float vProgress;

void main() {
    float alpha = vProgress * uOpacity;

    float pulse = sin(uTime * 4.0 + vLineId * 3.0) * 0.5 + 0.5;
    alpha *= 0.6 + 0.4 * pulse;

    float colorMix = fract(vSegmentId * 0.3 + uTime * 0.1);
    vec3 color = mix(uLineColor, uAccentColor, colorMix * 0.3);

    float edgeGlow = smoothstep(0.95, 1.0, vProgress) * (1.0 - vProgress) * 10.0;
    alpha += edgeGlow * 0.5;
    color += uAccentColor * edgeGlow * 0.3;

    gl_FragColor = vec4(color, alpha);

    if (gl_FragColor.a < 0.01) discard;
}
`;

// Card Fragment Shader
export const cardFragShader = `
precision highp float;

uniform float uTime;
uniform float uHoverProgress;
uniform float uLiftProgress;
uniform vec3 uPaletteColor1;
uniform vec3 uPaletteColor2;
uniform vec3 uPaletteColor3;
uniform vec2 uMouse;
uniform vec2 uResolution;

varying vec2 vUv;

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453),
            fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453), f.x),
        mix(fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453),
            fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 center = vUv - 0.5;

    float cardTex = fbm(center * 10.0 + uTime * 0.02) * 0.02;
    vec3 baseColor = vec3(0.07, 0.12, 0.23) + vec3(cardTex);

    float parallaxX = uMouse.x * uLiftProgress * 0.02;
    float parallaxY = uMouse.y * uLiftProgress * 0.02;

    float edgeHighlight = 0.0;
    edgeHighlight += smoothstep(0.48, 0.5, abs(center.x + parallaxX)) * (1.0 - abs(center.y + parallaxY) * 2.0);
    edgeHighlight += smoothstep(0.48, 0.5, abs(center.y + parallaxY)) * (1.0 - abs(center.x + parallaxX) * 2.0);
    edgeHighlight *= uLiftProgress * 0.3;

    float aura = 0.0;
    if (uHoverProgress > 0.0) {
        float dist = length(center * vec2(1.0, uResolution.y / uResolution.x));
        aura = (1.0 - smoothstep(0.55, 0.75, dist)) * uHoverProgress;
        aura *= 0.5 + 0.5 * sin(uTime * 2.0 + dist * 10.0);

        float paletteIdx = fract(dist * 5.0 + uTime * 0.5);
        vec3 auraColor = mix(uPaletteColor1, uPaletteColor2, paletteIdx);
        auraColor = mix(auraColor, uPaletteColor3, smoothstep(0.5, 1.0, paletteIdx));

        baseColor += auraColor * aura * 0.5;
    }

    float topLight = smoothstep(0.45, 0.5, -(center.y + parallaxY)) * uLiftProgress * 0.15;
    baseColor += vec3(topLight);

    float bottomShadow = smoothstep(-0.5, -0.45, center.y + parallaxY) * uLiftProgress * 0.2;
    baseColor -= vec3(bottomShadow);

    baseColor += vec3(edgeHighlight) * uPaletteColor3;

    float cornerVignette = 1.0 - smoothstep(0.4, 0.55, length(center * 1.1));
    baseColor *= cornerVignette + (1.0 - cornerVignette) * 0.8;

    gl_FragColor = vec4(baseColor, 1.0);
}
`;

// Export all shaders
export const Shaders = {
    particle: {
        simulation: particleSimulationShader,
        renderVert: particleRenderVertShader,
        renderFrag: particleRenderFragShader
    },
    line: {
        vert: lineVertShader,
        frag: lineFragShader
    },
    ui: {
        card: cardFragShader
    }
};

export function createShaderMaterial(vertexShader, fragmentShader, uniforms = {}) {
    return {
        vertexShader,
        fragmentShader,
        uniforms: Object.entries(uniforms).reduce((acc, [key, value]) => {
            acc[key] = { value };
            return acc;
        }, {}),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    };
}

export const UniformTypes = {
    float: (value) => ({ value }),
    vec2: (value) => ({ value: new THREE.Vector2().copy(value) }),
    vec3: (value) => ({ value: new THREE.Vector3().copy(value) }),
    vec4: (value) => ({ value: new THREE.Vector4().copy(value) }),
    color: (value) => ({ value: new THREE.Color(value) }),
    texture: (value) => ({ value }),
    int: (value) => ({ value }),
    bool: (value) => ({ value }),
    matrix4: (value) => ({ value: new THREE.Matrix4().copy(value) })
};