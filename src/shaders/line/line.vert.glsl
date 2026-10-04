// Animated Line Network Vertex Shader

precision highp float;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;
uniform float uTime;
uniform float uLineWidth;

attribute vec3 position;
attribute vec3 nextPosition;
attribute float lineId;
attribute float segmentId;

varying float vLineId;
varying float vSegmentId;
varying float vProgress;

void main() {
    vLineId = lineId;
    vSegmentId = segmentId;

    // Animate line drawing progress
    float linePhase = fract(sin(lineId * 17.3) * 43758.5453);
    float drawProgress = smoothstep(0.0, 1.0, fract(uTime * 0.3 + linePhase) - segmentId * 0.1);
    vProgress = drawProgress;

    // Interpolate along line segment
    vec3 pos = mix(position, nextPosition, drawProgress);

    vec4 mvPosition = uModelViewMatrix * vec4(pos, 1.0);
    gl_Position = uProjectionMatrix * mvPosition;
}