// Animated Line Network Fragment Shader

precision highp float;

uniform vec3 uLineColor;
uniform vec3 uAccentColor;
uniform float uTime;
uniform float uOpacity;

varying float vLineId;
varying float vSegmentId;
varying float vProgress;

void main() {
    // Base alpha from draw progress
    float alpha = vProgress * uOpacity;

    // Pulse effect on active segments
    float pulse = sin(uTime * 4.0 + vLineId * 3.0) * 0.5 + 0.5;
    alpha *= 0.6 + 0.4 * pulse;

    // Color transition along line
    float colorMix = fract(vSegmentId * 0.3 + uTime * 0.1);
    vec3 color = mix(uLineColor, uAccentColor, colorMix * 0.3);

    // Add highlight at leading edge
    float edgeGlow = smoothstep(0.95, 1.0, vProgress) * (1.0 - vProgress) * 10.0;
    alpha += edgeGlow * 0.5;
    color += uAccentColor * edgeGlow * 0.3;

    gl_FragColor = vec4(color, alpha);

    if (gl_FragColor.a < 0.01) discard;
}