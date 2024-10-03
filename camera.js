import { PerspectiveCamera } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';

export function createCamera() {
    const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 50, 150);  // Adjusted to view the scene properly
    return camera;
}

export function createControls(camera, renderer) {
    const controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 50;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2;

    return controls;
}
