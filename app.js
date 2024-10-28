console.log('app.js is loaded and running');

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
        return;
    }

    const scales = generateScales(edo, scaleSize);
    const uniqueScales = filterRotationalDuplicates(scales);
    console.log(`Found ${uniqueScales.length} unique scales after filtering rotational duplicates`);

    if (uniqueScales.length === 0) {
        resultsDiv.innerHTML = '<p>No scales found with the given EDO and Scale Size.</p>';
        clearVisualization();
        return;
    }

    uniqueScales.forEach((scale, index) => {
        const scaleDiv = document.createElement('div');
        scaleDiv.classList.add('scale');
        scaleDiv.setAttribute('data-scale', JSON.stringify(scale));
        scaleDiv.innerHTML = `<strong>Scale ${index + 1}:</strong> ${scale.join(', ')}`;
        scaleDiv.addEventListener('click', () => {
            highlightScale(scale, edo);
        });
        resultsDiv.appendChild(scaleDiv);
    });

    // Automatically highlight the first scale
    if (uniqueScales.length > 0) {
        highlightScale(uniqueScales[0], edo);
    }
});

/**
 * Generates all unique scales for a given EDO and scale size.
 * @param {number} edo - The number of equal divisions of the octave.
 * @param {number} scaleSize - The number of notes in the scale.
 * @returns {Array<Array<number>>} - An array of scales, each scale is an array of step intervals.
 */
function generateScales(edo, scaleSize) {
    const results = [];

    function backtrack(currentScale, stepsLeft) {
        if (currentScale.length === scaleSize - 1) {
            if (stepsLeft > 0) {
                results.push([...currentScale, stepsLeft]);
            }
            return;
        }
        // Ensure each step is at least 1
        for (let step = 1; step <= stepsLeft - (scaleSize - currentScale.length - 1); step++) {
            currentScale.push(step);
            backtrack(currentScale, stepsLeft - step);
            currentScale.pop();
        }
    }

    backtrack([], edo);
    return results;
}

/**
 * Filters out scales that are rotations of previously encountered scales.
 * @param {Array<Array<number>>} scales - Array of scales to filter.
 * @returns {Array<Array<number>>} - Filtered array with unique scales.
 */
function filterRotationalDuplicates(scales) {
    const uniqueScales = [];

    scales.forEach(scale => {
        const rotations = generateRotations(scale);
        const isDuplicate = uniqueScales.some(uniqueScale => {
            const uniqueRotations = generateRotations(uniqueScale);
            return rotations.some(rot => arraysEqual(rot, uniqueScale));
        });
        if (!isDuplicate) {
            uniqueScales.push(scale);
        }
    });

    return uniqueScales;
}

/**
 * Generates all rotations of a scale.
 * @param {Array<number>} scale - The scale steps.
 * @returns {Array<Array<number>>} - All rotational permutations of the scale.
 */
function generateRotations(scale) {
    const rotations = [];
    const n = scale.length;
    let rotated = scale.slice();

    for (let i = 0; i < n; i++) {
        rotations.push(rotated.slice());
        const first = rotated.shift();
        rotated.push(first);
    }

    return rotations;
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
