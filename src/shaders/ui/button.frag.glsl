// Button Shader - Interactive glow/ripple effect

precision highp float;

uniform float uTime;
uniform float uProgress;      // 0-1 hover progress
uniform float uClickProgress; // 0-1 click ripple
uniform vec3 uBaseColor;
uniform vec3 uHoverColor;
uniform vec3 uGlowColor;
uniform vec2 uResolution;
uniform vec2 uMouse;

varying vec2 vUv;

// SDF rounded rect
float sdRoundedRect(vec2 p, vec2 size, float radius) {
    vec2 d = abs(p) - size + vec2(radius);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - radius;
}

void main() {
    vec2 center = vUv - 0.5;
    vec2 size = vec2(0.5, 0.15);
    float radius = 0.08;

    // Background shape
    float dist = sdRoundedRect(center * uResolution, size * uResolution, radius * uResolution.x);
    float alpha = 1.0 - smoothstep(-2.0, 2.0, dist);

    // Base color
    vec3 color = mix(uBaseColor, uHoverColor, uProgress);

    // Glow on hover
    float glowDist = sdRoundedRect(center * uResolution, (size + vec2(0.02)) * uResolution, (radius + 0.02) * uResolution.x);
    float glow = (1.0 - smoothstep(-4.0, 4.0, glowDist)) * uProgress * 0.5;
    color += uGlowColor * glow;

    // Click ripple
    if (uClickProgress > 0.0) {
        float rippleRadius = uClickProgress * 1.5;
        float rippleAlpha = (1.0 - uClickProgress) * 0.8;
        float rippleDist = length(center * uResolution - uMouse) - rippleRadius * 100.0;
        float ripple = smoothstep(-3.0, 3.0, -rippleDist) * rippleAlpha;
        color += uGlowColor * ripple;
    }

    // Subtle animated shimmer
    float shimmer = sin(uTime * 2.0 + center.x * 20.0) * 0.02 * uProgress;
    color += vec3(shimmer);

    gl_FragColor = vec4(color, alpha);
}