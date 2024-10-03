//Scene setup

import * as THREE from 'three';

export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

    // Create a 15x15 plane
    const geometry = new THREE.BoxGeometry(15, 1, 15);  // Width: 15, Height: 1 (thin), Depth: 15
    const material = new THREE.MeshPhongMaterial({ color: 0xeeeeee, flatShading: true });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.y = 0;  // Set it on the ground (y-axis)
    scene.add(plane);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x555555);
    scene.add(ambientLight);

    return scene;
}

export function createSunLight() {
    // Sunlight as DirectionalLight
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(50, 100, 50);  // Initial position (can be adjusted)
    sunLight.castShadow = true;

    return sunLight;
}
