import { PerspectiveCamera } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';

export function createCamera() {
    const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 50, 150);  // Adjusted to view the scene properly
    return camera;
}

export function createControls(camera, renderer) {
    const controls = new MapControls(camera, renderer.domElement);

    // Enable damping for smooth camera movement
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Set maxPolarAngle to Math.PI to allow looking straight up
    controls.maxPolarAngle = Math.PI;

    // Allow looking straight down if needed (optional)
    controls.minPolarAngle = 0;

    controls.screenSpacePanning = false;
    controls.minDistance = 50;
    controls.maxDistance = 500;

    return controls;
}
