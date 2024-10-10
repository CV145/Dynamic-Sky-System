import * as THREE from 'three';

// Create the skybox using ShaderMaterial
export function createSkybox() {
    const skyboxShader = {
        uniforms: {
            topColor: { value: new THREE.Color(0x87CEEB) },  // Light sky blue
            bottomColor: { value: new THREE.Color(0x000033) }  // Dark blue for night
        },
        vertexShader: `
            varying vec3 vWorldPosition;

            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;

                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,
        fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    varying vec3 vWorldPosition;

    void main() {
        float heightFactor = (normalize(vWorldPosition).y + 1.0) / 2.0;
        // Blend between bottomColor and topColor based on height factor
        gl_FragColor = vec4(mix(bottomColor, topColor, max(heightFactor, 0.0)), 1.0);
    }
`,
        side: THREE.BackSide,  // Render inside the box for a skybox effect
    };

    const skyboxMaterial = new THREE.ShaderMaterial(skyboxShader);
    const skyboxGeometry = new THREE.BoxGeometry(10000, 10000, 10000);  // Large enough to surround the scene
    const skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial);

    return skyboxMesh;
}

// Update the skybox color based on time of day (normalized from 0 to 1)
export function updateSkyboxColors(normalizedTime, skybox) {
    const dayTopColor = new THREE.Color(0x87CEEB);  // Light sky blue for midday (top)
    const dayBottomColor = new THREE.Color(0xB0E0E6);  // Pale blue for midday (bottom)

    const nightTopColor = new THREE.Color(0x000033);  // Dark blue for night (top)
    const nightBottomColor = new THREE.Color(0x000000);  // Black for night (bottom)

    const sunsetTopColor = new THREE.Color(0xffcc33);  // Golden color for sunset (top)
    const sunsetBottomColor = new THREE.Color(0xe6954e);  // Orange for sunset (bottom)

    const sunriseTopColor = new THREE.Color(0xffd700);  // Yellow for sunrise (top)
    const sunriseBottomColor = new THREE.Color(0xe6b04e);  // Orange for sunrise (bottom)

    // Time range for day phases (normalized between 0 and 1)
    const sunriseStart = 6 / 24;   // 6:00 AM
    const sunriseEnd = 7 / 24;     // 7:00 AM
    const sunsetStart = 18 / 24;   // 6:00 PM
    const sunsetEnd = 20 / 24;     // 8:00 PM

    let topColor, bottomColor;

    // Determine the skybox colors based on time of day
    if (normalizedTime < sunriseStart || normalizedTime > sunsetEnd) {
        // Night (before 6:00 AM or after 8:00 PM)
        topColor = nightTopColor;
        bottomColor = nightBottomColor;
    } else if (normalizedTime >= sunriseStart && normalizedTime <= sunriseEnd) {
        // Sunrise transition (6:00 AM to 7:00 AM)
        const sunriseMidpoint = (sunriseStart + sunriseEnd) / 2;  // Midpoint between 6:00 AM and 7:00 AM

        let sunriseProgress;
        if (normalizedTime <= sunriseMidpoint) {
            // Night to Sunrise transition (6:00 AM to 6:30 AM)
            sunriseProgress = (normalizedTime - sunriseStart) / (sunriseMidpoint - sunriseStart);
            topColor = nightTopColor.clone().lerp(sunriseTopColor, sunriseProgress);  // Transition from night to sunrise (top)
            bottomColor = nightBottomColor.clone().lerp(sunriseBottomColor, sunriseProgress);  // Transition from night to sunrise (bottom)
        } else {
            // Sunrise to Day transition (6:30 AM to 7:00 AM)
            sunriseProgress = (normalizedTime - sunriseMidpoint) / (sunriseEnd - sunriseMidpoint);
            topColor = sunriseTopColor.clone().lerp(dayTopColor, sunriseProgress);  // Transition from sunrise to day (top)
            bottomColor = sunriseBottomColor.clone().lerp(dayBottomColor, sunriseProgress);  // Transition from sunrise to day (bottom)
        }
    } else if (normalizedTime >= sunsetStart && normalizedTime <= sunsetEnd) {
        // Sunset transition (6:00 PM to 8:00 PM)
        const sunsetMidpoint = (sunsetStart + sunsetEnd) / 2;  // Midpoint between 6:00 PM and 8:00 PM

        let sunsetProgress;
        if (normalizedTime <= sunsetMidpoint) {
            // Day to Sunset transition (6:00 PM to 7:00 PM)
            sunsetProgress = (normalizedTime - sunsetStart) / (sunsetMidpoint - sunsetStart);
            topColor = dayTopColor.clone().lerp(sunsetTopColor, sunsetProgress);  // Transition from day to sunset (top)
            bottomColor = dayBottomColor.clone().lerp(sunsetBottomColor, sunsetProgress);  // Transition from day to sunset (bottom)
        } else {
            // Sunset to Night transition (7:00 PM to 8:00 PM)
            sunsetProgress = (normalizedTime - sunsetMidpoint) / (sunsetEnd - sunsetMidpoint);
            topColor = sunsetTopColor.clone().lerp(nightTopColor, sunsetProgress);  // Transition from sunset to night (top)
            bottomColor = sunsetBottomColor.clone().lerp(nightBottomColor, sunsetProgress);  // Transition from sunset to night (bottom)
        }
    } else {
        // Daytime (7:00 AM to 6:00 PM): Full day color (light blue)
        topColor = dayTopColor;
        bottomColor = dayBottomColor;
    }

    console.log("Top Color before update:", topColor);
    console.log("Bottom Color before update:", bottomColor);

    skybox.material.uniforms.topColor.value.copy(topColor);
    skybox.material.uniforms.bottomColor.value.copy(bottomColor);

    skybox.material.needsUpdate = true;

    console.log("Updated Top Color:", skybox.material.uniforms.topColor.value);
    console.log("Updated Bottom Color:", skybox.material.uniforms.bottomColor.value);
}


