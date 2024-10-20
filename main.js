import * as THREE from 'three';
import { createCamera, createControls } from './camera.js';
import { createScene, createHemisphereLight, createSunLight, createSunSphere, updateSunAppearance } from './scene.js';
import { setupUI } from './ui.js';
import { createSkysphere, updateSkysphereColors } from './skybox.js';

let camera, controls, scene, renderer, sunLight, sunSphere, hemisphereLight, cube, skysphere, moonLight, moonSphere;
let timeOfDay = 12;  // Default start time is midday

init();
animate();

function init() {
    // Scene setup
    scene = createScene();

    // Renderer setup with shadow maps enabled
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;  // Enable shadow maps
    document.body.appendChild(renderer.domElement);

    // Camera and Controls
    camera = createCamera();
    controls = createControls(camera, renderer);

    // Add Hemisphere Light to the scene
    hemisphereLight = createHemisphereLight();
    scene.add(hemisphereLight);

    // Add the Sunlight (DirectionalLight) with shadows enabled
    sunLight = createSunLight();
    sunLight.castShadow = true;  // Enable shadows for the sunlight
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -100;   // Half the width of the plane
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;     // Half the height of the plane
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 1000;    // Ensure this value is large enough

    sunLight.shadow.bias = -0.001;  // Negative bias value can help make the shadow appear properly
    //const shadowHelper = new THREE.CameraHelper(sunLight.shadow.camera);
    //scene.add(shadowHelper);

    scene.add(sunLight);

    // Add the Sun Sphere (for visual representation of the sun)
    sunSphere = createSunSphere();
    scene.add(sunSphere);

    // Add the Moonlight (DirectionalLight) with shadows
    moonLight = new THREE.DirectionalLight(0xffffff, 0.2);  // Lower intensity for moonlight
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.left = -100;
    moonLight.shadow.camera.right = 100;
    moonLight.shadow.camera.top = 100;
    moonLight.shadow.camera.bottom = -100;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 1000;
    moonLight.shadow.bias = -0.001;
    scene.add(moonLight);

    // Add the Moon Sphere (for visual representation of the moon)
    moonSphere = createMoonSphere();
    scene.add(moonSphere);


    // Add a ground plane to receive shadows
    const planeGeometry = new THREE.PlaneGeometry(250, 250);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });  // Standard material with color
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    plane.receiveShadow = true;  // Enable shadows for the plane
    plane.castShadow = false;
    scene.add(plane);

    // Add a Cube to cast and receive shadows
    const cubeGeometry = new THREE.BoxGeometry(20, 20, 20);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(0, 10, 0);  // Position the cube above the plane
    cube.castShadow = true;  // The cube casts shadows
    cube.receiveShadow = true;  // The cube also receives shadows
    scene.add(cube);


    // Create and add the skybox
    skysphere = createSkysphere();
    scene.add(skysphere);

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
    const normalizedTime = timeOfDay / 24;  // Normalize from [0,23] to [0,1]
    const angle = normalizedTime * Math.PI * 2 - Math.PI / 2;  // Full rotation

    // Update sun position based on the angle
    const distance = 1000;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * 300;
    const z = 0;

    // Move the DirectionalLight (sunlight)
    sunLight.position.set(x, y, z);
    sunLight.updateMatrixWorld();

    // Move the Sun Sphere in sync with the DirectionalLight
    sunSphere.position.set(x, y, z);
    sunSphere.updateMatrixWorld();

    // Position the moon on the opposite side of the sky
    const moonAngle = angle + Math.PI;  // Opposite side to the sun
    const moonX = Math.cos(moonAngle) * distance;
    const moonY = Math.sin(moonAngle) * 300;

    moonLight.position.set(moonX, moonY, z);
    moonLight.updateMatrixWorld();
    moonSphere.position.set(moonX, moonY, z);
    moonSphere.updateMatrixWorld();

    updateMoonAppearance(normalizedTime, moonSphere, moonLight);


    // Update the sun's appearance (color and intensity)
    updateSunAppearance(normalizedTime, sunSphere, sunLight);

    // Update the skybox color
    updateSkysphereColors(normalizedTime, skysphere);
}

function updateMoonAppearance(normalizedTime, moonSphere, moonLight) {
    const fadeDuration = 1 / 24; // 1 hour in normalized time (assuming 24-hour cycle)

    let opacity = 1.0;
    let moonIntensity = 0.2; // Base intensity when fully visible

    // Fading Out: 5/24 to 6/24 (1 hour before sunrise to sunrise)
    if (normalizedTime >= (6 - fadeDuration) / 24 && normalizedTime < 6 / 24) {
        const progress = (normalizedTime - (6 - fadeDuration) / 24) / fadeDuration;
        opacity = 1.0 - progress; // Decreases from 1.0 to 0.0
        moonIntensity = 0.2 * (1.0 - progress); // Decreases proportionally
    }
    // Fully Invisible: 6/24 to 19/24 (daytime)
    else if (normalizedTime >= 6 / 24 && normalizedTime < 19 / 24) {
        opacity = 0.0;
        moonIntensity = 0.0;
    }
    // Fading In: 19/24 to 20/24 (sunset to 1 hour after sunset)
    else if (normalizedTime >= 19 / 24 && normalizedTime < (19 + fadeDuration) / 24) {
        const progress = (normalizedTime - 19 / 24) / fadeDuration;
        opacity = progress; // Increases from 0.0 to 1.0
        moonIntensity = 0.2 * progress; // Increases proportionally
    }
    // Fully Visible Night: Before 5/24 or after 20/24
    else {
        opacity = 1.0;
        moonIntensity = 0.2;
    }

    // Update Moonlight Intensity
    moonLight.intensity = moonIntensity;

    // Update Moon Sphere Opacity
    moonSphere.material.opacity = opacity;
}



function createMoonSphere() {
    let moonTexture;

    // Create a sphere to represent the moon
    const moonGeometry = new THREE.SphereGeometry(10, 32, 32);
    const moonMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,          // Moon color
        emissive: 0xffffff,       // Emissive color for glowing effect
        emissiveIntensity: 1.0,   // Emissive intensity
        transparent: true,        // Enable transparency
        opacity: 1.0,             // Initial opacity
        side: THREE.FrontSide,    // Render front side
        depthWrite: false,         // Prevent writing to depth buffer
    });

    const moonSphere = new THREE.Mesh(moonGeometry, moonMaterial);

    // Position the moon sphere in the sky (opposite to the sun)
    moonSphere.position.set(4000, 300, 0);

    // Load the moon texture
    /*const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/textures/Moon.jpg', (texture) => {
        moonTexture = texture;

        // Once the texture is loaded, apply it to the moon sphere material
        if (moonSphere) {
            moonSphere.material.map = moonTexture;
            moonSphere.material.needsUpdate = true;
        }
    });*/

    return moonSphere;
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
