// GPGPU Particle Simulation Shader
// Ping-pong between two render targets for position/velocity

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

varying vec2 vUv;

// Curl noise for organic motion
vec3 curlNoise(vec3 p) {
    const vec3 h = vec3(0.1, 0.0, 0.0);
    vec3 p0 = p;
    vec3 p1 = p + h.xyy;
    vec3 p2 = p + h.yxy;
    vec3 p3 = p + h.yyx;

    p0 = fract(p0 * 0.5) * 2.0 - 1.0;
    p1 = fract(p1 * 0.5) * 2.0 - 1.0;
    p2 = fract(p2 * 0.5) * 2.0 - 1.0;
    p3 = fract(p3 * 0.5) * 2.0 - 1.0;

    vec4 gradient = vec4(
        dot(p0, vec3(12.9898, 78.233, 53.539)),
        dot(p1, vec3(12.9898, 78.233, 53.539)),
        dot(p2, vec3(12.9898, 78.233, 53.539)),
        dot(p3, vec3(12.9898, 78.233, 53.539))
    );

    gradient = fract(gradient * 43758.5453) * 2.0 - 1.0;

    return vec3(
        gradient.y - gradient.x,
        gradient.z - gradient.x,
        gradient.w - gradient.x
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

    // Update age
    age += uDeltaTime;

    // Respawn dead particles
    if (life <= 0.0 || age > 1.0) {
        // Random spherical spawn
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

    // Curl noise force
    vec3 noisePos = pos * 0.5 + uTime * 0.1;
    vec3 curl = curlNoise(noisePos) * uCurlStrength;

    // Attractor force (mouse, scroll target, etc.)
    vec3 toAttractor = uAttractorPos - pos;
    float distToAttractor = length(toAttractor);
    vec3 attractorForce = normalize(toAttractor) * uAttractorStrength / max(distToAttractor * distToAttractor, 0.1);

    // Gravity
    vec3 gravityForce = uGravity;

    // Damping
    vel *= (1.0 - uDissipation * uDeltaTime);

    // Apply forces
    vel += (curl + attractorForce + gravityForce) * uDeltaTime * uSpeed;

    // Limit velocity
    float maxVel = 8.0;
    float velLen = length(vel);
    if (velLen > maxVel) {
        vel = normalize(vel) * maxVel;
    }

    // Update position
    pos += vel * uDeltaTime;

    // Fade life based on age
    life = 1.0 - smoothstep(0.0, 1.0, age);

    // Write to velocity texture (w = age)
    gl_FragColor = vec4(vel, age);
}