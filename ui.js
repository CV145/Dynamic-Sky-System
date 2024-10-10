export function setupUI(onTimeOfDayChanged) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.color = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';

    /*const label = document.createElement('span');
    label.innerHTML = 'Time: 12:00';
    label.style.width = '80px';
    label.style.marginRight = '10px';
    label.style.whiteSpace = 'nowrap';*/

    // Add an input field for typing the desired time
    const timeInput = document.createElement('input');
    timeInput.type = 'text';
    timeInput.value = '12:00';
    timeInput.style.marginLeft = '10px';
    timeInput.style.width = '50px';
    timeInput.style.textAlign = 'center';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;       // Minimum time 0 hours (midnight)
    slider.max = 23;      // Maximum time 23 hours (just before midnight)
    slider.step = 0.1;    // Step in tenths of an hour (6 minutes)
    slider.value = 12;    // Default value is midday
    slider.style.flex = '1';

    // Function to update the label, slider, and input field
    function updateTimeUI(value) {
        const hours = Math.floor(value);
        const minutes = Math.floor((value - hours) * 60);

        //label.innerHTML = `Time: ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
        timeInput.value = `${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
        slider.value = value;
        onTimeOfDayChanged(value);
    }

    // Event listener for slider input
    slider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        updateTimeUI(value);
    });

    // Event listener for typing in the time manually
    timeInput.addEventListener('change', () => {
        const timeParts = timeInput.value.split(':');
        let hours = parseInt(timeParts[0], 10);
        let minutes = parseInt(timeParts[1], 10);

        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            alert('Please enter a valid time in the format HH:MM');
            return;
        }

        // Convert typed time to the slider's scale (hours + fraction of minutes)
        const value = hours + minutes / 60;
        updateTimeUI(value);
    });

    //container.appendChild(label);
    container.appendChild(timeInput);
    container.appendChild(slider);
    document.body.appendChild(container);
}
