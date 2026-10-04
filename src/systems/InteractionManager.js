// Interaction Manager - Mouse, Touch, Keyboard, Resize

export class InteractionManager {
    constructor(options = {}) {
        this.options = {
            enableMouse: true,
            enableTouch: true,
            enableKeyboard: false,
            enableResize: true,
            ...options
        };

        // Mouse state
        this.mouse = { x: 0, y: 0, normalized: { x: 0, y: 0 } };
        this.mouseDown = false;
        this.mouseRaw = { x: 0, y: 0 };

        // Touch state
        this.touch = { x: 0, y: 0, normalized: { x: 0, y: 0 }, active: false };

        // Keyboard state
        this.keys = new Set();

        // Viewport
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.aspect = this.width / this.height;

        // Callbacks
        this.callbacks = {
            mouseMove: [],
            mouseDown: [],
            mouseUp: [],
            click: [],
            touchStart: [],
            touchMove: [],
            touchEnd: [],
            resize: [],
            keyDown: [],
            keyUp: [],
            scroll: []
        };

        this.initialized = false;
    }

    init() {
        if (this.options.enableMouse) this.bindMouse();
        if (this.options.enableTouch) this.bindTouch();
        if (this.options.enableKeyboard) this.bindKeyboard();
        if (this.options.enableResize) this.bindResize();

        this.initialized = true;
        return this;
    }

    bindMouse() {
        window.addEventListener('mousemove', (e) => this.onMouseMove(e), { passive: true });
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        window.addEventListener('click', (e) => this.onClick(e));

        // Pointer lock for immersive (optional)
        // document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    }

    bindTouch() {
        window.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
        window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: true });
        window.addEventListener('touchend', (e) => this.onTouchEnd(e));
    }

    bindKeyboard() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    bindResize() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.onResize(), 100);
        }, { passive: true });
    }

    onMouseMove(e) {
        this.mouseRaw.x = e.clientX;
        this.mouseRaw.y = e.clientY;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.normalized.x = (e.clientX / this.width) * 2 - 1;
        this.mouse.normalized.y = -(e.clientY / this.height) * 2 + 1;

        this.emit('mouseMove', this.mouse);
    }

    onMouseDown(e) {
        this.mouseDown = true;
        this.emit('mouseDown', { ...this.mouse, button: e.button });
    }

    onMouseUp(e) {
        this.mouseDown = false;
        this.emit('mouseUp', { ...this.mouse, button: e.button });
    }

    onClick(e) {
        this.emit('click', { ...this.mouse, button: e.button });
    }

    onTouchStart(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.touch.x = touch.clientX;
            this.touch.y = touch.clientY;
            this.touch.normalized.x = (touch.clientX / this.width) * 2 - 1;
            this.touch.normalized.y = -(touch.clientY / this.height) * 2 + 1;
            this.touch.active = true;
            this.emit('touchStart', this.touch);
        }
    }

    onTouchMove(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.touch.x = touch.clientX;
            this.touch.y = touch.clientY;
            this.touch.normalized.x = (touch.clientX / this.width) * 2 - 1;
            this.touch.normalized.y = -(touch.clientY / this.height) * 2 + 1;
            this.emit('touchMove', this.touch);
        }
    }

    onTouchEnd(e) {
        this.touch.active = false;
        this.emit('touchEnd', this.touch);
    }

    onKeyDown(e) {
        this.keys.add(e.code);
        this.emit('keyDown', { code: e.code, key: e.key, shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey });
    }

    onKeyUp(e) {
        this.keys.delete(e.code);
        this.emit('keyUp', { code: e.code, key: e.key });
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.aspect = this.width / this.height;

        this.emit('resize', { width: this.width, height: this.height, aspect: this.aspect });
    }

    // Event system
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.callbacks[event]) {
            const idx = this.callbacks[event].indexOf(callback);
            if (idx > -1) this.callbacks[event].splice(idx, 1);
        }
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }

    // Getters
    getMouse() {
        return { ...this.mouse };
    }

    getNormalizedMouse() {
        return { ...this.mouse.normalized };
    }

    getTouch() {
        return { ...this.touch };
    }

    isKeyPressed(code) {
        return this.keys.has(code);
    }

    getViewport() {
        return { width: this.width, height: this.height, aspect: this.aspect };
    }

    // Convenience: get mouse as THREE.Vector2
    getMouseVector2(target = { x: 0, y: 0 }) {
        target.x = this.mouse.normalized.x;
        target.y = this.mouse.normalized.y;
        return target;
    }
}