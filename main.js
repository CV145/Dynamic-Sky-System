import * as THREE from 'three';
import { createCamera, createControls } from './camera.js';  // Importing camera and controls setup

let camera, controls, scene, renderer;

init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Camera and Controls
    camera = createCamera();
    controls = createControls(camera, renderer);

    // Create a 15x15 cube (acting as a plane)
    const geometry = new THREE.BoxGeometry(15, 1, 15);  // Width: 15, Height: 1 (thin), Depth: 15
    const material = new THREE.MeshPhongMaterial({ color: 0xeeeeee, flatShading: true });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.y = 0;  // Set it on the ground (y-axis)
    scene.add(plane);

    // Lighting setup
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight1.position.set(1, 1, 1);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x002288, 1);
    dirLight2.position.set(-1, -1, -1);
    scene.add(dirLight2);

    const ambientLight = new THREE.AmbientLight(0x555555);
    scene.add(ambientLight);

    // Resize listener
    window.addEventListener('resize', onWindowResize);
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
