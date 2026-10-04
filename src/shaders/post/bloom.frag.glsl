// Bloom Extract Fragment Shader

precision highp float;

uniform sampler2D uTexture;
uniform float uThreshold;
uniform float uKnee;

varying vec2 vUv;

void main() {
    vec4 color = texture2D(uTexture, vUv);

    // Soft knee threshold (Unreal-style)
    vec3 brightness = color.rgb;
    float maxComp = max(max(brightness.r, brightness.g), brightness.b);
    float knee = uThreshold * uKnee;
    vec3 bloom = clamp((brightness - uThreshold + knee) / (2.0 * knee), 0.0, 1.0);
    bloom = bloom * bloom * (3.0 - 2.0 * bloom); // smoothstep
    bloom = brightness * bloom / max(maxComp, 0.0001);

    gl_FragColor = vec4(bloom, 1.0);
}