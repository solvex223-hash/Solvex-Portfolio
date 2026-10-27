// Film Grain Fragment Shader

precision highp float;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uIntensity;
uniform float uSize;

varying vec2 vUv;

// Hash for noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Animated noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

// Film grain with temporal variation
float filmGrain(vec2 uv, float time) {
    // Multiple octaves for film-like structure
    float grain = 0.0;
    grain += noise(uv * 1.0 + time * 0.1) * 0.5;
    grain += noise(uv * 2.0 + time * 0.2) * 0.25;
    grain += noise(uv * 4.0 + time * 0.3) * 0.125;
    grain += noise(uv * 8.0 + time * 0.4) * 0.0625;
    return grain * 2.0 - 1.0; // -1 to 1
}

void main() {
    vec3 color = texture2D(uTexture, vUv).rgb;

    // Animated grain
    float grain = filmGrain(vUv * uSize, uTime);

    // Apply as luminance noise (more film-like than RGB)
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float grainLuma = grain * uIntensity * (0.5 + luminance * 0.5);

    color += vec3(grainLuma);

    // Subtle color grain in shadows
    float shadow = 1.0 - luminance;
    vec3 colorGrain = vec3(
        noise(vUv * uSize * 0.5 + uTime * 0.05),
        noise(vUv * uSize * 0.5 + uTime * 0.07),
        noise(vUv * uSize * 0.5 + uTime * 0.09)
    ) * 0.5 - 0.25;

    color += colorGrain * uIntensity * 0.3 * shadow;

    gl_FragColor = vec4(color, 1.0);
}