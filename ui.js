export function setupUI(onTimeOfDayChanged) {
    // Create a container for the slider and label
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.color = 'black';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.display = 'inline-flex';  // Keep everything on one line
    container.style.alignItems = 'center';    // Vertically align items

    // Create a label to display the current time
    const label = document.createElement('span');
    label.innerHTML = 'Time: 12:00';
    label.style.width = '80px';  // Fixed width to prevent shifting
    label.style.marginRight = '10px';  // Space between label and slider
    label.style.whiteSpace = 'nowrap';  // Prevent label from wrapping

    // Create the slider input
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 6;       // Minimum time 6 AM
    slider.max = 18;      // Maximum time 6 PM
    slider.step = 0.1;    // Step in tenths of an hour (e.g., 10 minutes)
    slider.value = 12;    // Midday by default
    slider.style.flex = '1';  // Make slider flexible and occupy remaining space

    // Update the label and notify the main program when the slider is adjusted
    slider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        const hours = Math.floor(value);
        const minutes = Math.floor((value - hours) * 60);

        // Update the label to show the current time
        label.innerHTML = `Time: ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;

        // Call the provided callback function to update the sun position
        onTimeOfDayChanged(value);
    });

    // Add the label and slider to the container
    container.appendChild(label);
    container.appendChild(slider);

    // Add the container to the document
    document.body.appendChild(container);
}
