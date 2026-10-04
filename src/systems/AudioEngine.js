// Procedural Audio Engine

export class AudioEngine {
    constructor(options = {}) {
        this.options = {
            enabled: true,
            masterVolume: 0.3,
            ...options
        };

        this.audioContext = null;
        this.masterGain = null;
        this.enabled = this.options.enabled;
        this.initialized = false;
        this.userInteracted = false;

        // Sound definitions
        this.sounds = {
            click: { frequency: 800, type: 'sine', duration: 0.08, volume: 0.15 },
            hover: { frequency: 600, type: 'sine', duration: 0.05, volume: 0.08 },
            cardEnter: { frequency: 400, type: 'triangle', duration: 0.15, volume: 0.1 },
            cardExit: { frequency: 300, type: 'triangle', duration: 0.1, volume: 0.08 },
            sectionChange: { frequency: 200, type: 'sawtooth', duration: 0.3, volume: 0.12 },
            ambient: { frequency: 80, type: 'sine', duration: 0, volume: 0.02, loop: true }
        };

        this.ambientOscillator = null;
        this.ambientGain = null;
    }

    async init() {
        // Create audio context on first user interaction
        document.addEventListener('click', () => this.ensureContext(), { once: true });
        document.addEventListener('keydown', () => this.ensureContext(), { once: true });
        document.addEventListener('touchstart', () => this.ensureContext(), { once: true });

        this.initialized = true;
        return this;
    }

    ensureContext() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.options.masterVolume;
            this.masterGain.connect(this.audioContext.destination);

            // Resume if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            this.userInteracted = true;
            console.log('[AudioEngine] Initialized');
        } catch (e) {
            console.warn('[AudioEngine] Web Audio not supported:', e);
            this.enabled = false;
        }
    }

    // Play a one-shot sound
    play(soundName, options = {}) {
        if (!this.enabled || !this.audioContext) return;

        const sound = this.sounds[soundName];
        if (!sound) {
            console.warn(`[AudioEngine] Sound not found: ${soundName}`);
            return;
        }

        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = sound.type;
        osc.frequency.value = sound.frequency * (options.pitch || 1);

        const volume = (sound.volume || 0.1) * (options.volume || 1) * this.masterGain.gain.value;
        gain.gain.value = volume;

        // Envelope
        const attack = options.attack || 0.01;
        const decay = sound.duration || 0.1;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + decay + 0.01);

        return osc;
    }

    // Play click sound
    click(options) {
        return this.play('click', options);
    }

    // Play hover sound
    hover(options) {
        return this.play('hover', options);
    }

    // Play card enter
    cardEnter(options) {
        return this.play('cardEnter', options);
    }

    // Play card exit
    cardExit(options) {
        return this.play('cardExit', options);
    }

    // Play section change
    sectionChange(options) {
        return this.play('sectionChange', options);
    }

    // Start ambient drone
    startAmbient(frequency = 80) {
        if (!this.enabled || !this.audioContext || this.ambientOscillator) return;

        this.ambientOscillator = this.audioContext.createOscillator();
        this.ambientGain = this.audioContext.createGain();

        this.ambientOscillator.type = 'sine';
        this.ambientOscillator.frequency.value = frequency;

        this.ambientGain.gain.value = 0;
        this.ambientGain.gain.linearRampToValueAtTime(
            this.sounds.ambient.volume * this.masterGain.gain.value,
            this.audioContext.currentTime + 2
        );

        this.ambientOscillator.connect(this.ambientGain);
        this.ambientGain.connect(this.masterGain);

        this.ambientOscillator.start();
    }

    // Stop ambient
    stopAmbient() {
        if (this.ambientOscillator) {
            const now = this.audioContext.currentTime;
            this.ambientGain.gain.linearRampToValueAtTime(0, now + 1);
            this.ambientOscillator.stop(now + 1);
            this.ambientOscillator = null;
            this.ambientGain = null;
        }
    }

    // Modulate ambient with scroll speed
    modulateAmbient(scrollSpeed) {
        if (!this.ambientOscillator || !this.ambientGain) return;

        // Map scroll speed to frequency modulation
        const freq = 80 + scrollSpeed * 50;
        this.ambientOscillator.frequency.exponentialRampToValueAtTime(
            freq,
            this.audioContext.currentTime + 0.1
        );

        // Volume modulation
        const vol = this.sounds.ambient.volume * (0.5 + scrollSpeed * 0.5);
        this.ambientGain.gain.linearRampToValueAtTime(
            vol * this.masterGain.gain.value,
            this.audioContext.currentTime + 0.1
        );
    }

    setMasterVolume(volume) {
        this.options.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.options.masterVolume;
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) this.stopAmbient();
    }

    // Mute/unmute
    mute() {
        if (this.masterGain) this.masterGain.gain.value = 0;
    }

    unmute() {
        if (this.masterGain) this.masterGain.gain.value = this.options.masterVolume;
    }

    dispose() {
        this.stopAmbient();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}