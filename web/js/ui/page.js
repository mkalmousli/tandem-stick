// Page shells: a plain column, and a column with a table of contents (side rail on wide screens, chips on phones).
(() => {
    const { el, add, themed, on, watchViewport, interact, focusRing } = app.dom;
    const { FONT, SPACE, RADIUS, SIZE, px } = app.styles;
    const { heading, para } = app.ui.text;
    const { stack, column, isNarrow } = app.ui.layout;
    const { callout } = app.ui.card;

    const TOC_GAP = SPACE.xxl;
    const SCROLL_OFFSET = SIZE.header + SPACE.lg;

    function intro(title, lead) {
        return add(stack(SPACE.sm, { paddingTop: px(SPACE.xxl), paddingBottom: px(SPACE.lg) }), heading(1, title), para(lead, { tone: "muted", size: FONT.lg }));
    }

    function pageColumn(title, lead, ...blocks) {
        const body = stack(SPACE.xl, { paddingBottom: px(SPACE.xxl) });
        return column(intro(title, lead), add(body, blocks));
    }

    function section(id, title, ...children) {
        const box = stack(SPACE.md);
        box.dataset.section = id;
        return add(box, heading(2, title, id), children);
    }

    function drawToc(node, palette, flags) {
        node.style.color = flags.hover ? palette.text : palette.muted;
        node.style.background = flags.hover ? palette.raised : "transparent";
        node.style.outline = focusRing(palette, flags.ring);
    }

    function tocLink(id, text, target) {
        const node = el("a", { padding: `${px(SPACE.xs)} ${px(SPACE.sm)}`, borderRadius: px(RADIUS.sm), fontFamily: FONT.sans, fontSize: px(FONT.sm), textDecoration: "none", whiteSpace: "nowrap" });
        node.href = `#${id}`;
        node.textContent = text;
        interact(node, { native: true, onActivate: () => {}, draw: drawToc });
        on(node, "click", (evt) => {
            evt.preventDefault();
            const top = target().getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
            window.scrollTo({ top, behavior: "smooth" });
        });
        return node;
    }

    // sections: [{ id, title, build: () => Node[] }]
    function tocPage(title, lead, sections) {
        const body = stack(SPACE.xxl, { paddingBottom: px(SPACE.xxl) });
        const rail = el("nav", { display: "flex", gap: px(SPACE.xs) }, { "aria-label": "On this page" });
        const nodes = sections.map(({ id, title: text, build }) => section(id, text, build()));
        sections.forEach(({ id, title: text }, idx) => add(rail, tocLink(id, text, () => nodes[idx])));
        add(body, nodes);
        const shell = el("div", { display: "flex", gap: px(TOC_GAP), alignItems: "flex-start" });
        const aside = el("div", { flexShrink: "0" });
        add(aside, rail);
        add(shell, aside, body);
        watchViewport((viewport) => {
            const narrow = isNarrow(viewport);
            shell.style.flexDirection = narrow ? "column" : "row";
            shell.style.gap = px(narrow ? SPACE.md : TOC_GAP);
            rail.style.flexDirection = narrow ? "row" : "column";
            rail.style.overflowX = narrow ? "auto" : "visible";
            Object.assign(aside.style, narrow
                ? { width: "100%", position: "static" }
                : { width: px(SIZE.tocWidth), position: "sticky", top: px(SCROLL_OFFSET) });
            const inner = Math.min(SIZE.content, viewport.w) - 2 * (viewport.w < 640 ? SPACE.lg : SPACE.xl);
            body.style.width = px(narrow ? inner : inner - SIZE.tocWidth - TOC_GAP);
        });
        return column(intro(title, lead), shell);
    }

    function untestedCallout(text) {
        return callout(para(text, { size: FONT.sm }));
    }

    app.ui.page = { pageColumn, tocPage, section, untestedCallout };
})();
