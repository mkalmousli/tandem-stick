// Layout primitives. Widths are computed from the viewport in JS, never with min/max-width.
(() => {
    const { el, add, watchViewport } = app.dom;
    const { SPACE, SIZE, BREAKPOINT, px } = app.styles;

    function stack(gap = SPACE.md, style = {}) {
        return el("div", { display: "flex", flexDirection: "column", gap: px(gap), ...style });
    }

    function row(gap = SPACE.sm, style = {}) {
        return el("div", { display: "flex", flexWrap: "wrap", alignItems: "center", gap: px(gap), ...style });
    }

    const isPhone = (viewport) => viewport.w < BREAKPOINT.phone;
    const isNarrow = (viewport) => viewport.w < BREAKPOINT.tablet;

    // Centred column whose width follows the window up to SIZE.content.
    function column(...children) {
        const node = el("div", { boxSizing: "border-box", margin: "0 auto" });
        watchViewport((viewport) => {
            const gutter = isPhone(viewport) ? SPACE.lg : SPACE.xl;
            node.style.width = viewport.w <= SIZE.content ? "100%" : px(SIZE.content);
            node.style.paddingLeft = px(gutter);
            node.style.paddingRight = px(gutter);
        });
        return add(node, children);
    }

    // Equal-width cells in as many columns as fit; each cell is at least `cell` px wide.
    function grid(cell, gap = SPACE.md) {
        const node = el("div", { display: "flex", flexWrap: "wrap", gap: px(gap), alignItems: "stretch" });
        const place = () => {
            const width = node.getBoundingClientRect().width || node.parentElement?.getBoundingClientRect().width || cell;
            const cols = Math.max(1, Math.floor((width + gap) / (cell + gap)));
            const each = Math.floor((width - gap * (cols - 1)) / cols);
            Array.from(node.children).forEach((child) => { child.style.width = px(each); child.style.boxSizing = "border-box"; });
        };
        node.layout = place;
        watchViewport(() => requestAnimationFrame(place));
        return node;
    }

    app.ui.layout = { stack, row, column, grid, isPhone, isNarrow };
})();
