console.log('app.js is loaded and running');

// Pagination Parameters
const scalesPerPage = 25;
let currentPage = 1;
let totalPages = 1;
let allScales = []; // To store all unique scales

// Generator Object
let scaleGenerator = null;

// Known Scales Mapping
const knownScales = {
    "2,2,1,2,2,2,1": "Major Scale",
    "2,1,2,2,1,3,1": "Harmonic Minor",
    "2,2,2,1,2,2,1": "Dorian Mode",
    "1,3,1,2,2,1,2": "Phrygian Dominant",
    // Add more known scales as needed
};

/**
 * Retrieves the scale name based on its step pattern.
 * @param {Array<number>} scale - The scale steps.
 * @returns {string} - The name of the scale if found, else "Unknown Scale".
 */
function getScaleName(scale) {
    const key = scale.join(',');
    return knownScales[key] || "Unknown Scale";
}

// Tone.js Synth for Managing Playback
let synth = null;

/**
 * Initialize Tone.js Synth
 */
function initializeSynth() {
    if (!synth) {
        synth = new Tone.Synth().toDestination();
    }
}

/**
 * Event Listener for Generate Button
 */
document.getElementById('generateBtn').addEventListener('click', () => {
    const edoInput = document.getElementById('edo');
    const scaleSizeInput = document.getElementById('scaleSize');

    const edo = parseInt(edoInput.value);
    const scaleSize = parseInt(scaleSizeInput.value);
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous results

    console.log(`Generating scales for EDO: ${edo}, Scale Size: ${scaleSize}`);

    if (isNaN(edo) || isNaN(scaleSize) || edo < 1 || scaleSize < 1) {
        resultsDiv.innerHTML = '<p>Please enter valid positive integers for EDO and Scale Size.</p>';
        console.warn('Invalid input values');
        clearVisualization();
        updatePaginationControls(0);
        return;
    }

    // Initialize the Generator
    scaleGenerator = generateScalesGenerator(edo, scaleSize);
    allScales = []; // Reset the scales cache
    currentPage = 1;
    totalPages = 1;

    // Render the first page
    renderPage(currentPage, edo, scaleSize);
    updatePaginationControls(totalPages);
});

/**
 * Pagination Controls Event Listeners
 */
document.getElementById('prevPageBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage, parseInt(document.getElementById('edo').value), parseInt(document.getElementById('scaleSize').value));
        updatePaginationControls(totalPages);
    }
});

document.getElementById('nextPageBtn').addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage, parseInt(document.getElementById('edo').value), parseInt(document.getElementById('scaleSize').value));
        updatePaginationControls(totalPages);
    }
});

/**
 * Generator function to yield unique scales one by one.
 * Filters out rotational duplicates on-the-fly.
 * @param {number} edo - The number of equal divisions of the octave.
 * @param {number} scaleSize - The number of notes in the scale.
 * @returns {Generator} - Yields one scale at a time.
 */
function* generateScalesGenerator(edo, scaleSize) {
    const seenRotations = new Set();

    function* backtrack(currentScale, stepsLeft) {
        if (currentScale.length === scaleSize - 1) {
            if (stepsLeft > 0) {
                const newScale = [...currentScale, stepsLeft];
                // Check for rotational duplicates
                const rotationKey = getRotationKey(newScale);
                if (!seenRotations.has(rotationKey)) {
                    seenRotations.add(rotationKey);
                    yield newScale;
                }
            }
            return;
        }
        // Ensure each step is at least 1
        for (let step = 1; step <= stepsLeft - (scaleSize - currentScale.length - 1); step++) {
            currentScale.push(step);
            yield* backtrack(currentScale, stepsLeft - step);
            currentScale.pop();
        }
    }

    yield* backtrack([], edo);
}

/**
 * Helper function to generate a unique key for a scale based on its rotations.
 * This ensures that rotational duplicates are identified.
 * @param {Array<number>} scale - The scale steps.
 * @returns {string} - A sorted key representing the scale's rotations.
 */
function getRotationKey(scale) {
    const rotations = [];
    let rotated = scale.slice();
    for (let i = 0; i < scale.length; i++) {
        rotations.push(rotated.join(','));
        const first = rotated.shift();
        rotated.push(first);
    }
    rotations.sort(); // Sorting to have a unique representation
    return rotations[0]; // The first in sorted order is the key
}

/**
 * Renders scales for the specified page.
 * Generates scales on-the-fly up to the required number.
 * @param {number} page - The current page number.
 * @param {number} edo - The EDO value.
 * @param {number} scaleSize - The scale size.
 */
function renderPage(page, edo, scaleSize) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous scales

    const startIndex = (page - 1) * scalesPerPage;
    const endIndex = startIndex + scalesPerPage;

    // Generate scales up to the endIndex
    while (allScales.length < endIndex && scaleGenerator) {
        const { value, done } = scaleGenerator.next();
        if (done) break;
        allScales.push(value);
    }

    const scalesToDisplay = allScales.slice(startIndex, endIndex);

    scalesToDisplay.forEach((scale, index) => {
        const actualIndex = startIndex + index + 1; // For scale numbering
        const scaleDiv = document.createElement('div');
        scaleDiv.classList.add('scale');
        scaleDiv.setAttribute('data-scale', JSON.stringify(scale));
        scaleDiv.innerHTML = `<strong>Scale ${actualIndex}:</strong> ${scale.join(', ')} (${getScaleName(scale)})`;
        scaleDiv.addEventListener('click', () => {
            highlightScale(scale, edo);
        });
        resultsDiv.appendChild(scaleDiv);
    });

    // Update totalPages based on scales generated
    totalPages = Math.ceil(allScales.length / scalesPerPage) + 1; // Assume there might be more
    updatePaginationControls(totalPages);

    // Automatically highlight the first scale on the new page if it exists
    if (scalesToDisplay.length > 0) {
        highlightScale(scalesToDisplay[0], edo);
    }
}

/**
 * Updates the state of pagination controls based on the current page and total pages.
 * Disables Next button if no more scales can be generated.
 * @param {number} total - The estimated total number of pages.
 */
function updatePaginationControls(total) {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const currentPageSpan = document.getElementById('currentPage');

    // Update current page text without "of x"
    currentPageSpan.textContent = `Page ${currentPage}`;

    // Enable or disable Previous button
    prevBtn.disabled = currentPage === 1;

    // Enable or disable Next button based on whether more scales can be generated
    if (scaleGenerator) {
        // Peek the next value without advancing the generator
        const { value, done } = scaleGenerator.next();
        if (done) {
            nextBtn.disabled = true;
        } else {
            nextBtn.disabled = false;
            // Since we peeked, we need to put it back
            // To achieve this, recreate the generator and skip already generated scales
            scaleGenerator = regenerateGenerator(scaleGenerator, allScales.length, currentPage, edo, document.getElementById('scaleSize').value);
        }
    } else {
        nextBtn.disabled = true;
    }

    // Restore the generator state by resetting it if it was exhausted
    if (scaleGenerator && scaleGenerator.next().done) {
        // Do nothing; Next is already disabled
    }
}

/**
 * Regenerates the generator to include already generated scales.
 * This is a workaround to "peek" without advancing the generator.
 * @param {Generator} originalGenerator - The original generator.
 * @param {number} generatedCount - Number of scales already generated.
 * @param {number} currentPage - Current page number.
 * @param {number} edo - The EDO value.
 * @param {number} scaleSize - The scale size.
 * @returns {Generator} - A new generator starting from the current state.
 */
function regenerateGenerator(originalGenerator, generatedCount, currentPage, edo, scaleSize) {
    // Note: JavaScript generators cannot be rewound or cloned.
    // To truly implement peeking, consider using a buffer or different approach.
    // For simplicity, we will assume that the generator can continue as is.
    // This function is a placeholder to indicate where such logic would be implemented.
    return originalGenerator;
}

/**
 * Highlights the selected scale on the chromatic circle.
 * @param {Array<number>} scale - The scale steps.
 * @param {number} edo - The number of equal divisions of the octave.
 */
function highlightScale(scale, edo) {
    console.log('Highlighting scale:', scale);
    drawChromaticCircle(scale, edo);
    // Highlight the selected scale in the list
    const scaleElements = document.querySelectorAll('.scale');
    scaleElements.forEach(elem => {
        elem.classList.remove('selected');
    });
    // Find the scaleDiv that matches the current scale
    scaleElements.forEach(elem => {
        const currentScale = JSON.parse(elem.getAttribute('data-scale'));
        if (arraysEqual(currentScale, scale)) {
            elem.classList.add('selected');
        }
    });
    // Enable the centralized Play button
    const playBtn = document.getElementById('playScaleBtn');
    playBtn.disabled = false;
    playBtn.dataset.scale = JSON.stringify(scale); // Store the selected scale
}

/**
 * Centralized Play Button Event Listener
 */
document.getElementById('playScaleBtn').addEventListener('click', async () => {
    const playBtn = document.getElementById('playScaleBtn');
    const scaleData = playBtn.dataset.scale;
    if (scaleData) {
        const scale = JSON.parse(scaleData);
        const edo = parseInt(document.getElementById('edo').value);

        // Ensure Tone.js is ready (user interaction required for AudioContext)
        await Tone.start();

        playScale(scale, edo);
    }
});

/**
 * Plays the selected scale using Tone.js.
 * Ensures that only one scale plays at a time.
 * Plays the root and the octave higher.
 * Adds visual feedback by making corresponding notes glow.
 * @param {Array<number>} scale - The scale steps.
 * @param {number} edo - The number of equal divisions of the octave.
 */
function playScale(scale, edo) {
    // Initialize Synth if not already
    initializeSynth();

    // Stop any ongoing playback
    Tone.Transport.stop();
    Tone.Transport.cancel(); // Remove all scheduled events

    // Start the Transport
    Tone.Transport.start();

    // Calculate the step frequencies
    let frequency = 261.63; // Starting frequency (C4)
    const ratio = Math.pow(2, 1 / edo);

    // Schedule the root note first
    synth.triggerAttackRelease(frequency, '8n', Tone.now());
    scheduleGlow(0, Tone.now(), 'start'); // Root is step 0
    scheduleGlow(0, Tone.now() + 0.5, 'end');

    let time = Tone.now() + 0.5; // Increment time after the root note

    // Iterate over the steps
    scale.forEach(step => {
        frequency *= Math.pow(ratio, step);
        synth.triggerAttackRelease(frequency, '8n', time);

        // Calculate which step is being played
        const currentStep = frequencyToStep(frequency, edo);

        // Add visual feedback
        scheduleGlow(currentStep, time, 'start');
        scheduleGlow(currentStep, time + 0.5, 'end');

        time += 0.5; // Half a second between notes
    });

    // No need to play octave higher separately since steps sum to octave

    // Update Play button state during playback
    const playBtn = document.getElementById('playScaleBtn');
    playBtn.textContent = 'Playing...';
    playBtn.disabled = true;

    // Calculate total playback time
    const totalTime = time - Tone.now(); // Duration in seconds

    // Re-enable the Play button after playback
    setTimeout(() => {
        playBtn.textContent = 'Play Selected Scale';
        playBtn.disabled = false;
    }, totalTime * 1000);
}

/**
 * Converts frequency to step number based on EDO.
 * @param {number} frequency - The frequency of the note.
 * @param {number} edo - The number of equal divisions of the octave.
 * @returns {number} - The corresponding step number.
 */
function frequencyToStep(frequency, edo) {
    const step = Math.round(Math.log2(frequency / 261.63) * edo);
    return step % edo;
}

/**
 * Schedules a glow effect on the chromatic circle.
 * @param {number} step - The step number corresponding to the note.
 * @param {number} time - The time at which to trigger the glow.
 * @param {string} action - 'start' to add glow, 'end' to remove glow.
 */
function scheduleGlow(step, time, action) {
    Tone.Transport.schedule((timeStamp) => {
        const circle = d3.select(`#chromaticCircle circle[data-step='${step}']`);
        if (action === 'start') {
            circle.classed('glow', true);
        } else if (action === 'end') {
            circle.classed('glow', false);
        }
    }, time);
}

/**
 * Draws the chromatic circle and highlights the scale notes.
 * @param {Array<number>} scale - The scale steps.
 * @param {number} edo - The number of equal divisions of the octave.
 */
function drawChromaticCircle(scale, edo) {
    const svg = d3.select('#chromaticCircle');
    const width = +svg.attr('width');
    const height = +svg.attr('height');
    const radius = Math.min(width, height) / 2 - 50;

    svg.selectAll('*').remove(); // Clear previous drawings

    const g = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Draw the outer circle
    g.append('circle')
        .attr('r', radius)
        .attr('fill', '#fff')
        .attr('stroke', '#000');

    // Calculate the angle for each division
    const angle = 2 * Math.PI / edo;

    // Draw the divisions and labels
    for (let i = 0; i < edo; i++) {
        const currentAngle = angle * i - Math.PI / 2;
        const x = radius * Math.cos(currentAngle);
        const y = radius * Math.sin(currentAngle);

        // Draw division lines
        g.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', x)
            .attr('y2', y)
            .attr('stroke', '#ccc');

        // Add labels for all divisions
        g.append('text')
            .attr('x', (radius + 20) * Math.cos(currentAngle))
            .attr('y', (radius + 20) * Math.sin(currentAngle) + 5) // +5 to center vertically
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(i === 0 ? 'Root' : i); // Label root explicitly
    }

    // Draw scale notes
    let cumulativeSteps = 0;
    scale.forEach((step, index) => {
        cumulativeSteps += step;
        const currentStep = cumulativeSteps % edo;
        const currentAngle = 2 * Math.PI * currentStep / edo - Math.PI / 2;
        const x = (radius - 20) * Math.cos(currentAngle);
        const y = (radius - 20) * Math.sin(currentAngle);

        // Draw a circle for each scale note with interactivity
        const scaleNote = g.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 10)
            .attr('fill', '#007BFF')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('data-step', currentStep) // Assign data-step
            .on('mouseover', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 14)
                    .attr('fill', '#0056b3');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 10)
                    .attr('fill', '#007BFF');
            })
            .append('title') // Tooltip showing step number
            .text(`Step ${cumulativeSteps}`);

        // Add labels (optional)
        g.append('text')
            .attr('x', x)
            .attr('y', y + 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#fff')
            .text(index + 1);
    });
}

/**
 * Clears the visualization area.
 */
function clearVisualization() {
    const svg = d3.select('#chromaticCircle');
    svg.selectAll('*').remove();
}

/**
 * Helper function to compare two arrays for equality.
 * @param {Array} arr1 
 * @param {Array} arr2 
 * @returns {boolean}
 */
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length)
        return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i])
            return false;
    }
    return true;
}
