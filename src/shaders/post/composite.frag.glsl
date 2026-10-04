// Final Composite Shader - combines tonemap, grain, vignette, FXAA

precision highp float;

uniform sampler2D uTexture;
uniform sampler2D uBloomTexture;
uniform float uTime;
uniform float uExposure;
uniform float uBloomStrength;
uniform float uContrast;
uniform float uSaturation;
uniform float uTemperature;
uniform float uTint;
uniform float uGrainIntensity;
uniform float uGrainSize;
uniform float uVignetteStrength;
uniform bool uApplyBloom;
uniform bool uApplyGrain;
uniform bool uApplyVignette;
uniform vec2 uResolution;

varying vec2 vUv;

// FXAA constants
#define FXAA_SPAN_MAX 8.0
#define FXAA_REDUCE_MUL 1.0/8.0
#define FXAA_REDUCE_MIN 1.0/128.0

// ACES approximation
vec3 acesFilm(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 linearToSrgb(vec3 c) {
    return pow(c, vec3(1.0 / 2.2));
}

vec3 adjustTemperature(vec3 color, float temp) {
    if (temp > 0.0) return mix(color, color * vec3(1.2, 1.0, 0.8), temp * 0.3);
    return mix(color, color * vec3(0.9, 0.95, 1.1), -temp * 0.2);
}

vec3 adjustTint(vec3 color, float tint) {
    return mix(color, color * vec3(1.0 + tint * 0.1, 1.0, 1.0 - tint * 0.1), abs(tint) * 0.5);
}

vec3 applyContrast(vec3 color, float contrast) {
    return mix(vec3(0.18), color, contrast);
}

vec3 applySaturation(vec3 color, float saturation) {
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luminance), color, saturation);
}

// Hash for grain
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

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

float filmGrain(vec2 uv, float time) {
    float grain = 0.0;
    grain += noise(uv * 1.0 + time * 0.1) * 0.5;
    grain += noise(uv * 2.0 + time * 0.2) * 0.25;
    grain += noise(uv * 4.0 + time * 0.3) * 0.125;
    grain += noise(uv * 8.0 + time * 0.4) * 0.0625;
    return grain * 2.0 - 1.0;
}

float vignette(vec2 uv, float strength) {
    vec2 center = uv - 0.5;
    float dist = length(center * vec2(1.0, uResolution.y / uResolution.x));
    return 1.0 - smoothstep(0.4, 1.3, dist) * strength;
}

// FXAA implementation
vec3 fxaa(sampler2D tex, vec2 uv, vec2 inverseResolution) {
    vec2 iResolution = inverseResolution;
    vec3 rgbNW = texture2D(tex, uv - iResolution).rgb;
    vec3 rgbNE = texture2D(tex, uv + vec2(iResolution.x, -iResolution.y)).rgb;
    vec3 rgbSW = texture2D(tex, uv + vec2(-iResolution.x, iResolution.y)).rgb;
    vec3 rgbSE = texture2D(tex, uv + iResolution).rgb;
    vec3 rgbM  = texture2D(tex, uv).rgb;

    vec3 luma = vec3(0.299, 0.587, 0.114);
    float lumaNW = dot(rgbNW, luma);
    float lumaNE = dot(rgbNE, luma);
    float lumaSW = dot(rgbSW, luma);
    float lumaSE = dot(rgbSE, luma);
    float lumaM  = dot(rgbM,  luma);

    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.25 * FXAA_REDUCE_MUL, FXAA_REDUCE_MIN);
    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * iResolution;

    vec3 rgbA = 0.5 * (texture2D(tex, uv + dir * (1.0/3.0 - 0.5)).rgb + texture2D(tex, uv + dir * (2.0/3.0 - 0.5)).rgb);
    vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tex, uv + dir * -0.5).rgb + texture2D(tex, uv + dir * 0.5).rgb);
    float lumaB = dot(rgbB, luma);

    if ((lumaB < lumaMin) || (lumaB > lumaMax)) return rgbA;
    return rgbB;
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
    if (uApplyVignette) {
        color *= vignette(vUv, uVignetteStrength);
    }

    // Film grain
    if (uApplyGrain) {
        float grain = filmGrain(vUv * uGrainSize, uTime);
        float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        float grainLuma = grain * uGrainIntensity * (0.5 + luminance * 0.5);
        color += vec3(grainLuma);

        float shadow = 1.0 - luminance;
        vec3 colorGrain = vec3(
            noise(vUv * uGrainSize * 0.5 + uTime * 0.05),
            noise(vUv * uGrainSize * 0.5 + uTime * 0.07),
            noise(vUv * uGrainSize * 0.5 + uTime * 0.09)
        ) * 0.5 - 0.25;
        color += colorGrain * uGrainIntensity * 0.3 * shadow;
    }

    // FXAA
    color = fxaa(uTexture, vUv, 1.0 / uResolution);

    gl_FragColor = vec4(linearToSrgb(color), 1.0);
}