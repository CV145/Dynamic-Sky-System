// clouds.js

import * as THREE from 'three'; //The core Three.js library
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'; //A utility from Three.js addons that provides Perlin noise generation, useful for creating natural-looking patterns.

// Shader code as strings
const vertexShader = `
//Specifies high precision for floating-point calculations
precision highp float;

//Receives the position of each vertex from the geometry
in vec3 position;

//Transforms local vertex coordinates to world coordinates
uniform mat4 modelMatrix;

//Transforms world coordinates to camera (view) coordinates
uniform mat4 modelViewMatrix;

//Projects 3D coordinates onto the 2D screen
uniform mat4 projectionMatrix;

//Provides camera position in world space
uniform vec3 cameraPos;

//Passes the camera position to the fragment shader
out vec3 vOrigin;

//Passes the direction from the camera to the vertex
out vec3 vDirection;

void main() {

    //Transforms vertex position to view space
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    //Assign camera position
    vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;

    //Compute direction vector from camera to vertex
    vDirection = position - vOrigin;
    
    //This is the vertex's position on the screen
    gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
precision highp float;

//High precision for 3D texture sampling
precision highp sampler3D;

//3D texture containing noise data for cloud density
uniform sampler3D map;

//Base color of the clouds
uniform vec3 base;

//Density threshold for cloud formation
uniform float threshold;

//Softness of density threshold
uniform float range;

//Cloud opacity
uniform float opacity;

//# of ray marching steps for rendering
uniform float steps;

//Current animation frame
uniform float frame;

uniform float time;

in vec3 vOrigin; //Origin of ray (camera position)
in vec3 vDirection; //Direction of ray from camera through vertex

//Final pixel color output
out vec4 fragColor;

// Hash function for random number generation
uint wang_hash(uint seed) {
    seed = (seed ^ 61u) ^ (seed >> 16u);
    seed *= 9u;
    seed = seed ^ (seed >> 4u);
    seed *= 0x27d4eb2du;
    seed = seed ^ (seed >> 15u);
    return seed;
}

//Converts hashed seed into a float between 0 and 1
float randomFloat(inout uint seed) {
    return float(wang_hash(seed)) / 4294967296.;
}

vec2 hitBox(vec3 orig, vec3 dir) {
    const vec3 box_min = vec3(-0.5);
    const vec3 box_max = vec3(0.5);
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
}

//Sample the 3D texture at a given point to get the density value
float sample1(vec3 p) {
    //The coordinate is modified with time to animate the noise
    vec3 coord = p + vec3(time * 0.01);
    return texture(map, p).r;
}

//Simple shading effect based on neighboring density samples
float shading(vec3 coord) {
    float step = 0.01;
    return sample1(coord + vec3(-step)) - sample1(coord + vec3(step));
}

//Convert RGB value to sRGB 
vec4 linearToSRGB(in vec4 value) {
    return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.a);
}

void main(){

    //Unit vector
    vec3 rayDir = normalize(vDirection);
    vec3 rayOrigin = vOrigin;
    vec2 bounds = hitBox(rayOrigin, rayDir);
    
    //Discard if no intersection
    if (bounds.x > bounds.y) discard;
    
    //Clamp the starting point to prevent marching outside
    bounds.x = max(bounds.x, 0.0);
    
    vec3 p = rayOrigin + bounds.x * rayDir;
    vec3 inc = 1.0 / abs(rayDir);
    float delta = min(inc.x, min(inc.y, inc.z));
    delta /= steps;
    
    // Jitter
    uint seed = uint(gl_FragCoord.x) * uint(1973) + uint(gl_FragCoord.y) * uint(9277) + uint(frame) * uint(26699);
    vec3 size = vec3(textureSize(map, 0));
    float randNum = randomFloat(seed) * 2.0 - 1.0;
    p += rayDir * randNum * (1.0 / size);
    
    vec4 ac = vec4(base, 0.0);
    
    for (float t = bounds.x; t < bounds.y; t += delta) {
        float d = sample1(p + 0.5);
        
        d = smoothstep(threshold - range, threshold + range, d) * opacity;
        
        //float col = shading( p + 0.5 ) * 3.0 + ( ( p.x + p.y ) * 0.25 ) + 0.2;
        float col = shading( p + 0.5 ) * 1.0 + ( ( p.x + p.y ) * 0.1 ) + 0.1;
        col = max(col, 0.0); //Ensure color is not negative
        
        //Accumulate color and opacity
        ac.rgb += (1.0 - ac.a) * d * col;
        ac.a += (1.0 - ac.a) * d;
        
        if (ac.a >= 0.95) break;
        
        p += rayDir * delta;
    }
    
    fragColor = linearToSRGB(ac);
    
    if (fragColor.a == 0.0) discard;
}
`;

// Generate noise data for the 3D texture
const size = 128;
const data = new Uint8Array(size * size * size);
let i = 0;
const scale = 0.05;
const perlin = new ImprovedNoise();
const vector = new THREE.Vector3();

for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const d = 1.0 - vector.set(x, y, z).subScalar(size / 2).divideScalar(size).length();
            data[i] = (128 + 128 * perlin.noise(x * scale, y * scale, z * scale)) * d * d; // Uniform noise scaling
            i++;
        }
    }
}

// Create the 3D texture
const texture = new THREE.Data3DTexture(data, size, size, size);
texture.format = THREE.RedFormat;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.unpackAlignment = 1;
texture.needsUpdate = true;

// Define the shader material
const baseMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
        base: { value: new THREE.Color(0x888888) },
        map: { value: texture },
        cameraPos: { value: new THREE.Vector3() },
        threshold: { value: 1.0 }, //1 = invisible cloud
        opacity: { value: 0.5 },
        range: { value: 0.1 },
        steps: { value: 100 },
        frame: { value: 0 },
        time: { value: 0 }
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
});

export function createVolumetricClouds(scene, numberOfClouds = 10) {

    // Create the cloud geometry (unit cube)
    const geometry = new THREE.BoxGeometry(1, 1, 1);

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

    // Define the range for cloud positions (e.g., within a sphere of radius 1000)
    const positionRange = new THREE.Vector3(5000, 5000, 2000);

    // Define minimum and maximum scales for the clouds
    const minScale = new THREE.Vector3(300, 200, 150);
    const maxScale = new THREE.Vector3(1000, 700, 550);

    //Array to hold cloud meshes
    const cloudMeshes = [];

    // Loop to create multiple cloud instances
    for (let i = 0; i < numberOfClouds; i++) {
        // Clone the base material for individual uniforms
        const material = baseMaterial.clone();

        // Optionally, vary the base color for each cloud for diversity
        const colorVariation = new THREE.Color();
        colorVariation.setHSL(Math.random() * 0.1 + 0.5, 0.5, 0.6); // Adjust hues as needed
        material.uniforms.base.value = colorVariation;

        // Create the cloud mesh
        const cloudMesh = new THREE.Mesh(geometry, material);

        // Assign a random position within the specified range
        cloudMesh.position.copy(getRandomPosition(positionRange));

        // Assign a random scale within the specified min and max
        cloudMesh.scale.copy(getRandomScale(minScale, maxScale));

        // Optionally, randomize rotation for added realism
        cloudMesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // Add the cloud mesh to the scene
        scene.add(cloudMesh);

        // Store the mesh for later updates
        cloudMeshes.push(cloudMesh);

        // Update uniforms before rendering
        cloudMesh.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
            material.uniforms.cameraPos.value.copy(camera.position);
        };
    }

    /*const material = baseMaterial.clone();
    // Create the cloud mesh
    const cloudMesh = new THREE.Mesh(geometry, material);

    // Assign a random position within the specified range
    cloudMesh.position.set(0, -500, 0);

    // Assign a random scale within the specified min and max
    cloudMesh.scale.set(10000, 50, 10000);

    // Update uniforms before rendering
    cloudMesh.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
        material.uniforms.cameraPos.value.copy(camera.position);
        material.uniforms.frame.value += 1.0;
    };

    scene.add(cloudMesh);*/

    return cloudMeshes;
}

export { baseMaterial };
