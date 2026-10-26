// Small SVG drawing kit for diagrams. Colours are palette keys (or "none") and follow the theme.
(() => {
    const { svgEl, add, themed } = app.dom;
    const { FONT } = app.styles;

    const colour = (key) => (palette) => palette[key] || key;
    const DIM_TICK = 4;
    const DIM_TEXT_GAP = 6;

    function canvas(width, height, title) {
        return svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": title }, { width: "100%", height: "auto", display: "block" });
    }

    function shape(tag, attrs, fill = "none", stroke = "none", strokeWidth = 1) {
        const node = svgEl(tag, { ...attrs, "stroke-width": strokeWidth });
        themed(node, { fill: colour(fill), stroke: colour(stroke) });
        return node;
    }

    const rect = (x, y, w, h, fill, stroke, strokeWidth, radius = 0) => shape("rect", { x, y, width: w, height: h, rx: radius }, fill, stroke, strokeWidth);
    const line = (x1, y1, x2, y2, stroke, strokeWidth = 1, dash) => {
        const node = shape("line", { x1, y1, x2, y2 }, "none", stroke, strokeWidth);
        if (dash) node.setAttribute("stroke-dasharray", dash);
        return node;
    };
    const path = (d, fill, stroke, strokeWidth) => shape("path", { d }, fill, stroke, strokeWidth);

    function text(content, x, y, { tone = "text", size = FONT.sm, anchor = "start", weight = FONT.regular, rotate } = {}) {
        const node = svgEl("text", { x, y, "text-anchor": anchor }, { fontSize: `${size}px`, fontFamily: FONT.sans, fontWeight: String(weight) });
        if (rotate !== undefined) node.setAttribute("transform", `rotate(${rotate} ${x} ${y})`);
        node.textContent = content;
        themed(node, { fill: colour(tone) });
        return node;
    }

    // Dimension line with end ticks and a centred label.
    function dimension(svg, [x1, y1], [x2, y2], content, vertical = false) {
        const mid = [(x1 + x2) / 2, (y1 + y2) / 2];
        const ticks = vertical
            ? [line(x1 - DIM_TICK, y1, x1 + DIM_TICK, y1, "muted"), line(x2 - DIM_TICK, y2, x2 + DIM_TICK, y2, "muted")]
            : [line(x1, y1 - DIM_TICK, x1, y1 + DIM_TICK, "muted"), line(x2, y2 - DIM_TICK, x2, y2 + DIM_TICK, "muted")];
        add(svg, line(x1, y1, x2, y2, "muted"), ticks);
        const at = vertical ? [mid[0] - DIM_TEXT_GAP, mid[1]] : [mid[0], mid[1] - DIM_TEXT_GAP];
        add(svg, text(content, at[0], at[1], { anchor: "middle", rotate: vertical ? -90 : undefined }));
    }

    function arrowHead(svg, id) {
        const defs = svgEl("defs");
        const marker = svgEl("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" });
        add(marker, path("M0 0L10 5L0 10z", "muted", "none"));
        add(svg, add(defs, marker));
    }

    app.ui.svg = { canvas, shape, rect, line, path, text, dimension, arrowHead };
})();
