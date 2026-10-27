// Scene Graph Manager

import * as THREE from 'three';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.groups = new Map();
        this.objects = new Map();
        this.disposables = [];
    }

    init() {
        // Scene background handled by CSS (transparent canvas)
        this.scene.background = null;

        // Fog for depth (optional)
        // this.scene.fog = new THREE.FogExp2(0x0E1730, 0.05);

        return this.scene;
    }

    // Create named group
    createGroup(name) {
        const group = new THREE.Group();
        group.name = name;
        this.scene.add(group);
        this.groups.set(name, group);
        return group;
    }

    getGroup(name) {
        return this.groups.get(name);
    }

    // Add object to scene or group
    add(object, groupName = null) {
        this.objects.set(object.uuid, object);

        if (groupName) {
            const group = this.groups.get(groupName);
            if (group) {
                group.add(object);
                return;
            }
        }
        this.scene.add(object);
    }

    remove(object, dispose = false) {
        this.objects.delete(object.uuid);

        if (object.parent) {
            object.parent.remove(object);
        }

        if (dispose) {
            this.disposeObject(object);
        }
    }

    disposeObject(object) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
            } else {
                object.material.dispose();
            }
        }

        // Dispose textures
        object.traverse(child => {
            if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(mat => {
                    Object.values(mat).forEach(value => {
                        if (value && value.isTexture) value.dispose();
                    });
                });
            }
        });
    }

    // Find object by name
    getByName(name) {
        let found = null;
        this.scene.traverse(obj => {
            if (obj.name === name) found = obj;
        });
        return found;
    }

    // Get all objects in group
    getGroupObjects(groupName) {
        const group = this.groups.get(groupName);
        if (!group) return [];
        const objects = [];
        group.traverse(obj => objects.push(obj));
        return objects;
    }

    // Clear scene
    clear(dispose = true) {
        this.scene.traverse(obj => {
            if (dispose) this.disposeObject(obj);
        });
        this.scene.clear();
        this.groups.clear();
        this.objects.clear();
    }

    // Add to disposal list
    addDisposable(disposable) {
        this.disposables.push(disposable);
    }

    dispose() {
        this.disposables.forEach(d => {
            if (typeof d.dispose === 'function') d.dispose();
        });
        this.clear(true);
    }
}