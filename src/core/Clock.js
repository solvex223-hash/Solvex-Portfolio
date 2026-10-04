// Unified Timing System

export class Clock {
    constructor() {
        this.startTime = performance.now();
        this.lastTime = this.startTime;
        this.time = 0;
        this.deltaTime = 0;
        this.elapsedTime = 0;
        this.frameCount = 0;
        this.fps = 60;
        this.fpsSamples = [];
        this.timeScale = 1;
        this.paused = false;
    }

    tick() {
        const now = performance.now();
        this.deltaTime = (now - this.lastTime) / 1000 * this.timeScale;
        this.time = (now - this.startTime) / 1000 * this.timeScale;
        this.elapsedTime += this.deltaTime;
        this.lastTime = now;
        this.frameCount++;

        // FPS calculation (smoothed over 60 frames)
        this.fpsSamples.push(1 / Math.max(this.deltaTime, 0.001));
        if (this.fpsSamples.length > 60) this.fpsSamples.shift();
        this.fps = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;

        return {
            time: this.time,
            deltaTime: this.deltaTime,
            elapsedTime: this.elapsedTime,
            frameCount: this.frameCount,
            fps: this.fps
        };
    }

    getDelta() {
        return this.deltaTime;
    }

    getElapsed() {
        return this.elapsedTime;
    }

    getFPS() {
        return this.fps;
    }

    setTimeScale(scale) {
        this.timeScale = Math.max(0, scale);
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
        this.lastTime = performance.now();
    }

    reset() {
        this.startTime = performance.now();
        this.lastTime = this.startTime;
        this.time = 0;
        this.elapsedTime = 0;
        this.frameCount = 0;
    }
}