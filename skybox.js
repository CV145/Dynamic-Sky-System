import * as THREE from 'three';

let starTexture, skysphere;

// Load the star texture
const loader = new THREE.TextureLoader();
loader.load('./assets/textures/stars.jpg', (texture) => {
    starTexture = texture;
    starTexture.wrapS = THREE.RepeatWrapping;
    starTexture.wrapT = THREE.RepeatWrapping;
    starTexture.repeat.set(500, 500);  // Adjust texture repeat for better star distribution

    // Update skysphere shader material with star texture after it's loaded
    if (skysphere && skysphere.material.uniforms.starTexture) {
        skysphere.material.uniforms.starTexture.value = starTexture;
        skysphere.material.needsUpdate = true;
    }
});

// Create the skysphere using ShaderMaterial
export function createSkysphere() {
    const skysphereShader = {
        uniforms: {
            topColor: { value: new THREE.Color(0x87CEEB) },  // Light sky blue
            bottomColor: { value: new THREE.Color(0x000033) },  // Dark blue for night
            starTexture: { value: starTexture },  // Star texture
            nightFactor: { value: 0.0 }  // Control how much the stars appear
        },
        vertexShader: `
//Shader programs run once for each vertex and fragment

            varying vec3 vWorldPosition;

            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = normalize(worldPosition.xyz);  // Normalize for spherical coordinates

                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,
        fragmentShader: `

        //Uniforms are global GLSL variables set in javascript
uniform vec3 topColor;
uniform vec3 bottomColor; //color near the horizon
uniform sampler2D starTexture;
uniform float nightFactor; //0 - day, 1 - night (stars appear)

//varying variable is passed from the vertex shader
varying vec3 vWorldPosition; //position of the fragment(pixel) in world coordinates

void main() {
    // Calculate height factor for gradient blending (interpolate between top and bottom sky colors)
    float heightFactor = (vWorldPosition.y + 1.0) / 2.0;

    //Each pixel (fragment) has a height factor which determines the level of gradient color it is at. Height factor changes depending on world position y

    // Blend between bottomColor and topColor based on height factor
    vec4 skyColor = vec4(mix(bottomColor, topColor, heightFactor), 1.0); // vec4 = RGBA with alpha 1
    //mix(color1, color2, heightFactor). heightFactor 0 means 100% of color1, 0.5 means result is 50% of both colors

    //3D pixel world position -> spherical coordinates
    // Spherical coordinates to UV mapping for star texture
    float u = atan(vWorldPosition.z, vWorldPosition.x) / (2.0 * 3.14159265359) + 0.5;
    float v = acos(vWorldPosition.y) / 3.14159265359;
    vec2 uv = vec2(u, v);

    // Sample star texture using UV coordinates
    vec4 starLayer = texture2D(starTexture, uv); //place a color of the star texture at this pixel

    // Control star visibility: only show stars in the upper portion of the skysphere (top dome). Result is between 1 and 0
    float starVisibility = smoothstep(0.4, 1.0, heightFactor); 
    //Like sky color gradient, heightFactor controls the level at which the star textured pixel appears 

    // Blend the stars with the sky based on nightFactor and star visibility. skyColor is the color blended with bottom and top
    gl_FragColor = mix(skyColor, starLayer * starVisibility, nightFactor);
}

        `,
        side: THREE.BackSide  // Render inside the sphere for a skysphere effect
    };

    const skysphereMaterial = new THREE.ShaderMaterial(skysphereShader);
    const skysphereGeometry = new THREE.SphereGeometry(5000, 64, 64);  // Use a large sphere with high segments for smoothness
    const skysphereMesh = new THREE.Mesh(skysphereGeometry, skysphereMaterial);

    skysphere = skysphereMesh;  // Save the skysphere mesh for updating colors later

    return skysphereMesh;
}

// Update the skysphere color based on time of day (normalized from 0 to 1)
export function updateSkysphereColors(normalizedTime, skysphere) {
    const dayTopColor = new THREE.Color(0x87CEEB);  // Light sky blue for midday (top)
    const dayBottomColor = new THREE.Color(0x3b809c);  // Pale blue for midday (bottom)

    const nightTopColor = new THREE.Color(0x000033);  // Dark blue for night (top)
    const nightBottomColor = new THREE.Color(0x000000);  // Black for night (bottom)

    const sunsetTopColor = new THREE.Color(0xffcc33);  // Golden color for sunset (top)
    const sunsetBottomColor = new THREE.Color(0xe6954e);  // Orange for sunset (bottom)

    const sunriseTopColor = new THREE.Color(0x87CEEB);  // Yellow for sunrise (top)
    const sunriseBottomColor = new THREE.Color(0xe6b04e);  // Orange for sunrise (bottom)

    // Time range for day phases (normalized between 0 and 1)
    const sunriseStart = 6 / 24;
    const sunriseEnd = 7 / 24;
    const sunsetStart = 17 / 24;
    const sunsetEnd = 20 / 24;

    let topColor, bottomColor;
    let nightFactor = 0.0;

    // Determine the sky colors based on the time of day
    if (normalizedTime < sunriseStart || normalizedTime > sunsetEnd) {
        topColor = nightTopColor;
        bottomColor = nightBottomColor;
        nightFactor = 1.0;  // Show stars at night
    } else if (normalizedTime >= sunriseStart && normalizedTime <= sunriseEnd) {
        const sunriseProgress = (normalizedTime - sunriseStart) / (sunriseEnd - sunriseStart);
        topColor = nightTopColor.clone().lerp(sunriseTopColor, sunriseProgress);
        bottomColor = nightBottomColor.clone().lerp(sunriseBottomColor, sunriseProgress);
        nightFactor = 1.0 - sunriseProgress;
    } else if (normalizedTime >= sunsetStart && normalizedTime <= sunsetEnd) {
        const sunsetProgress = (normalizedTime - sunsetStart) / (sunsetEnd - sunsetStart);
        topColor = dayTopColor.clone().lerp(sunsetTopColor, sunsetProgress);
        bottomColor = dayBottomColor.clone().lerp(sunsetBottomColor, sunsetProgress);
        nightFactor = sunsetProgress;
    } else {
        topColor = dayTopColor;
        bottomColor = dayBottomColor;
    }

    // Update skysphere material
    skysphere.material.uniforms.topColor.value.copy(topColor);
    skysphere.material.uniforms.bottomColor.value.copy(bottomColor);
    skysphere.material.uniforms.nightFactor.value = nightFactor;

    skysphere.material.needsUpdate = true;
}
