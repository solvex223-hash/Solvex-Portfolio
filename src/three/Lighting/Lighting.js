import * as THREE from 'three';

export function createLighting(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.16);

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(7, 8, 10);

  const rim = new THREE.DirectionalLight(0x7f62ff, 3.0); // restrained violet edge light
  rim.position.set(-9, 3, -8);

  const fill = new THREE.DirectionalLight(0xaec4ff, 0.4);
  fill.position.set(-5, -3, 6);

  // sits inside the glass tower (added to the architecture by the scene)
  const coreLight = new THREE.PointLight(0x8b6cff, 0, 14, 2);

  scene.add(ambient, key, rim, fill);

  return {
    coreLight,
    update(vis) {
      coreLight.intensity = 22 * vis;
      rim.intensity = 0.8 + 2.2 * vis;
    },
  };
}