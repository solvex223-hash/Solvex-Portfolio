// Particle Render Vertex Shader

precision highp float;

uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;
uniform vec3 uCameraPosition;

attribute vec2 uv;
attribute float particleId;

varying vec2 vUv;
varying float vLife;
varying float vSpeed;
varying vec3 vColor;
varying float vSize;

// Hash function for deterministic randomness per particle
float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

vec3 hash3(vec3 p) {
    return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)),
                          dot(p, vec3(269.5, 183.3, 246.1)),
                          dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
}

void main() {
    vUv = uv;

    // Read particle data from textures
    vec4 posData = texture2D(uPositions, uv);
    vec4 velData = texture2D(uVelocities, uv);

    vec3 position = posData.xyz;
    vec3 velocity = velData.xyz;
    float life = posData.w;
    float age = velData.w;

    vLife = life;
    vSpeed = length(velocity) / 8.0; // normalized

    // Color by speed and life
    vec3 colorSlow = vec3(0.9, 0.35, 0.12);  // accent orange
    vec3 colorFast = vec3(1.0, 0.6, 0.25);   // bright orange
    vec3 colorLine = vec3(0.07, 0.12, 0.23); // dark ink

    // Mix based on particleId for variety
    float idHash = hash(particleId * 17.0);
    vec3 baseColor = mix(colorLine, colorSlow, idHash * 0.5 + 0.5);
    vColor = mix(baseColor, colorFast, vSpeed * 0.5);

    // Size based on life, speed, and distance
    float dist = length(position - uCameraPosition);
    float sizeAtten = 1.0 / max(dist * 0.3, 1.0);
    float lifeSize = smoothstep(0.0, 0.2, life) * smoothstep(1.0, 0.8, life);
    vSize = uSize * sizeAtten * lifeSize * (0.5 + vSpeed * 0.5) * uPixelRatio;

    // Add slight wobble based on velocity
    position += normalize(velocity + vec3(0.001)) * sin(uTime * 10.0 + particleId) * 0.01 * vSpeed;

    vec4 mvPosition = uModelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(vSize, 1.0);
    gl_Position = uProjectionMatrix * mvPosition;
}