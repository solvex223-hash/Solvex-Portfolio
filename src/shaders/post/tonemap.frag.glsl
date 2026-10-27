// ACES Filmic Tone Mapping + Color Grading

precision highp float;

uniform sampler2D uTexture;
uniform sampler2D uBloomTexture;
uniform float uExposure;
uniform float uBloomStrength;
uniform float uContrast;
uniform float uSaturation;
uniform float uTemperature;
uniform float uTint;
uniform bool uApplyBloom;

varying vec2 vUv;

// ACES approximation
vec3 acesFilm(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// sRGB to linear
vec3 srgbToLinear(vec3 c) {
    return pow(c, vec3(2.2));
}

// Linear to sRGB
vec3 linearToSrgb(vec3 c) {
    return pow(c, vec3(1.0 / 2.2));
}

// Color temperature adjustment
vec3 adjustTemperature(vec3 color, float temp) {
    // temp: -1.0 (cool) to 1.0 (warm)
    if (temp > 0.0) {
        return mix(color, color * vec3(1.2, 1.0, 0.8), temp * 0.3);
    } else {
        return mix(color, color * vec3(0.9, 0.95, 1.1), -temp * 0.2);
    }
}

// Tint adjustment
vec3 adjustTint(vec3 color, float tint) {
    // tint: -1.0 (green) to 1.0 (magenta)
    return mix(color, color * vec3(1.0 + tint * 0.1, 1.0, 1.0 - tint * 0.1), abs(tint) * 0.5);
}

// Contrast around middle gray
vec3 applyContrast(vec3 color, float contrast) {
    return mix(vec3(0.18), color, contrast);
}

// Saturation
vec3 applySaturation(vec3 color, float saturation) {
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luminance), color, saturation);
}

// Subtle vignette
float vignette(vec2 uv) {
    vec2 center = uv - 0.5;
    float dist = length(center * vec2(1.0, 1.0 / 1.0));
    return 1.0 - smoothstep(0.5, 1.2, dist) * 0.3;
}

void main() {
    vec3 color = texture2D(uTexture, vUv).rgb;

    // Add bloom
    if (uApplyBloom) {
        vec3 bloom = texture2D(uBloomTexture, vUv).rgb;
        color += bloom * uBloomStrength;
    }

    // Exposure
    color *= uExposure;

    // Tone mapping
    color = acesFilm(color);

    // Color grading
    color = applyContrast(color, uContrast);
    color = applySaturation(color, uSaturation);
    color = adjustTemperature(color, uTemperature);
    color = adjustTint(color, uTint);

    // Vignette
    color *= vignette(vUv);

    // Output sRGB
    gl_FragColor = vec4(linearToSrgb(color), 1.0);
}