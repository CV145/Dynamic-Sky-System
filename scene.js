//Scene setup

import * as THREE from 'three';

export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x555555);
    scene.add(ambientLight);

    return scene;
}

export function createSunLight() {
    // Sunlight as DirectionalLight
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);

    // Same as the sunSphere, position it far away
    sunLight.position.set(500, 300, 0);
    sunLight.castShadow = true;

    return sunLight;
}


export function createHemisphereLight() {
    // HemisphereLight(skyColor, groundColor, intensity)
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.6);  // Sky color, Ground color, lower intensity for ambient light
    return hemisphereLight;
}

export function createSunSphere() {
    // Create a glowing sphere to represent the sun
    const sunGeometry = new THREE.SphereGeometry(10, 32, 32);  // Smaller sun sphere
    const sunMaterial = new THREE.MeshPhongMaterial({
        color: 0xffdd33,  // Initial sun color (yellowish)
        emissive: 0xffcc00,  // Glow effect (emissive color)
        emissiveIntensity: 0.5,
        transparent: true,  // Allow transparency for smooth fading
        opacity: 1  // Start fully visible
    });
    const sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);

    // Position the sun sphere far away
    sunSphere.position.set(500, 300, 0);
    return sunSphere;
}


export function updateSunAppearance(normalizedTime, sunSphere, sunLight) {
    const sunriseColor = new THREE.Color(0xff4500);  // Red for sunrise
    const dayColor = new THREE.Color(0xffdd33);      // Yellow for midday
    const sunsetColor = new THREE.Color(0xff5500);   // Orange for sunset
    const nightColor = new THREE.Color(0x000000);    // Black for night

    let sunColor;
    let intensity;

    // Define the time ranges (normalized time corresponds to [0,1] across 24 hours)
    const sunriseStart = 6 / 24;   // 6:00 AM
    const sunriseEnd = 7 / 24;     // 7:00 AM
    const sunsetStart = 19 / 24;   // 7:00 PM
    const sunsetEnd = 20 / 24;     // 8:00 PM

    // Determine sun color and intensity based on time of day
    if (normalizedTime < sunriseStart || normalizedTime > sunsetEnd) {
        // Night (before 6 AM and after 8 PM)
        sunColor = nightColor;
        intensity = 0;  // No light during the night
        sunSphere.material.opacity = 0;  // Fully transparent at night
    } else if (normalizedTime >= sunriseStart && normalizedTime <= sunriseEnd) {
        // Sunrise (6:00 AM to 7:00 AM): Red to yellow
        const sunriseProgress = (normalizedTime - sunriseStart) / (sunriseEnd - sunriseStart);
        sunColor = sunriseColor.clone().lerp(dayColor, sunriseProgress);
        intensity = Math.max(0.2, sunriseProgress);  // Gradually increase intensity
        sunSphere.material.opacity = intensity;  // Fade in the sun
    } else if (normalizedTime >= sunsetStart && normalizedTime <= sunsetEnd) {
        // Sunset (7:00 PM to 8:00 PM): Yellow to orange, fading to night
        const sunsetProgress = (normalizedTime - sunsetStart) / (sunsetEnd - sunsetStart);
        sunColor = dayColor.clone().lerp(sunsetColor, sunsetProgress);
        intensity = Math.max(0.2, 1 - sunsetProgress);  // Gradually decrease intensity
        sunSphere.material.opacity = intensity;  // Fade out the sun
    } else {
        // Daytime (7:00 AM to 7:00 PM): Full yellow color
        sunColor = dayColor;
        intensity = 1;  // Full intensity during the day
        sunSphere.material.opacity = 1;  // Fully visible
    }

    // Apply the color to the sun sphere material
    sunSphere.material.color.set(sunColor);

    // Adjust the sun's emissive color for the glowing effect
    sunSphere.material.emissive.set(sunColor);

    // Adjust the intensity of the sun's light
    sunLight.intensity = intensity;

    // Ensure the sun sphere is visible when necessary
    sunSphere.visible = intensity > 0;
}




