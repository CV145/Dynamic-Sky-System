import * as THREE from 'three';

let starTexture, skysphere, noiseTexture;

// Load the star texture
const loader = new THREE.TextureLoader();
loader.load('./assets/textures/stars2.jpg', (texture) => {
    starTexture = texture;
    starTexture.wrapS = THREE.RepeatWrapping;
    starTexture.wrapT = THREE.RepeatWrapping;
    starTexture.repeat.set(2, 2);  // Adjust texture repeat for better star distribution

    // Update skysphere shader material with star texture after it's loaded
    if (skysphere && skysphere.material.uniforms.starTexture) {
        skysphere.material.uniforms.starTexture.value = starTexture;
        skysphere.material.needsUpdate = true;
    }
});

loader.load('./assets/textures/noise3.png', (texture) => {
    noiseTexture = texture;
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;
    noiseTexture.repeat.set(4, 4); // Adjust repeat based on desired variation

    // Update skysphere material with noise texture after it's loaded
    if (skysphere && skysphere.material.uniforms.noiseTexture) {
        skysphere.material.uniforms.noiseTexture.value = noiseTexture;
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
            noiseTexture: { value: noiseTexture },
            nightFactor: { value: 0.0 },  // Control how much the stars appear
            scaleU: { value: 20.0 },
            scaleV: { value: 20.0 },
            noiseOffset: { value: new THREE.Vector2(0.0, 0.0) }, // Initial noise offset
            noiseSpeed: { value: 0.01 }, // Noise animation speed
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
uniform sampler2D noiseTexture; // Noise texture
uniform float scaleU;
uniform float scaleV;

uniform vec2 noiseOffset; // Current noise offset
uniform float noiseSpeed; // Speed of noise animation

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
    float u = (atan(vWorldPosition.z, vWorldPosition.x) / (2.0 * 3.14159265359) + 0.5) * scaleU;
    float v = (acos(vWorldPosition.y) / 3.14159265359) * scaleV;
    vec2 uv = vec2(u, v);

    // Apply noiseOffset to UV coordinates for animation
    vec2 animatedUV = uv + noiseOffset;

    // Sample star texture using UV coordinates
    vec4 starLayer = texture2D(starTexture, animatedUV); //place a color of the star texture at this pixel

    // Sample noise texture to introduce randomness
    vec4 noiseLayer = texture2D(noiseTexture, animatedUV);

    // Control star visibility: fade out stars towards both the top and bottom
    // Define fade regions
    float lowerFadeStart = 0.43; // Start fading out at lower heightFactor
    float lowerFadeEnd = 0.6;   // Completely faded out at lowerFadeEnd

    float upperFadeStart = 0.6; // Start fading out at upper heightFactor
    float upperFadeEnd = 0.999;   // Completely faded out at upperFadeEnd

    // Control star visibility: only show stars in the upper portion of the skysphere (top dome). Result is between 1 and 0
    // Apply fading to the stars based on height (so they fade out towards the bottom of the dome)

    // Calculate lower fade factor (fading out towards bottom)
    float lowerFade = 1.0;
    if (heightFactor < lowerFadeEnd) {
        lowerFade = smoothstep(lowerFadeStart, lowerFadeEnd, heightFactor);
    }

    //Like sky color gradient, heightFactor controls the level at which the star textured pixel appears 

    // Calculate upper fade factor (fading out towards top)
    float upperFade = 1.0;
    if (heightFactor > upperFadeStart) {
        upperFade = smoothstep(upperFadeEnd, upperFadeStart, heightFactor);
    }

    
    float fadeFactor = lowerFade * upperFade; // Adjust the 0.4 to control where the stars fade

    // Incorporate noise to break up tiling
    // You can adjust the influence of noise by scaling it
    float noiseInfluence = 0.8; // Between 0.0 and 1.0
    fadeFactor *= (1.0 + noiseInfluence * (noiseLayer.r - 0.5));

    // Ensure fadeFactor stays within [0.0, 1.0]
    fadeFactor = clamp(fadeFactor, 0.0, 1.0);
    
    // Only fade the stars using fadeFactor, while keeping the skyColor untouched
    vec4 finalStarLayer = starLayer * nightFactor * fadeFactor;

    // Combine the sky color with the star layer rendered on top
    gl_FragColor = skyColor + finalStarLayer; // Add the stars on top of the sky
}

        `,
        side: THREE.BackSide,  // Render inside the sphere for a skysphere effect
        blending: THREE.AdditiveBlending, // For smoother star blending
        transparent: true,              // Required for blending
    };

    const skysphereMaterial = new THREE.ShaderMaterial(skysphereShader);
    const skysphereGeometry = new THREE.SphereGeometry(5000, 64, 64);  // Use a large sphere with high segments for smoothness
    const skysphereMesh = new THREE.Mesh(skysphereGeometry, skysphereMaterial);

    skysphere = skysphereMesh;  // Save the skysphere mesh for updating colors later

    return skysphereMesh;
}

// Update the skysphere color based on time of day (normalized from 0 to 1)
export function updateSkysphereColors(normalizedTime, skysphere) {
    const dayTopColor = new THREE.Color(0xa9dff5);  // Light sky blue for midday (top)
    const dayBottomColor = new THREE.Color(0x3b809c);  // Pale blue for midday (bottom)

    const nightTopColor = new THREE.Color(0x411e52);  // Dark blue for night (top)
    const nightBottomColor = new THREE.Color(0x281133);  // Black for night (bottom)

    const sunsetTopColor = new THREE.Color(0x87CEEB);  // Golden color for sunset (top)
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
    if (normalizedTime >= sunsetStart && normalizedTime <= sunsetEnd) {
        const sunsetProgress = (normalizedTime - sunsetStart) / (sunsetEnd - sunsetStart);

        // Smooth transition from day to sunset
        if (sunsetProgress < 0.5) {
            // First half of sunset transition: Day to Sunset
            const dayToSunset = sunsetProgress * 2.0;  // Scale from 0 to 1 for day to sunset
            topColor = dayTopColor.clone().lerp(sunsetTopColor, dayToSunset);
            bottomColor = dayBottomColor.clone().lerp(sunsetBottomColor, dayToSunset);
        } else {
            // Second half of sunset transition: Sunset to Night
            const sunsetToNight = (sunsetProgress - 0.5) * 2.0;  // Scale from 0 to 1 for sunset to night
            topColor = sunsetTopColor.clone().lerp(nightTopColor, sunsetToNight);
            bottomColor = sunsetBottomColor.clone().lerp(nightBottomColor, sunsetToNight);

            nightFactor = sunsetProgress;  // Gradually fade in the stars
        }
    }
    else if (normalizedTime >= sunriseStart && normalizedTime <= sunriseEnd) {
        const sunriseProgress = (normalizedTime - sunriseStart) / (sunriseEnd - sunriseStart);

        // Smooth transition from night to sunrise
        if (sunriseProgress < 0.5) {
            // First half of sunrise transition: Night to Sunrise
            const nightToSunrise = sunriseProgress * 2.0;  // Scale from 0 to 1 for night to sunrise
            topColor = nightTopColor.clone().lerp(sunriseTopColor, nightToSunrise);
            bottomColor = nightBottomColor.clone().lerp(sunriseBottomColor, nightToSunrise);
        } else {
            // Second half of sunrise transition: Sunrise to Day
            const sunriseToDay = (sunriseProgress - 0.5) * 2.0;  // Scale from 0 to 1 for sunrise to day
            topColor = sunriseTopColor.clone().lerp(dayTopColor, sunriseToDay);
            bottomColor = sunriseBottomColor.clone().lerp(dayBottomColor, sunriseToDay);
        }

        nightFactor = 1.0 - sunriseProgress;  // Gradually fade out the stars
    }
    else if (normalizedTime < sunriseStart || normalizedTime > sunsetEnd) {
        // Full Night
        topColor = nightTopColor;
        bottomColor = nightBottomColor;
        nightFactor = 1.0;  // Stars fully visible
    } else {
        // Full Day
        topColor = dayTopColor;
        bottomColor = dayBottomColor;
        nightFactor = 0.0;  // No stars during the day
    }


    // Update skysphere material
    skysphere.material.uniforms.topColor.value.copy(topColor);
    skysphere.material.uniforms.bottomColor.value.copy(bottomColor);
    skysphere.material.uniforms.nightFactor.value = nightFactor;

    skysphere.material.needsUpdate = true;
}
