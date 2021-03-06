import Utils from './utils';

export default class Chart {

    static create(elements, options, chartData) {
        return new this(elements, options, chartData);
    }

    constructor(elements, options, chartData) {
        this.elements = elements;
        this.options = options;
        this.chartData = chartData.primary ? chartData : { primary: chartData };
        this.chartTypes = Object.keys(this.chartData);
        this.offsetAngle = 0;
        this.planets = {};
        this.aspectedPlanets = {};
        this.init();
    }

    // Set things up ready for drawing the chart.
    init() {
        // Collate all wanted planets regardless of type into the same map for simplicity
        for (const chartType of this.chartTypes) {
            this.planets[chartType] = {};
            this.aspectedPlanets[chartType] = [];

            this.elements.planets[chartType].forEach(planetElement => {
                const planetName = planetElement.getAttribute('data-immanuel-planet');

                // Find it
                if (planetName in this.chartData.primary.points) {
                    var planet = this.chartData[chartType].points[planetName];
                }
                else if (planetName in this.chartData.primary.planets) {
                    var planet = this.chartData[chartType].planets[planetName];
                }

                // Store it
                this.planets[chartType][planetName] = planet;

                // Store which aspects we want to draw
                if (!planetElement.hasAttribute('data-immanuel-no-aspects')) {
                    this.aspectedPlanets[chartType].push(planetName);
                }
            });
        }

        // Ensure everything is redrawn on resize
        window.addEventListener('resize', () => { document.querySelectorAll('[data-immanuel-hide]').length || this.setupChart(); });
    }

    // Set up the chart elements & display them.
    display() {
        // Only attempt to set up display if all elements are loaded
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => { this.display(); });
            return;
        }

        this.setOffsetAngle();
        this.rotateChart();
        this.setPlaceholderData();
        this.setupChart();

        // Now unhide it
        document.querySelectorAll('[data-immanuel-hide]').forEach(element => {
            element.removeAttribute('data-immanuel-hide');
        });
    }

    // Calculate the offset for all subsequent angles based on rotating the chart to the horizon line.
    setOffsetAngle() {
        if (this.options.rotateChart === 'asc') {
            this.offsetAngle = (180 - this.chartData.primary.angles.asc.chartAngle) * -1;
        }
        else if (this.options.rotateChart === 'horizon') {
            this.offsetAngle = (180 - this.chartData.primary.houses[1].chartAngle) * -1;
        }
        else {
            this.offsetAngle = 0;
        }
    }

    // Rotate the chart visual to the horizon line.
    rotateChart() {
        this.elements.chartBackground.style.transform = this.offsetAngle !== 0 ? `rotate(${this.offsetAngle}deg)` : 'none';
    }

    // If any placeholders exist for available data, populate them.
    setPlaceholderData() {
        for (const chartType of this.chartTypes) {
            if (this.elements.placeholders[chartType]) {
                this.elements.placeholders[chartType].forEach(placeholderElement => {
                    const attributeName = placeholderElement.getAttributeNames().find(attribute => /-placeholder$/.test(attribute));
                    const placeholder = placeholderElement.getAttribute(attributeName);

                    switch (placeholder) {
                        case 'asc':
                        case 'desc':
                        case 'mc':
                        case 'ic':
                            placeholderElement.innerHTML = Utils.formatAngleString(this.chartData[chartType].angles[placeholder].formattedSignAngle, this.options.angleFormat);
                            break;
                    }
                });
            }
        }
    }

    // Set up all the chart's dynamic elements.
    setupChart() {
        // Set up HTML elements
        if (this.elements.signTrack && this.elements.signs) {
            this.setSigns();
        }

        this.setAngles();
        this.setPlanets();
        this.removeLines();
        this.drawLines();
    }

    // Remove chart lines for redrawing.
    removeLines() {
        this.elements.chartLines.forEach(chartLine => {
            chartLine.remove();
        });
    }

    // Draw all SVG lines in the requested order.
    drawLines() {
        this.options.lineOrder.reverse().forEach(lineType => {
            switch (lineType) {
                case 'angleMarkers':
                    this.setPlanetAngleMarkers();
                    break;

                case 'anglePointers':
                    this.setPlanetAnglePointers('primary');
                    break;

                case 'houses':
                    this.setHouses();
                    this.setHouseNumbers();
                    break;

                case 'aspects':
                    this.setAspects();
                    break;
            }
        });
    }

    // Position the ASC / MC etc. angle labels.
    setAngles() {
        for (const chartType of this.chartTypes) {
            if (this.elements.angles[chartType]) {
                this.elements.angles[chartType].forEach(angleElement => {
                    const angleName = angleElement.getAttribute('data-immanuel-angle');
                    const angle = this.chartData[chartType].angles[angleName].chartAngle - this.offsetAngle;

                    let [x, y] = Utils.findRelativePoint(this.elements.angleTracks[chartType], angle);

                    x = Math.round(x - angleElement.offsetWidth / 2);
                    y = Math.round(y - angleElement.offsetHeight / 2);

                    Object.assign(angleElement.style, {
                        position: 'absolute',
                        left: x + 'px',
                        top: y + 'px',
                    });
                });
            }
        }
    }

    // Position the sign elements if they exist.
    setSigns() {
        let signAngle = 15 - this.offsetAngle;

        this.elements.signs.forEach(signElement => {
            let [x, y] = Utils.findRelativePoint(this.elements.signTrack, signAngle);

            x = Math.round(x - signElement.offsetWidth / 2);
            y = Math.round(y - signElement.offsetHeight / 2);

            Object.assign(signElement.style, {
                position: 'absolute',
                left: x + 'px',
                top: y + 'px',
            });

            if (this.options.rotateSigns) {
                const rotationAngle = (signAngle * -1) + 90;
                signElement.style.transform = `rotate(${rotationAngle}deg)`;
            }

            signAngle += 30;
        });
    }

    // Set up the planets & their angles.
    setPlanets() {
        this.resetPlanetAngles();

        for (const chartType of this.chartTypes) {
            this.resolvePlanetCollisions(chartType);
        }

        this.positionPlanets();
        this.setPlanetAngleText();
    }

    // Reset planet angles to their potentially colliding defaults for resize.
    resetPlanetAngles() {
        for (const chartType of this.chartTypes) {
            Object.values(this.planets[chartType]).forEach(planet => {
                planet.displayAngle = planet.chartAngle;
            });
        }
    }

    // Space out planets when they collide with each other.
    resolvePlanetCollisions(chartType) {
        // Form groups of colliding planets
        const collisionGroups = [];

        this.elements.planets[chartType].forEach(planetElement => {
            const planetName = planetElement.getAttribute('data-immanuel-planet');
            const planet = this.planets[chartType][planetName];

            // For each planet, check whether it's colliding with another planet
            this.elements.planets[chartType].forEach(testPlanetElement => {
                const testPlanetName = testPlanetElement.getAttribute('data-immanuel-planet');

                if (planetName === testPlanetName) {
                    return;
                }

                // Test for collision here by checking for the gap between their centres being less than their combined radii
                const testPlanet = this.planets[chartType][testPlanetName];
                const planetRadius = Math.max(planetElement.offsetWidth, planetElement.offsetHeight) / 2;
                const testPlanetRadius = Math.max(testPlanetElement.offsetWidth, testPlanetElement.offsetHeight) / 2;
                const trackDiameter = this.elements.planetTracks[chartType].offsetWidth;
                const degreesBetween = Math.abs(planet.displayAngle - testPlanet.displayAngle);
                const gapBetween = Math.abs(Math.sin(degreesBetween * (Math.PI / 360)) * trackDiameter);

                // If we have a collision, add it to a collision group, which is an array
                // containing all the planets involved in this collision (eg. a stellium)
                if (gapBetween < planetRadius + testPlanetRadius) {
                    collisionGroups.forEach(collisionGroup => {
                        if (collisionGroup.includes(planet) || collisionGroup.includes(testPlanet)) {
                            if (!collisionGroup.includes(planet)) {
                                collisionGroup.push(planet);
                            }

                            if (!collisionGroup.includes(testPlanet)) {
                                collisionGroup.push(testPlanet);
                            }

                            return;
                        }
                    });

                    collisionGroups.push([planet, testPlanet]);
                }
            });
        });

        // Now we loop over all collision groups and space them out evenly before recursing to recalculate
        // If the angle between planets > 270 degrees we assume one of them is crossing the zero point
        if (collisionGroups.length > 0) {
            collisionGroups.forEach(collisionGroup => {
                collisionGroup.sort((a, b) => Math.abs(a.displayAngle - b.displayAngle) > 270 ? b.displayAngle - a.displayAngle : a.displayAngle - b.displayAngle);
                collisionGroup[0].displayAngle -= 0.1;
                collisionGroup[collisionGroup.length-1].displayAngle += 0.1;
            });

            this.resolvePlanetCollisions(chartType);
        }
    }

    // Position the planet elements.
    positionPlanets() {
        for (const chartType of this.chartTypes) {
            this.elements.planets[chartType].forEach(planetElement => {
                const planetName = planetElement.getAttribute('data-immanuel-planet');
                const planet = this.planets[chartType][planetName];
                const angle = planet.displayAngle - this.offsetAngle;
                const movement = planet.movement.toLowerCase();

                // Remove any existing classes for movement & sign in case this is a redraw
                const planetElementClassNames = [...planetElement.classList];
                const planetMovementClassName = planetElementClassNames.find(className => /planet-movement--/.test(className));
                const planetSignClassName = planetElementClassNames.find(className => /planet-sign--/.test(className));
                planetElement.classList.remove(planetMovementClassName, planetSignClassName);

                // Add classes for planet movement & sign
                planetElement.classList.add('immanuel__planet-movement', `planet-movement--${movement}`);
                planetElement.classList.add('immanuel__planet-sign', `planet-sign--${planet.sign.toLowerCase()}`);

                // Add attribute for angle
                if (this.options.planetAngleAttribute) {
                    planetElement.setAttribute(this.options.planetAngleAttribute, Utils.formatAngleString(planet.formattedSignAngle, this.options.angleFormat));
                }

                // Position the planet
                let [x, y] = Utils.findRelativePoint(this.elements.planetTracks[chartType], angle);

                x = Math.round(x - planetElement.offsetWidth / 2);
                y = Math.round(y - planetElement.offsetHeight / 2);

                Object.assign(planetElement.style, {
                    position: 'absolute',
                    left: x + 'px',
                    top: y + 'px',
                });
            });
        }
    }

    // Add angle text for each planet.
    setPlanetAngleText() {
        for (const chartType of this.chartTypes) {
            if (this.elements.angleTextTracks[chartType]) {
                for (const [planetName, planet] of Object.entries(this.planets[chartType])) {
                    const angle = planet.displayAngle - this.offsetAngle;
                    const angleTextElement = this.elements.angleText[chartType][planetName];

                    // Add angle text & reset any previous rotation
                    angleTextElement.style.transform = 'none';
                    angleTextElement.innerHTML = Utils.formatAngleString(planet.formattedSignAngle, this.options.angleFormat);

                    // Rotate & offset position if requested
                    if (this.options.rotateAngleText) {
                        var leftOffset = angleTextElement.offsetWidth / 2;
                        var topOffset = angleTextElement.offsetHeight / 2;

                        let rotationAngle = angle * -1;

                        if (angle > 90 && angle < 270) {
                            rotationAngle += 180;
                        }

                        angleTextElement.style.transform = `rotate(${rotationAngle}deg)`;
                    }
                    else {
                        const [relX, relY] = Utils.findRelativePoint(this.elements.chart, angle);
                        var leftOffset = angleTextElement.offsetWidth * (relX / this.elements.chart.offsetWidth);
                        var topOffset = angleTextElement.offsetHeight * (relY / this.elements.chart.offsetHeight);
                    }

                    // Set position based on calculated offsets
                    let [absX, absY] = Utils.findRelativePoint(this.elements.angleTextTracks[chartType], angle);

                    absX = Math.round(absX - leftOffset);
                    absY = Math.round(absY - topOffset);

                    Object.assign(angleTextElement.style, {
                        left: absX + 'px',
                        top: absY + 'px',
                    });
                }
            }
        }
    }

    // Add the markers for each planet's original pre-collision-check placement.
    setPlanetAngleMarkers() {
        for (const chartType of this.chartTypes) {
            if (this.elements.angleMarkersStartBoundaries[chartType] && this.elements.angleMarkersEndBoundaries[chartType]) {
                for (const [planetName, planet] of Object.entries(this.planets[chartType])) {
                    const angle = planet.chartAngle - this.offsetAngle;
                    const planetClassName = planetName.replace(' ', '-');
                    const [x1, y1] = Utils.findGlobalPoint(this.elements.chart, this.elements.angleMarkersEndBoundaries[chartType], angle);
                    const [x2, y2] = Utils.findGlobalPoint(this.elements.chart, this.elements.angleMarkersStartBoundaries[chartType], angle);
                    this.drawLine(x1, y1, x2, y2, `immanuel__${chartType}-angle-marker`, `angle-marker--${planetClassName}`);
                }
            }
        }
    }

    // Add lines from each angle marker to the planet's actual position.
    setPlanetAnglePointers() {
        for (const chartType of this.chartTypes) {
            if (this.elements.angleMarkersStartBoundaries[chartType] && this.elements.angleMarkersEndBoundaries[chartType]) {
                this.elements.planets[chartType].forEach(planetElement => {
                    const planetName = planetElement.getAttribute('data-immanuel-planet');
                    const planet = this.planets[chartType][planetName];
                    const markerAngle = planet.chartAngle - this.offsetAngle;
                    // If the difference is less than a degree, draw to original position to avoid visual weirdness
                    const planetAngle = (Math.abs(planet.displayAngle - planet.chartAngle) < 1 ? planet.chartAngle : planet.displayAngle) - this.offsetAngle;
                    const planetDiameter = Math.max(planetElement.offsetWidth, planetElement.offsetHeight);
                    const planetClassName = planetName.replace(' ', '-');
                    // Work out if the pointer is pointing inwards as standard or outward (eg. if transits are outside the chart)
                    const markerOffsetMultiplier = this.elements.angleMarkersEndBoundaries[chartType].offsetWidth - this.elements.angleMarkersStartBoundaries[chartType].offsetWidth > 0 ? 1 : -1;
                    const [x1, y1] = Utils.findGlobalPoint(this.elements.chart, this.elements.angleMarkersStartBoundaries[chartType], markerAngle);
                    const [x2, y2] = Utils.findGlobalPoint(this.elements.chart, this.elements.planetTracks[chartType], planetAngle, (planetDiameter + 10) * markerOffsetMultiplier);
                    const [x3, y3] = Utils.findGlobalPoint(this.elements.chart, this.elements.planetTracks[chartType], planetAngle, planetDiameter * markerOffsetMultiplier);
                    this.drawLine(x1, y1, x2, y2, `immanuel__${chartType}-angle-pointer`, `angle-pointer--${planetClassName}`);
                    this.drawLine(x2, y2, x3, y3, `immanuel__${chartType}-angle-pointer`, `angle-pointer--${planetClassName}`);
                });
            }
        }
    }

    // Draw the house cusp lines.
    setHouses() {
        for (const chartType of this.chartTypes) {
            if (this.elements.houseStartBoundaries[chartType] && this.elements.houseEndBoundaries[chartType]) {
                for (const [houseNumber, house] of Object.entries(this.chartData[chartType].houses)) {
                    const angle = house.chartAngle - this.offsetAngle;
                    const [x1, y1] = Utils.findGlobalPoint(this.elements.chart, this.elements.houseEndBoundaries[chartType], angle);
                    const [x2, y2] = Utils.findGlobalPoint(this.elements.chart, this.elements.houseStartBoundaries[chartType], angle);
                    this.drawLine(x1, y1, x2, y2, `immanuel__${chartType}-house-line`, `house-line--${houseNumber}`);
                }
            }
        }
    }

    // Add house numbers.
    setHouseNumbers() {
        for (const chartType of this.chartTypes) {
            if (this.elements.houseNumbers[chartType]) {
                for (const [houseNumber, house] of Object.entries(this.chartData[chartType].houses)) {
                    const angle = house.chartAngle - this.offsetAngle;
                    const nextHouseNumber = houseNumber == 12 ? 1 : parseInt(houseNumber) + 1;
                    const nextHouseAngle = this.chartData[chartType].houses[nextHouseNumber].chartAngle;
                    const houseWidthAngle = (nextHouseAngle < angle ? nextHouseAngle + 360 : nextHouseAngle) - angle;
                    const midpointAngle = angle + (houseWidthAngle - this.offsetAngle) / 2;
                    const houseNumberElement = this.elements.houseNumbers[chartType][houseNumber];

                    let [x, y] = Utils.findRelativePoint(this.elements.houseNumberTracks[chartType], midpointAngle);

                    x = Math.round(x - houseNumberElement.offsetWidth / 2);
                    y = Math.round(y - houseNumberElement.offsetHeight / 2);

                    Object.assign(houseNumberElement.style, {
                        left: x + 'px',
                        top: y + 'px',
                    });

                    if (this.options.rotateHouseNumbers) {
                        const rotationAngle = (midpointAngle * -1) + 90;
                        houseNumberElement.style.transform = `rotate(${rotationAngle}deg)`;
                    }
                }
            }
        }
    }

    // Draw aspect lines in the order the types are laid out in this.options.aspectOrder.
    setAspects() {
        const aspectsToDraw = {};
        this.options.aspectOrder.reverse().forEach(aspectType => aspectsToDraw[aspectType] = []);

        for (const [planetName, planet] of Object.entries(this.planets.primary)) {
            for (const [aspectedPlanetName, aspect] of Object.entries(planet.aspects)) {
                if (this.options.maxOrb instanceof Object && this.options.maxOrb[aspectedPlanetName] && typeof this.options.maxOrb[aspectedPlanetName] === 'number') {
                    var maxOrb = this.options.maxOrb[aspectedPlanetName];
                }
                else if (typeof this.options.maxOrb === 'number') {
                    var maxOrb = this.options.maxOrb;
                }
                else {
                    var maxOrb = 5;
                }

                if (aspect.orb > maxOrb) {
                    continue;
                }

                const aspectType = aspect.type.toLowerCase();

                // If this is an planet we don't want to aspect, or this is an aspect we don't want, skip it
                if (!this.aspectedPlanets.primary.includes(planetName) || !this.aspectedPlanets[this.chartData.primary.aspectsTo].includes(aspectedPlanetName) || !this.options.aspectOrder.includes(aspectType)) {
                    continue;
                }

                const aspectToDraw = [
                    this.planets.primary[planetName].chartAngle - this.offsetAngle,
                    this.planets[this.chartData.primary.aspectsTo][aspectedPlanetName].chartAngle - this.offsetAngle
                ].sort();

                // Avoid duplicates
                if (aspectsToDraw[aspectType].some(aspectData => JSON.stringify(aspectData) === JSON.stringify(aspectToDraw))) {
                    continue;
                }

                aspectsToDraw[aspectType].push(aspectToDraw);
            }
        }

        // Now we have our definitive list, draw them
        for (const [aspectType, aspectList] of Object.entries(aspectsToDraw)) {
            aspectList.forEach(aspectToDraw => {
                const [startAngle, endAngle] = aspectToDraw;
                const [x1, y1] = Utils.findGlobalPoint(this.elements.chart, this.elements.aspectEndBoundary, startAngle);
                const [x2, y2] = Utils.findGlobalPoint(this.elements.chart, this.elements.aspectEndBoundary, endAngle);
                this.drawLine(x1, y1, x2, y2, 'immanuel__aspect-line', `aspect-line--${aspectType}`);
            });
        }
    }

    // Draw a line in the chart based on coordinates, and add classes.
    drawLine(x1, y1, x2, y2, ...classList) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.classList.add(...classList);
        line.setAttributeNS(null, 'x1', x1);
        line.setAttributeNS(null, 'y1', y1);
        line.setAttributeNS(null, 'x2', x2);
        line.setAttributeNS(null, 'y2', y2);
        this.elements.chartSvg.appendChild(line);
        this.elements.chartLines.push(line);
    }

}