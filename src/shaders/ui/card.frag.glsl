// Case Study Card Shader - 3D depth parallax + particle aura

precision highp float;

uniform float uTime;
uniform float uHoverProgress;   // 0-1
uniform float uLiftProgress;    // 0-1 lift on hover
uniform vec3 uPaletteColor1;    // Project primary color
uniform vec3 uPaletteColor2;    // Project secondary color
uniform vec3 uPaletteColor3;    // Project accent color
uniform vec2 uMouse;            // Normalized -1 to 1
uniform vec2 uResolution;

varying vec2 vUv;

// Layered noise for card texture
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

    // Card background with subtle texture
    float cardTex = fbm(center * 10.0 + uTime * 0.02) * 0.02;
    vec3 baseColor = vec3(0.07, 0.12, 0.23) + vec3(cardTex); // dark ink

    // Parallax depth effect
    float parallaxX = uMouse.x * uLiftProgress * 0.02;
    float parallaxY = uMouse.y * uLiftProgress * 0.02;

    // Edge highlight (catching light)
    float edgeHighlight = 0.0;
    edgeHighlight += smoothstep(0.48, 0.5, abs(center.x + parallaxX)) * (1.0 - abs(center.y + parallaxY) * 2.0);
    edgeHighlight += smoothstep(0.48, 0.5, abs(center.y + parallaxY)) * (1.0 - abs(center.x + parallaxX) * 2.0);
    edgeHighlight *= uLiftProgress * 0.3;

    // Particle aura around card on hover
    float aura = 0.0;
    if (uHoverProgress > 0.0) {
        float dist = length(center * vec2(1.0, uResolution.y / uResolution.x));
        aura = (1.0 - smoothstep(0.55, 0.75, dist)) * uHoverProgress;

        // Animated pulse
        aura *= 0.5 + 0.5 * sin(uTime * 2.0 + dist * 10.0);

        // Color from palette
        float paletteIdx = fract(dist * 5.0 + uTime * 0.5);
        vec3 auraColor = mix(uPaletteColor1, uPaletteColor2, paletteIdx);
        auraColor = mix(auraColor, uPaletteColor3, smoothstep(0.5, 1.0, paletteIdx));

        baseColor += auraColor * aura * 0.5;
    }

    // Top edge highlight (simulated lighting)
    float topLight = smoothstep(0.45, 0.5, -(center.y + parallaxY)) * uLiftProgress * 0.15;
    baseColor += vec3(topLight);

    // Bottom shadow
    float bottomShadow = smoothstep(-0.5, -0.45, center.y + parallaxY) * uLiftProgress * 0.2;
    baseColor -= vec3(bottomShadow);

    // Combine edge highlight
    baseColor += vec3(edgeHighlight) * uPaletteColor3;

    // Vignette corners
    float cornerVignette = 1.0 - smoothstep(0.4, 0.55, length(center * 1.1));
    baseColor *= cornerVignette + (1.0 - cornerVignette) * 0.8;

    gl_FragColor = vec4(baseColor, 1.0);
}