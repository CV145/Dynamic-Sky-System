import * as THREE from 'three';
import { createCamera, createControls } from './camera.js';
import { createScene, createHemisphereLight, createSunLight, createSunSphere, updateSunAppearance } from './scene.js';
import { setupUI } from './ui.js';
import { createSkybox, updateSkyboxColors } from './skybox.js';

let camera, controls, scene, renderer, sunLight, sunSphere, hemisphereLight, cube, skybox;
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
    const shadowHelper = new THREE.CameraHelper(sunLight.shadow.camera);
    scene.add(shadowHelper);

    scene.add(sunLight);

    // Add the Sun Sphere (for visual representation of the sun)
    sunSphere = createSunSphere();
    scene.add(sunSphere);

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
    skybox = createSkybox();
    scene.add(skybox);

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
    const distance = 500;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * 300;
    const z = 0;

    // Move the DirectionalLight (sunlight)
    sunLight.position.set(x, y, z);
    sunLight.updateMatrixWorld();

    // Move the Sun Sphere in sync with the DirectionalLight
    sunSphere.position.set(x, y, z);
    sunSphere.updateMatrixWorld();

    // Update the background color based on time of day
    //updateBackgroundColor(normalizedTime);

    // Update the sun's appearance (color and intensity)
    updateSunAppearance(normalizedTime, sunSphere, sunLight);

    // Update the skybox color
    updateSkyboxColors(normalizedTime, skybox);
}

/*function updateBackgroundColor(normalizedTime) {
    const dayColor = new THREE.Color(0x87CEEB);  // Light sky blue for midday
    const nightColor = new THREE.Color(0x000033);  // Dark blue for night
    const sunsetColor = new THREE.Color(0xe6954e);  // Orange for sunset/sunrise
    const sunriseColor = new THREE.Color(0xe6b04e); // Yellow for sunrise

    // Time range for day phases (normalized between 0 and 1)
    const sunriseStart = 6 / 24;   // 6:00 AM
    const sunriseEnd = 7 / 24;     // 7:00 AM
    const sunsetStart = 18 / 24;   // 7:00 PM
    const sunsetEnd = 20 / 24;     // 8:00 PM

    let backgroundColor;

    // Determine the background color based on time of day
    if (normalizedTime < sunriseStart || normalizedTime > sunsetEnd) {
        // Night (before 6:00 AM or after 8:00 PM)
        backgroundColor = nightColor;
    } else if (normalizedTime >= sunriseStart && normalizedTime <= sunriseEnd) {
        // Sunrise transition (6:00 AM to 7:00 AM)
        const sunriseMidpoint = (sunriseStart + sunriseEnd) / 2;  // Midpoint between 6:00 AM and 7:00 AM

        let sunriseProgress;
        if (normalizedTime <= sunriseMidpoint) {
            // Night to Sunrise transition (6:00 AM to 6:30 AM)
            sunriseProgress = (normalizedTime - sunriseStart) / (sunriseMidpoint - sunriseStart);
            backgroundColor = nightColor.clone().lerp(sunriseColor, sunriseProgress);  // Gradual transition from night to sunrise
        } else {
            // Sunrise to Day transition (6:30 AM to 7:00 AM)
            sunriseProgress = (normalizedTime - sunriseMidpoint) / (sunriseEnd - sunriseMidpoint);
            backgroundColor = sunriseColor.clone().lerp(dayColor, sunriseProgress);  // Gradual transition from sunrise to day
        }
    }
    else if (normalizedTime >= sunsetStart && normalizedTime <= sunsetEnd) {
        // Sunset transition (7:00 PM to 8:00 PM)
        const sunsetMidpoint = (sunsetStart + sunsetEnd) / 2;  // Midpoint between sunsetStart and sunsetEnd (7:00 PM to 7:30 PM)

        let sunsetProgress;
        if (normalizedTime <= sunsetMidpoint) {
            // Day to Sunset transition (7:00 PM to 7:30 PM)
            sunsetProgress = (normalizedTime - sunsetStart) / (sunsetMidpoint - sunsetStart);
            backgroundColor = dayColor.clone().lerp(sunsetColor, sunsetProgress);  // Gradual transition to sunset
        } else {
            // Sunset to Night transition (7:30 PM to 8:00 PM)
            sunsetProgress = (normalizedTime - sunsetMidpoint) / (sunsetEnd - sunsetMidpoint);
            backgroundColor = sunsetColor.clone().lerp(nightColor, sunsetProgress);  // Gradual transition to night
        }
    }
    else {
        // Daytime (7:00 AM to 7:00 PM): Full day color (light blue)
        backgroundColor = dayColor;
    }

    // Set the scene background to the interpolated color
    scene.background = backgroundColor;
}*/


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
