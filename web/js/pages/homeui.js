// Home building blocks: reveal-on-scroll bands, card grids, use cases, host/target, FAQ and the closing calls to action.
(() => {
    const { el, add, interact, focusRing } = app.dom;
    const { SPACE, FONT, px } = app.styles;
    const { label, para, heading } = app.ui.text;
    const { stack, column, grid } = app.ui.layout;
    const { card } = app.ui.card;
    const { HOME } = app.content;

    const REVEAL = { shift: 24, ms: 500, threshold: 0.12 };
    const WIDE_BLOCK = SPACE.xxl * 2;

    // Fade and slide a block in the first time it scrolls into view.
    function reveal(node) {
        if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return node;
        Object.assign(node.style, { opacity: "0", transform: `translateY(${REVEAL.shift}px)`, transition: `opacity ${REVEAL.ms}ms ease, transform ${REVEAL.ms}ms ease` });
        const seen = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            node.style.opacity = "1";
            node.style.transform = "none";
            seen.disconnect();
        }, { threshold: REVEAL.threshold });
        seen.observe(node);
        app.dom.track(() => seen.disconnect());
        return node;
    }

    // A full-width band with an eyebrow, a title, a lead and content, laid out in the shared column.
    function band(id, eyebrow, title, lead, ...children) {
        const box = stack(SPACE.lg);
        box.id = id;
        add(box, label(eyebrow.toUpperCase(), { size: FONT.xs, weight: FONT.bold, tone: "accent" }), heading(2, title), lead ? para(lead, { size: FONT.lg, tone: "muted" }) : null, children);
        const outer = el("section", { paddingTop: px(WIDE_BLOCK / 2), paddingBottom: px(WIDE_BLOCK / 2) });
        add(outer, column(reveal(box)));
        return outer;
    }

    function cells(items, cell, build) {
        const wrap = grid(cell, SPACE.md);
        items.forEach((item, idx) => add(wrap, build(item, idx)));
        requestAnimationFrame(() => wrap.layout());
        return wrap;
    }

    app.pages.homeUi = { band, cells };
})();
