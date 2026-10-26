// The name drawn in our own angular letters (strokes on a 2 x 4 grid), so it matches the lid and the logo.
(() => {
    const { svgEl, themed } = app.dom;

    const GLYPHS = {
        T: [[0, 4, 2, 4], [1, 4, 1, 0]], A: [[0, 0, 1, 4], [1, 4, 2, 0], [0.5, 1.6, 1.5, 1.6]],
        N: [[0, 0, 0, 4], [0, 4, 2, 0], [2, 0, 2, 4]], D: [[0, 0, 0, 4], [0, 4, 1.3, 4], [1.3, 4, 2, 3], [2, 3, 2, 1], [2, 1, 1.3, 0], [1.3, 0, 0, 0]],
        E: [[0, 0, 0, 4], [0, 4, 2, 4], [0, 2, 1.5, 2], [0, 0, 2, 0]], M: [[0, 0, 0, 4], [0, 4, 1, 1.8], [1, 1.8, 2, 4], [2, 4, 2, 0]],
        S: [[2, 4, 0, 4], [0, 4, 0, 2], [0, 2, 2, 2], [2, 2, 2, 0], [2, 0, 0, 0]], I: [[1, 0, 1, 4]], C: [[2, 4, 0, 4], [0, 4, 0, 0], [0, 0, 2, 0]],
        K: [[0, 0, 0, 4], [2, 4, 0, 1.8], [0.6, 2.4, 2, 0]],
    };
    const PITCH = 3;

    function wordmark(text, height) {
        const width = text.length * PITCH - 1;
        const svg = svgEl("svg", { viewBox: `-0.5 -0.5 ${width + 1} 5`, role: "img", "aria-label": text });
        svg.style.height = `${height}px`;
        svg.style.width = `${(height * (width + 1)) / 5}px`;
        svg.style.display = "block";
        const group = svgEl("g", { fill: "none", stroke: "currentColor", "stroke-width": "0.7", "stroke-linecap": "square", "stroke-linejoin": "miter" });
        [...text].forEach((letter, at) => (GLYPHS[letter] || []).forEach(([x1, y1, x2, y2]) => {
            group.appendChild(svgEl("line", { x1: x1 + at * PITCH, y1: 4 - y1, x2: x2 + at * PITCH, y2: 4 - y2 }));
        }));
        svg.appendChild(group);
        themed(svg, { color: "text" });
        return svg;
    }

    app.ui.wordmark = { wordmark };
})();
