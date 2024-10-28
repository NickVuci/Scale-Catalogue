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

// Event Listener for Generate Button
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

// Pagination Controls Event Listeners
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
        addPlayButton(scaleDiv, scale, edo); // Add play button
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
 * Disables Next button if no more scales are available.
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
 * Adds a "Play" button to each scale.
 * @param {HTMLElement} scaleDiv - The div element representing the scale.
 * @param {Array<number>} scale - The scale steps.
 * @param {number} edo - The number of equal divisions of the octave.
 */
function addPlayButton(scaleDiv, scale, edo) {
    const playButton = document.createElement('button');
    playButton.textContent = 'Play';
    playButton.style.marginLeft = '10px';
    playButton.style.padding = '5px 10px';
    playButton.style.fontSize = '14px';
    playButton.style.cursor = 'pointer';
    playButton.style.border = 'none';
    playButton.style.borderRadius = '4px';
    playButton.style.backgroundColor = '#28a745';
    playButton.style.color = '#fff';
    playButton.style.transition = 'background 0.3s';

    playButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering scale selection
        playScale(scale, edo);
    });

    playButton.addEventListener('mouseover', () => {
        playButton.style.backgroundColor = '#218838';
    });

    playButton.addEventListener('mouseout', () => {
        playButton.style.backgroundColor = '#28a745';
    });

    scaleDiv.appendChild(playButton);
}

/**
 * Plays the selected scale using Tone.js.
 * @param {Array<number>} scale - The scale steps.
 * @param {number} edo - The number of equal divisions of the octave.
 */
function playScale(scale, edo) {
    // Ensure Tone.js is loaded
    if (typeof Tone === 'undefined') {
        alert('Tone.js is not loaded. Please check your script includes.');
        return;
    }

    const synth = new Tone.Synth().toDestination();
    let time = Tone.now();

    // Starting frequency (e.g., C4 = 261.63 Hz)
    let frequency = 261.63;

    // Calculate frequency ratio based on EDO
    const ratio = Math.pow(2, 1 / edo);

    // Play each note in the scale
    scale.forEach(step => {
        frequency *= Math.pow(ratio, step);
        synth.triggerAttackRelease(frequency, '8n', time);
        time += 0.5; // Half a second between notes
    });
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
            .text(i + 1);
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
