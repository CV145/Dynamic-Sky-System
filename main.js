import * as THREE from 'three';
import { createCamera, createControls } from './camera.js';
import { createScene, createSunLight } from './scene.js';
import { setupUI } from './ui.js';

let camera, controls, scene, renderer, sunLight;
let timeOfDay = 12;  // Default start time is midday

init();
animate();

function init() {
    // Scene setup
    scene = createScene();

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Camera and Controls
    camera = createCamera();
    controls = createControls(camera, renderer);

    // Add the Sunlight to the scene
    sunLight = createSunLight();
    scene.add(sunLight);

    // Set up UI to control time of day (from 6 AM to 6 PM)
    setupUI(onTimeOfDayChanged);

    // Resize listener
    window.addEventListener('resize', onWindowResize);
}

function onTimeOfDayChanged(value) {
    timeOfDay = value;
    updateSunPosition();
}

function updateSunPosition() {
    // Rotate the sunlight based on time of day
    // 6 AM corresponds to timeOfDay = 6, 6 PM corresponds to timeOfDay = 18
    // Map this to a rotation from -90° (6 AM) to 90° (6 PM), which corresponds to -PI/2 to PI/2
    const normalizedTime = (timeOfDay - 6) / 12;  // Normalize from [6,18] to [0,1]
    const angle = normalizedTime * Math.PI;  // Convert to radians

    // Update sun position based on the angle
    sunLight.position.set(Math.cos(angle) * 100, Math.sin(angle) * 100, 50);
    sunLight.updateMatrixWorld();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Required when damping is enabled
    renderer.render(scene, camera);
}
