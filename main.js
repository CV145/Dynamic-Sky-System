import * as THREE from 'three';
import { createCamera, createControls } from './camera.js';
import { createScene, createHemisphereLight, createSunLight, createSunSphere, updateSunAppearance } from './scene.js';
import { setupUI } from './ui.js';
import { createSkysphere, updateSkysphereColors } from './skybox.js';
import { createVolumetricClouds, baseMaterial } from './clouds.js';

let camera, controls, scene, renderer, sunLight, sunSphere, hemisphereLight, cube, skysphere, moonLight, moonSphere, cloudMesh;
let timeOfDay = 12;  // Default start time is midday
let cloudMeshes = [];
let isRaining = false;
let rainParticles;
let largeRainCloud;
const clock = new THREE.Clock();

// Define the range for cloud positions
const positionRange = new THREE.Vector3(5000, 5000, 2000);

// Define minimum and maximum scales for the clouds
const minScale = new THREE.Vector3(300, 200, 150);
const maxScale = new THREE.Vector3(1000, 700, 550);

// Function to generate random positions within a specified range
function getRandomPosition(range) {
    const x = (Math.random() - 0.5) * range.x;
    const y = (Math.random() - 0.5) * range.y;
    const z = (Math.random() - 0.5) * range.z;
    return new THREE.Vector3(x, y, z);
}

// Function to generate random scale within specified min and max values
function getRandomScale(minScale, maxScale) {
    const scaleX = THREE.MathUtils.lerp(minScale.x, maxScale.x, Math.random());
    const scaleY = THREE.MathUtils.lerp(minScale.y, maxScale.y, Math.random());
    const scaleZ = THREE.MathUtils.lerp(minScale.z, maxScale.z, Math.random());
    return new THREE.Vector3(scaleX, scaleY, scaleZ);
}

function createLargeRainCloud() {
    // Create a new cloud mesh for the large rain cloud
    const material = baseMaterial.clone();

    // Set initial threshold to 1.0 (invisible)
    material.uniforms.threshold.value = 1.0;

    // Create the cloud mesh
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    largeRainCloud = new THREE.Mesh(geometry, material);

    // Position at the top
    largeRainCloud.position.set(0, 4000, 0); // Centered at the top

    // Scale up on X and Z axes
    largeRainCloud.scale.set(10000, 1000, 10000);

    // Set base color to dark grey
    material.uniforms.base.value = new THREE.Color(0x555555);

    // Initialize transition properties
    largeRainCloud.userData.isAccumulating = true;
    largeRainCloud.userData.transitionProgress = 0;
    largeRainCloud.userData.initialThreshold = 1.0;
    largeRainCloud.userData.targetThreshold = 0.25; // Adjust as needed

    // Add the cloud mesh to the scene
    scene.add(largeRainCloud);

    // Update uniforms before rendering
    largeRainCloud.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
        material.uniforms.cameraPos.value.copy(camera.position);
    };
}



function resetCloud(cloudMesh, randomizeAge = false) {
    // Reset lifeTime
    cloudMesh.userData.lifeTime = THREE.MathUtils.randFloat(20, 40);

    // Define formationTime and dispersalTime
    cloudMesh.userData.formationTime = cloudMesh.userData.lifeTime * 0.5; // 50% of lifeTime
    cloudMesh.userData.dispersalTime = cloudMesh.userData.lifeTime * 0.2; // 20% of lifeTime

    // Reset age
    cloudMesh.userData.age = randomizeAge ? Math.random() * cloudMesh.userData.lifeTime : 0;

    // Reset position
    cloudMesh.position.copy(getRandomPosition(positionRange));

    // Reset initial scale
    cloudMesh.userData.initialScale = getRandomScale(minScale, maxScale);
    cloudMesh.userData.initialThreshold = 0.25; // Store initial threshold

    // Reset scale and threshold based on age
    updateCloudProperties(cloudMesh);

    // Reset opacity offset
    cloudMesh.userData.opacityOffset = Math.random() * Math.PI * 2;

    // Initialize drift speed and direction
    cloudMesh.userData.driftSpeed = new THREE.Vector3(
        THREE.MathUtils.randFloat(5, 15),
        0,
        0
    );


    // Reset dispersalExponent
    cloudMesh.userData.dispersalExponent = THREE.MathUtils.randFloat(1, 3);
}

function updateCloudProperties(cloudMesh, isRaining) {
    const age = cloudMesh.userData.age;
    const lifeTime = cloudMesh.userData.lifeTime;
    const formationTime = cloudMesh.userData.formationTime;
    const dispersalTime = cloudMesh.userData.dispersalTime;
    const initialScale = cloudMesh.userData.initialScale;
    const initialThreshold = cloudMesh.userData.initialThreshold;
    const dispersalExponent = cloudMesh.userData.dispersalExponent;

    if (isRaining) {
        // During rain, prevent clouds from forming or resetting
        return;
    }

    if (age < formationTime) {
        // Formation phase
        const formationAgeRatio = age / formationTime;
        const easedRatio = Math.pow(formationAgeRatio, 0.5); // Slower initial decrease

        // Scale increases from 0 to initialScale
        const scaleFactor = easedRatio;
        cloudMesh.scale.copy(initialScale.clone().multiplyScalar(scaleFactor));

        // Threshold decreases from 1.0 to initialThreshold
        const threshold = THREE.MathUtils.lerp(
            1.0, // Start value
            initialThreshold, // End value
            easedRatio
        );
        cloudMesh.material.uniforms.threshold.value = threshold;

    } else if (age < (lifeTime - dispersalTime)) {
        // Stable phase
        cloudMesh.scale.copy(initialScale);
        cloudMesh.material.uniforms.threshold.value = initialThreshold;

    } else if (age < lifeTime) {
        // Dispersal phase
        const dispersalAge = age - (lifeTime - dispersalTime);
        const dispersalAgeRatio = dispersalAge / dispersalTime;

        // Scale decreases from initialScale to 0
        const scaleFactor = 1 - dispersalAgeRatio;
        cloudMesh.scale.copy(initialScale.clone().multiplyScalar(scaleFactor));

        // Threshold increases from initialThreshold to 1.0
        const threshold = THREE.MathUtils.lerp(
            initialThreshold,
            1.0,
            Math.pow(dispersalAgeRatio, dispersalExponent)
        );
        cloudMesh.material.uniforms.threshold.value = threshold;

    } else {
        // Reset the cloud when lifetime is exceeded
        resetCloud(cloudMesh);
    }
}

function enableRain() {
    if (isRaining) return;

    isRaining = true;

    cloudMeshes.forEach(cloudMesh => {
        // Dissolve existing clouds
        cloudMesh.userData.isDissolving = true;
        cloudMesh.userData.transitionProgress = 0;

        // Store initial properties
        cloudMesh.userData.initialThreshold = cloudMesh.material.uniforms.threshold.value;
        cloudMesh.userData.targetThreshold = 1.0; // Increase threshold to dissolve

        cloudMesh.userData.initialScale = cloudMesh.scale.clone();
        cloudMesh.userData.targetScale = new THREE.Vector3(0, 0, 0); // Scale to zero

        cloudMesh.userData.initialColor = cloudMesh.material.uniforms.base.value.clone();
        // Optionally set targetColor if needed
    });

    // Create rain particles
    createRainParticles();

    // Create or repurpose a large cloud at the top
    createLargeRainCloud();
}

function disableRain() {
    if (!isRaining) return;

    isRaining = false;

    cloudMeshes.forEach(cloudMesh => {
        // Reform normal clouds
        cloudMesh.userData.isDissolving = false;
        cloudMesh.userData.transitionProgress = 0;

        // Store initial properties
        cloudMesh.userData.initialThreshold = cloudMesh.material.uniforms.threshold.value;
        cloudMesh.userData.targetThreshold = cloudMesh.userData.initialThresholdValue; // Reset to stored initial threshold

        cloudMesh.userData.initialScale = cloudMesh.scale.clone();
        cloudMesh.userData.targetScale = cloudMesh.userData.initialScaleValue; // Reset to stored initial scale

        cloudMesh.userData.initialColor = cloudMesh.material.uniforms.base.value.clone();
        // Optionally set targetColor if needed
    });

    // Dissolve the large rain cloud
    if (largeRainCloud) {
        largeRainCloud.userData.isDissolving = true;
        largeRainCloud.userData.isAccumulating = false; // Stop accumulating
        largeRainCloud.userData.transitionProgress = 0; // Start from 0 for dissolve
        largeRainCloud.userData.initialThreshold = largeRainCloud.material.uniforms.threshold.value;
        largeRainCloud.userData.targetThreshold = 1.0; // Increase threshold to dissolve
    }

    // Remove rain particles
    if (rainParticles) {
        scene.remove(rainParticles);
        rainParticles = null;
    }
}

function createRainParticles() {
    const rainGeometry = new THREE.BufferGeometry();
    const rainCount = 10000;

    const positions = [];
    const velocities = [];

    for (let i = 0; i < rainCount; i++) {
        const x = (Math.random() - 0.5) * 10000;
        const y = Math.random() * 5000 + 1000; // Start above the ground
        const z = (Math.random() - 0.5) * 10000;

        positions.push(x, y, z);

        // Initial velocities (randomized for variation)
        velocities.push(0, -Math.random() * 200 - 200, 0); // Falling down
    }

    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    rainGeometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

    const rainMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 2,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
    });

    rainParticles = new THREE.Points(rainGeometry, rainMaterial);
    rainParticles.frustumCulled = false; // Ensure particles are always rendered

    scene.add(rainParticles);
}

function updateRainParticles(delta) {
    if (!rainParticles) return;

    const positions = rainParticles.geometry.attributes.position.array;
    const velocities = rainParticles.geometry.attributes.velocity.array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
        const idx = i * 3;

        // Update position based on velocity
        positions[idx + 1] += velocities[idx + 1] * delta;

        // Reset particle if it goes below the ground
        if (positions[idx + 1] < 0) {
            positions[idx + 1] = Math.random() * 5000 + 1000;
        }
    }

    rainParticles.geometry.attributes.position.needsUpdate = true;
}

// Toggle rainy weather when the user presses the 'R' key
document.addEventListener('keydown', (event) => {
    if (event.key === 'r' || event.key === 'R') {
        if (isRaining) {
            disableRain();
        } else {
            enableRain();
        }
    }
});


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
    sunLight.shadow.camera.left = -1000;   // Half the width of the plane
    sunLight.shadow.camera.right = 1000;
    sunLight.shadow.camera.top = 1000;     // Half the height of the plane
    sunLight.shadow.camera.bottom = -1000;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 10000;    // Ensure this value is large enough

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
    moonLight.shadow.camera.left = -1000;
    moonLight.shadow.camera.right = 1000;
    moonLight.shadow.camera.top = 1000;
    moonLight.shadow.camera.bottom = -1000;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 10000;
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

    // Create and add volumetric clouds
    cloudMeshes = createVolumetricClouds(scene, 25);

    // Initialize properties for each cloud mesh
    cloudMeshes.forEach(cloudMesh => {
        resetCloud(cloudMesh, true); // Initialize cloud with random age

        // Initialize additional properties for weather transitions
        cloudMesh.userData.isDissolving = false;
        cloudMesh.userData.isRainCloud = false;
        cloudMesh.userData.transitionProgress = 0;
        cloudMesh.userData.initialPosition = cloudMesh.position.clone();
        cloudMesh.userData.targetPosition = cloudMesh.position.clone();
        cloudMesh.userData.initialScale = cloudMesh.scale.clone();
        cloudMesh.userData.targetScale = cloudMesh.scale.clone();
        cloudMesh.userData.initialColor = cloudMesh.material.uniforms.base.value.clone();
        cloudMesh.userData.targetColor = cloudMesh.material.uniforms.base.value.clone();

        cloudMesh.userData.initialThreshold = cloudMesh.material.uniforms.threshold.value;
        cloudMesh.userData.targetThreshold = cloudMesh.material.uniforms.threshold.value;

        cloudMesh.userData.initialScaleValue = cloudMesh.scale.clone();
    });

    // Set up UI to control time of day (from 6 AM to 6 PM)
    setupUI(onTimeOfDayChanged);

    // Resize listener
    window.addEventListener('resize', onWindowResize);

    // Initialize properties for each cloud mesh
    cloudMeshes.forEach(cloudMesh => {
        // Assign a random drift speed
        cloudMesh.userData.driftSpeed = new THREE.Vector3(
            THREE.MathUtils.randFloat(5, 15), // Random speed in x-direction
            0,
            0
        );

        // Assign a random opacity offset for variation
        cloudMesh.userData.opacityOffset = Math.random() * Math.PI * 2;

        // Assign random min and max opacity
        cloudMesh.userData.minOpacity = THREE.MathUtils.randFloat(0.1, 0.3);
        cloudMesh.userData.maxOpacity = THREE.MathUtils.randFloat(0.4, 0.6);

        cloudMesh.userData.lifeTime = THREE.MathUtils.randFloat(60, 120); // Total time before cloud resets (in seconds)
        cloudMesh.userData.age = 0; // Initialize age
        cloudMesh.userData.initialScale = cloudMesh.scale.clone(); // Store initial scale
        cloudMesh.userData.dispersalExponent = THREE.MathUtils.randFloat(1, 3);
    });
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
    const distance = 5000;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
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
    const moonY = Math.sin(moonAngle) * distance;

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
    const moonGeometry = new THREE.SphereGeometry(60, 32, 32);
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

    const delta = clock.getDelta(); // Time elapsed since last frame in seconds
    const elapsedTime = clock.getElapsedTime(); // Total elapsed time

    // Update clouds
    cloudMeshes.forEach(cloudMesh => {
        // Update age only if not transitioning and not raining
        if (cloudMesh.userData.transitionProgress >= 1 && !isRaining) {
            cloudMesh.userData.age += delta;

            // Update cloud properties based on age
            updateCloudProperties(cloudMesh, isRaining);
        }

        // Update time uniform
        cloudMesh.material.uniforms.time.value = elapsedTime;

        // Update cloud threshold for dissolve or reform
        if (cloudMesh.userData.transitionProgress < 1) {
            // Transition in progress
            cloudMesh.userData.transitionProgress += delta / 2; // Adjust speed as needed
            if (cloudMesh.userData.transitionProgress > 1) {
                cloudMesh.userData.transitionProgress = 1;
            }

            const t = cloudMesh.userData.transitionProgress;

            // Interpolate threshold
            cloudMesh.material.uniforms.threshold.value = THREE.MathUtils.lerp(
                cloudMesh.userData.initialThreshold,
                cloudMesh.userData.targetThreshold,
                t
            );

            // Interpolate scale
            cloudMesh.scale.lerpVectors(
                cloudMesh.userData.initialScale,
                cloudMesh.userData.targetScale,
                t
            );

            // Interpolate color
            cloudMesh.material.uniforms.base.value.lerpColors(
                cloudMesh.userData.initialColor,
                cloudMesh.userData.targetColor,
                t
            );
        }

        // Modulate opacity over time
        const opacityCycle = Math.sin(elapsedTime * 0.1 + cloudMesh.userData.opacityOffset) * 0.5 + 0.5;
        let opacity = THREE.MathUtils.lerp(
            cloudMesh.userData.minOpacity,
            cloudMesh.userData.maxOpacity,
            opacityCycle
        );

        // Adjust opacity during formation and dispersal
        const age = cloudMesh.userData.age;
        const formationTime = cloudMesh.userData.formationTime;
        const dispersalTime = cloudMesh.userData.dispersalTime;
        const lifeTime = cloudMesh.userData.lifeTime;

        if (age < formationTime) {
            // Fade in during formation
            const formationAgeRatio = age / formationTime;
            opacity *= formationAgeRatio;
        } else if (age > (lifeTime - dispersalTime)) {
            // Fade out during dispersal
            const dispersalAge = age - (lifeTime - dispersalTime);
            const dispersalAgeRatio = dispersalAge / dispersalTime;
            opacity *= (1 - dispersalAgeRatio);
        }

        cloudMesh.material.uniforms.opacity.value = opacity;

        // Drift movement
        cloudMesh.position.addScaledVector(cloudMesh.userData.driftSpeed, delta);

        // Wrap position
        if (cloudMesh.position.x > 5000) {
            cloudMesh.position.x = -5000;
        }
    });

    // Update rain particles if they exist
    if (rainParticles) {
        updateRainParticles(delta);
    }

    // Update large rain cloud if it exists
    if (largeRainCloud) {
        // Update time uniform
        largeRainCloud.material.uniforms.time.value = elapsedTime;

        // Update threshold for accumulation or dissolve
        if (largeRainCloud.userData.transitionProgress < 1) {
            largeRainCloud.userData.transitionProgress += delta / 2; // Adjust speed as needed
            if (largeRainCloud.userData.transitionProgress > 1) {
                largeRainCloud.userData.transitionProgress = 1;
                // Start rain particles once the cloud has fully formed
                if (largeRainCloud.userData.isAccumulating && !rainParticles) {
                    createRainParticles();
                }
            }

            const t = largeRainCloud.userData.transitionProgress;

            // Interpolate threshold
            largeRainCloud.material.uniforms.threshold.value = THREE.MathUtils.lerp(
                largeRainCloud.userData.initialThreshold,
                largeRainCloud.userData.targetThreshold,
                t
            );
        }

        // If dissolving and transition is complete, remove the large cloud
        if (largeRainCloud.userData.isDissolving && largeRainCloud.userData.transitionProgress >= 1) {
            scene.remove(largeRainCloud);
            largeRainCloud = null;
        }
    }

    // Animate the noiseOffset to create twinkling effect
    if (skysphere && skysphere.material.uniforms.noiseOffset) {
        // Increment the noiseOffset based on noiseSpeed and deltaTime
        skysphere.material.uniforms.noiseOffset.value.x += skysphere.material.uniforms.noiseSpeed.value * delta;
        skysphere.material.uniforms.noiseOffset.value.y += skysphere.material.uniforms.noiseSpeed.value * delta;

        // Wrap around the noiseOffset to prevent UV overflow
        if (skysphere.material.uniforms.noiseOffset.value.x > 1.0) {
            skysphere.material.uniforms.noiseOffset.value.x -= 1.0;
        }
        if (skysphere.material.uniforms.noiseOffset.value.y > 1.0) {
            skysphere.material.uniforms.noiseOffset.value.y -= 1.0;
        }
    }

    renderer.render(scene, camera);
}


