// Particle Render Fragment Shader

precision highp float;

uniform float uTime;
uniform float uOpacity;

varying vec2 vUv;
varying float vLife;
varying float vSpeed;
varying vec3 vColor;
varying float vSize;

void main() {
    // Circular point with soft edge
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center) * 2.0;

    // Soft circular falloff
    float alpha = 1.0 - smoothstep(0.0, 1.0, dist);

    // Add subtle pulse
    alpha *= 0.8 + 0.2 * sin(uTime * 3.0 + vUv.x * 100.0);

    // Life fade
    alpha *= vLife;

    // Speed glow
    float glow = vSpeed * (1.0 - dist) * 0.5;
    alpha += glow;

    // Final color with additive glow
    vec3 color = vColor;
    color += vec3(glow * 0.5, glow * 0.2, glow * 0.05);

    gl_FragColor = vec4(color, alpha * uOpacity);

    // Discard fully transparent
    if (gl_FragColor.a < 0.01) discard;
}