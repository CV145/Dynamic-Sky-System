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
        float heightFactor = normalize(vWorldPosition).y;
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
    const dayColor = new THREE.Color(0x87CEEB);  // Light sky blue for midday
    const nightColor = new THREE.Color(0x000033);  // Dark blue for night
    const sunsetColor = new THREE.Color(0xe6954e);  // Orange for sunset
    const sunriseColor = new THREE.Color(0xe6b04e);  // Yellow for sunrise

    // Time range for day phases (normalized between 0 and 1)
    const sunriseStart = 6 / 24;   // 6:00 AM
    const sunriseEnd = 7 / 24;     // 7:00 AM
    const sunsetStart = 18 / 24;   // 6:00 PM
    const sunsetEnd = 20 / 24;     // 8:00 PM

    let topColor, bottomColor;

    // Determine the skybox colors based on time of day
    if (normalizedTime < sunriseStart || normalizedTime > sunsetEnd) {
        // Night (before 6:00 AM or after 8:00 PM)
        topColor = nightColor;
        bottomColor = nightColor;
    } else if (normalizedTime >= sunriseStart && normalizedTime <= sunriseEnd) {
        // Sunrise transition (6:00 AM to 7:00 AM)
        const sunriseMidpoint = (sunriseStart + sunriseEnd) / 2;  // Midpoint between 6:00 AM and 7:00 AM

        let sunriseProgress;
        if (normalizedTime <= sunriseMidpoint) {
            // Night to Sunrise transition (6:00 AM to 6:30 AM)
            sunriseProgress = (normalizedTime - sunriseStart) / (sunriseMidpoint - sunriseStart);
            topColor = nightColor.clone().lerp(sunriseColor, sunriseProgress);  // Transition from night to sunrise
            bottomColor = topColor;
        } else {
            // Sunrise to Day transition (6:30 AM to 7:00 AM)
            sunriseProgress = (normalizedTime - sunriseMidpoint) / (sunriseEnd - sunriseMidpoint);
            topColor = sunriseColor.clone().lerp(dayColor, sunriseProgress);  // Transition from sunrise to day
            bottomColor = topColor;
        }
    } else if (normalizedTime >= sunsetStart && normalizedTime <= sunsetEnd) {
        // Sunset transition (6:00 PM to 8:00 PM)
        const sunsetMidpoint = (sunsetStart + sunsetEnd) / 2;  // Midpoint between 6:00 PM and 8:00 PM

        let sunsetProgress;
        if (normalizedTime <= sunsetMidpoint) {
            // Day to Sunset transition (6:00 PM to 7:00 PM)
            sunsetProgress = (normalizedTime - sunsetStart) / (sunsetMidpoint - sunsetStart);
            topColor = dayColor.clone().lerp(sunsetColor, sunsetProgress);  // Transition from day to sunset
            bottomColor = topColor;
        } else {
            // Sunset to Night transition (7:00 PM to 8:00 PM)
            sunsetProgress = (normalizedTime - sunsetMidpoint) / (sunsetEnd - sunsetMidpoint);
            topColor = sunsetColor.clone().lerp(nightColor, sunsetProgress);  // Transition from sunset to night
            bottomColor = topColor;
        }
    } else {
        // Daytime (7:00 AM to 6:00 PM): Full day color (light blue)
        topColor = dayColor;
        bottomColor = topColor;
    }

    console.log("Top Color:", topColor);
    console.log("Bottom Color:", bottomColor);

    // Update the skybox material colors
    skybox.material.uniforms.topColor.value.copy(topColor);
    skybox.material.uniforms.bottomColor.value.copy(bottomColor);
    //skybox.material.uniforms.topColor.value.set(0xff0000);  // Red
    //skybox.material.uniforms.bottomColor.value.set(0x0000ff);  // Blue



    console.log("Updated Top Color:", skybox.material.uniforms.topColor.value);
    console.log("Updated Bottom Color:", skybox.material.uniforms.bottomColor.value);

    skybox.material.needsUpdate = true;

}

