// Cinematic Camera Controller

import * as THREE from 'three';
import { lerp, lerpVec3, clamp, Easing } from '../utils/easing.js';

export class CameraController {
    constructor(options = {}) {
        this.options = {
            fov: 45,
            near: 0.1,
            far: 100,
            position: new THREE.Vector3(0, 0, 7.5),
            target: new THREE.Vector3(0, 0, 0),
            ...options
        };

        this.camera = new THREE.PerspectiveCamera(
            this.options.fov,
            window.innerWidth / window.innerHeight,
            this.options.near,
            this.options.far
        );
        this.camera.position.copy(this.options.position);

        // Current state
        this.currentPosition = this.options.position.clone();
        this.currentTarget = this.options.target.clone();
        this.currentFov = this.options.fov;
        this.currentRotation = new THREE.Euler(0, 0, 0);

        // Target state (for interpolation)
        this.targetPosition = this.options.position.clone();
        this.targetTarget = this.options.target.clone();
        this.targetFov = this.options.fov;
        this.targetRotation = new THREE.Euler(0, 0, 0);

        // Section states for scroll-driven camera
        this.sectionStates = [];
        this.currentSectionIndex = 0;
        this.sectionProgress = 0;

        // User input offsets (mouse parallax)
        this.mouseOffset = new THREE.Vector3(0, 0, 0);
        this.mouseTarget = new THREE.Vector3(0, 0, 0);
        this.mouseInfluence = 0.3;

        // Smoothing
        this.positionLerp = 0.05;
        this.targetLerp = 0.05;
        this.fovLerp = 0.08;
        this.rotationLerp = 0.05;

        // Reduced motion
        this.reducedMotion = false;
    }

    init() {
        this.updateCamera();
    }

    // Define a camera state for a section
    addSectionState(state) {
        this.sectionStates.push({
            position: new THREE.Vector3().copy(state.position || this.options.position),
            target: new THREE.Vector3().copy(state.target || this.options.target),
            fov: state.fov || this.options.fov,
            rotation: new THREE.Euler().copy(state.rotation || new THREE.Euler(0, 0, 0)),
            ease: state.ease || Easing.cubicInOut,
            ...state
        });
    }

    // Update section progress (0-1 within section, section index)
    setSectionProgress(sectionIndex, progress) {
        this.currentSectionIndex = Math.max(0, Math.min(sectionIndex, this.sectionStates.length - 1));
        this.sectionProgress = clamp(progress, 0, 1);

        this.interpolateSectionState();
    }

    interpolateSectionState() {
        if (this.sectionStates.length === 0) return;

        const currentState = this.sectionStates[this.currentSectionIndex];
        const nextIndex = Math.min(this.currentSectionIndex + 1, this.sectionStates.length - 1);
        const nextState = this.sectionStates[nextIndex];

        // If we're at the last section, stay there
        if (this.currentSectionIndex === this.sectionStates.length - 1) {
            this.targetPosition.copy(currentState.position);
            this.targetTarget.copy(currentState.target);
            this.targetFov = currentState.fov;
            this.targetRotation.copy(currentState.rotation);
            return;
        }

        // Interpolate between current and next section
        const easedProgress = currentState.ease(this.sectionProgress);

        lerpVec3(currentState.position, nextState.position, easedProgress, this.targetPosition);
        lerpVec3(currentState.target, nextState.target, easedProgress, this.targetTarget);
        this.targetFov = lerp(currentState.fov, nextState.fov, easedProgress);

        // Slerp rotation
        const q1 = new THREE.Quaternion().setFromEuler(currentState.rotation);
        const q2 = new THREE.Quaternion().setFromEuler(nextState.rotation);
        const qTarget = new THREE.Quaternion().slerpQuaternions(q1, q2, easedProgress);
        this.targetRotation.setFromQuaternion(qTarget);
    }

    // Mouse parallax input
    setMouseOffset(x, y) {
        this.mouseTarget.x = x * this.mouseInfluence;
        this.mouseTarget.y = y * this.mouseInfluence;
    }

    setMouseInfluence(influence) {
        this.mouseInfluence = influence;
    }

    // Direct camera control
    setPosition(position) {
        this.targetPosition.copy(position);
    }

    setTarget(target) {
        this.targetTarget.copy(target);
    }

    setFov(fov) {
        this.targetFov = fov;
    }

    // Smoothing factors
    setSmoothing(positionLerp, targetLerp, fovLerp) {
        this.positionLerp = positionLerp;
        this.targetLerp = targetLerp;
        this.fovLerp = fovLerp;
    }

    setReducedMotion(reduced) {
        this.reducedMotion = reduced;
        if (reduced) {
            this.positionLerp = 1;
            this.targetLerp = 1;
            this.fovLerp = 1;
            this.rotationLerp = 1;
        }
    }

    update(deltaTime) {
        // Smooth mouse offset
        const mouseLerp = this.reducedMotion ? 1 : 0.1;
        this.mouseOffset.lerp(this.mouseTarget, mouseLerp);

        // Interpolate camera state
        const posLerp = this.reducedMotion ? 1 : this.positionLerp;
        const targetLerp = this.reducedMotion ? 1 : this.targetLerp;
        const fovLerp = this.reducedMotion ? 1 : this.fovLerp;
        const rotLerp = this.reducedMotion ? 1 : this.rotationLerp;

        this.currentPosition.lerp(this.targetPosition, posLerp);
        this.currentTarget.lerp(this.targetTarget, targetLerp);
        this.currentFov = lerp(this.currentFov, this.targetFov, fovLerp);

        // Rotation slerp
        const qCurrent = new THREE.Quaternion().setFromEuler(this.currentRotation);
        const qTarget = new THREE.Quaternion().setFromEuler(this.targetRotation);
        qCurrent.slerp(qTarget, rotLerp);
        this.currentRotation.setFromQuaternion(qCurrent);

        // Apply to Three.js camera
        this.updateCamera();
    }

    updateCamera() {
        // Apply mouse offset to position
        const finalPosition = this.currentPosition.clone().add(this.mouseOffset);

        this.camera.position.copy(finalPosition);
        this.camera.lookAt(this.currentTarget);
        this.camera.fov = this.currentFov;
        this.camera.updateProjectionMatrix();
    }

    resize(aspect) {
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }

    getCamera() {
        return this.camera;
    }

    getState() {
        return {
            position: this.currentPosition.clone(),
            target: this.currentTarget.clone(),
            fov: this.currentFov,
            rotation: this.currentRotation.clone()
        };
    }
}