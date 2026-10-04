// Custom Easing Functions

export const Easing = {
    // Cubic
    cubicIn: (t) => t * t * t,
    cubicOut: (t) => 1 - Math.pow(1 - t, 3),
    cubicInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

    // Quart
    quartIn: (t) => t * t * t * t,
    quartOut: (t) => 1 - Math.pow(1 - t, 4),
    quartInOut: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,

    // Quint
    quintIn: (t) => t * t * t * t * t,
    quintOut: (t) => 1 - Math.pow(1 - t, 5),
    quintInOut: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,

    // Expo
    expoIn: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
    expoOut: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    expoInOut: (t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return t < 0.5
            ? Math.pow(2, 20 * t - 10) / 2
            : (2 - Math.pow(2, -20 * t + 10)) / 2;
    },

    // Circ
    circIn: (t) => 1 - Math.sqrt(1 - t * t),
    circOut: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    circInOut: (t) => t < 0.5
        ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
        : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,

    // Back
    backIn: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
    backOut: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    backInOut: (t) => {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    },

    // Elastic
    elasticIn: (t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * 2.094);
    },
    elasticOut: (t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * 2.094) + 1;
    },
    elasticInOut: (t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        const c5 = (2 * Math.PI) / 4.5;
        return t < 0.5
            ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
            : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    },

    // Custom "premium" easings
    // Smooth start, fast middle, smooth end - great for camera moves
    cinematic: (t) => {
        if (t < 0.15) return Easing.cubicIn(t / 0.15) * 0.15;
        if (t > 0.85) return 0.85 + Easing.cubicOut((t - 0.85) / 0.15) * 0.15;
        return 0.15 + (t - 0.15) / 0.7 * 0.7;
    },

    // Overshoot and settle - great for UI pop-in
    pop: (t) => {
        if (t < 0.6) return Easing.backOut(t / 0.6) * 0.6;
        return 0.6 + Easing.elasticOut((t - 0.6) / 0.4) * 0.4;
    },

    // Slow start, accelerate, slow end - great for scroll sync
    smoothStep: (t) => t * t * (3 - 2 * t),
    smootherStep: (t) => t * t * t * (t * (6 * t - 15) + 10),

    // Power curves
    powerIn: (exp) => (t) => Math.pow(t, exp),
    powerOut: (exp) => (t) => 1 - Math.pow(1 - t, exp),
    powerInOut: (exp) => (t) => t < 0.5
        ? Math.pow(2 * t, exp) / 2
        : 1 - Math.pow(2 - 2 * t, exp) / 2,
};

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function lerpVec3(a, b, t, out = new THREE.Vector3()) {
    return out.lerpVectors(a, b, t);
}

export function lerpColor(a, b, t, out = new THREE.Color()) {
    return out.lerpColors(a, b, t);
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

export function smoothStep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}