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

    const label = document.createElement('span');
    label.innerHTML = 'Time: 12:00';
    label.style.width = '80px';
    label.style.marginRight = '10px';
    label.style.whiteSpace = 'nowrap';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;       // Minimum time 0 hours (midnight)
    slider.max = 23;      // Maximum time 23 hours (just before midnight)
    slider.step = 0.1;    // Step in tenths of an hour (6 minutes)
    slider.value = 12;    // Default value is midday
    slider.style.flex = '1';

    slider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        const hours = Math.floor(value);
        const minutes = Math.floor((value - hours) * 60);

        label.innerHTML = `Time: ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
        onTimeOfDayChanged(value);
    });

    container.appendChild(label);
    container.appendChild(slider);
    document.body.appendChild(container);
}
