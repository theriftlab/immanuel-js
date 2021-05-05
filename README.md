# Immanuel.JS

This package provides a fully-customisable, responsive-ready, pure JavaScript astrology chart for use with the astrological data from [Immanuel API](https://immanuel.app). The chart's main graphic elements are provided and styled by the developer, while elements such as aspects lines and house cusps are drawn via SVG, and are also fully customisable via CSS. See the `/demo` directory for an example, or visit https://immanuel.app.

## Installation

Node projects:

```bash
npm i immanuel
```
then
```javascript
import 'immanuel';
```
Or:
```html
<script src="https://cdn.jsdelivr.net/gh/theriftlab/immanuel-js@v2.x.x/dist/immanuel.js"></script>
```

Both of these will expose the `Immanuel` class for use.

## Usage

The `Immanuel` class constructor takes a chart element selector as a first argument, and an optional object of options (outlined below) as a second. The chart is then drawn using the `displayChart()` method, which takes the JSON data returned by the Immanuel API as an argument.

Elements are set up in the HTML using `data` attributes, and consist mostly of *tracks* and *boundaries*.

*Tracks* are elements that define the diameter of the circle that certain child elements will follow - for example, the `[data-immanuel-track="planets"]` element will be an invisible div positioned and sized by your CSS to define the diameter of the circle whose circumference the planets will be placed along.

Some of these may be omitted - for example, if your chart background graphic already includes the signs, then you can safely omit the `[data-immanuel-track="signs"]` element, and immanuel.js will not look for the sign glyphs.

*Boundaries* define where things begin and end - for example `[data-immanuel-boundary="house-start"]` and `[data-immanuel-boundary="house-end"]` define where the house cusp lines should be drawn from and to.

Take a look at `/demo/single.html` to see the elements that can go into a chart, and `/demo/immanuel.css` and `/demo/single.css` for a basic example of how to style everything to be (relatively) responsive. The demo uses a font to display astrological glyphs, but in practice anything can be used, including images.

For more advanced usage, `/demo/multiple.html` demonstrates a synastry chart, and `/demo/transits.html` demonstrates a natal chart with added transits. Their respective CSS files will show how the extra elements are styled and positioned.

Besides tracks and boundaries, a `[data-immanuel-background]` element is expected, which should contain the graphic of the basic chart itself.

The `[data-immanuel-lines]` element is optional, and simply defines the element that immanuel.js should append the SVG canvas element to. If this is omitted, it will be appended to the main element that was passed to the constructor (ie. all lines drawn on it will appear on top of all other elements).

The `[data-immanuel-angle]` elements represent the Asc, Desc, MC and IC (the Desc element is missing in the demo, simply because the font it uses lacks a glyph for it).

Angle markers are the small marks around the edge of the chart to show the exact placement of a planet. Angle pointers are lines drawn from the markers toward the planet, to clarify in cases when planets do not line up exactly with their markers (for example with a stellium or conjunction where planets must be separated visually).

In all demo pages, `<div id="chart">` is the main element that contains the chart elements. This is what is passed to `Immanuel`'s constructor.

An `options` object may also be passd as a second argument to the constructor, with the following:

Option|Type|Default|Purpose
------|----|-------|-------
`maxOrb`|Object \| Integer|{ sun: 15, moon: 12, mercury: 7, venus: 7, mars: 8, jupiter: 9, saturn: 9, uranus: 5, neptune: 5, pluto: 5, chiron: 5 }|Specifies the orb for each planet when drawing aspect lines. Passing an empty object will default all planets' orbs to 5 degrees. Passing a number will apply that orb to all planets. **NOTE:** due to restrictions with the data from the API itself, the default orb values are absolute maximums and setting them any higher will not work (eg. setting the sun's orb to 25 will still result in a 15 degree orb).
`rotateChart`|String|'horizon'|Rotate the chart graphic depending on the value: `'horizon'` rotates the chart so the horizon line is horizontal; `'asc'` rotates so the ascendant / descendant line is horizontal (same line as horizon for most house systems but different for some equal house systems) and '`none`' to not rotate the chart at all.
`rotateSigns`|Boolean|true|If you have provided glyphs/graphics for the signs, this option will rotate them to always face outward around the zodiac wheel (eg. the sign at the top will be upright, the sign at the bottom will be upside-down, etc.) Setting to false will simply render them all upright.
`rotateHouseNumbers`|Boolean|false|Does the same with the house numbers.
`rotateAngleText`|Boolean|false|Does the same for the text next to each planet showing its angle.
`angleFormat`|String|'%D\&deg;%M\\''|Formats the angle text next to each planet. Placeholders are: %D = degreee, %M = minute, and %S = second.
`planetAngleAttribute`|String|null|If present, the angle text will be added as the value of the attribute specified here, which will be added to the planet element. This is useful for on-hover popups, or any other way of hiding the angle text until hovered/clicked.
`lineOrder`|Array|['houses', 'angleMarkers', 'anglePointers', 'aspects']|Dictates the order in which the drawn lines will appear. The lines at the top of this list are drawn last - ie. in the default array, house lines will be drawn on top of aspect lines.
`aspectOrder`|Array|['trine', 'sextile', 'semisextile', 'square', 'semisquare', 'sesquisquare', 'opposite', 'quintile', 'semiquintile', 'sesquiquintile', 'biquintile', 'quincunx']|Similar to above, only dictating the order in which the aspect lines will be drawn. By default, for example, trines and sextiles will be drawn over squares and oppositions.

Pretty much everything else can be controlled by the developer via HTML and CSS, such as line colour and thickness, which elements should be displayed / generated, whether or not the chart will be responsive, etc.

All `[data-immanuel-hide]` attributes are removed once the chart is drawn, so this can be applied to your chart's container element and set to `visibility: hidden` in your CSS to avoid the dreaded FOUC.

## Multiple Charts

When displaying data from multiple charts, for example natal + transits, or synastries, all the planet, angle, placeholder, house and house number elements are also available for the secondary and/or transit chart(s). Various attribute names or values simply need "secondary" or "transit" added in - please see the `/demo` directory's `multiple.html` and `transits.html` to see these in action.

## Info

This package is part of the [Immanuel astrology API](https://immanuel.app) project, and is designed to be used with the JSON data it provides.