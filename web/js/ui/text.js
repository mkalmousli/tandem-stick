// Text primitives: label, paragraph, heading, inline code, links, and *emphasis* markup.
(() => {
    const { el, add, themed, interact, focusRing } = app.dom;
    const { FONT, SPACE, RADIUS, px } = app.styles;

    const TONES = { text: "text", muted: "muted", accent: "accent" };
    const HEADING_SIZE = { 1: FONT.hero, 2: FONT.xl, 3: FONT.lg };

    function label(text, { size = FONT.md, weight = FONT.regular, tone = "text", mono = false, tag = "span" } = {}) {
        const node = el(tag, { fontSize: px(size), fontWeight: String(weight), fontFamily: mono ? FONT.mono : FONT.sans, lineHeight: "1.5" });
        node.textContent = text;
        themed(node, { color: TONES[tone] });
        return node;
    }

    function para(text, opts = {}) {
        const node = label(text, { ...opts, tag: "p" });
        Object.assign(node.style, { margin: "0", display: "block" });
        return node;
    }

    function heading(level, text, id) {
        const node = el(`h${level}`, {
            margin: "0", fontSize: px(HEADING_SIZE[level]), fontWeight: String(FONT.bold), fontFamily: FONT.sans,
            lineHeight: "1.2", letterSpacing: level === 1 ? "-0.02em" : "0",
        });
        if (id) node.id = id;
        node.textContent = text;
        themed(node, { color: "text" });
        return node;
    }

    function code(text) {
        const node = el("code", { fontFamily: FONT.mono, fontSize: px(FONT.sm), padding: `1px ${px(SPACE.xs + 1)}`, borderRadius: px(RADIUS.sm) });
        node.textContent = text;
        themed(node, { background: "raised", color: "text" });
        return node;
    }

    // "Plain *bold* and `code`" becomes inline nodes, so copy can carry emphasis without any markup strings.
    function rich(text, opts = {}) {
        const box = el("p", { margin: "0", display: "block" });
        text.split(/(\*[^*]+\*|`[^`]+`)/).filter(Boolean).forEach((part) => {
            if (part.startsWith("*")) add(box, label(part.slice(1, -1), { ...opts, weight: FONT.bold }));
            else if (part.startsWith("`")) add(box, code(part.slice(1, -1)));
            else add(box, label(part, opts));
        });
        return box;
    }

    function linkStyle(node, palette, flags) {
        node.style.color = palette.accent;
        node.style.textDecoration = flags.hover ? "underline" : "none";
        node.style.outline = focusRing(palette, flags.ring);
    }

    // `to` is a route name or a "route?query" string; `href` is an external or file URL.
    function link(text, { to, href, download = false, size = FONT.md } = {}) {
        const node = el("a", { fontSize: px(size), fontFamily: FONT.sans, borderRadius: px(RADIUS.sm) });
        node.href = href || `#/${to}`;
        if (download) node.setAttribute("download", "");
        if (href && /^https?:/.test(href)) { node.target = "_blank"; node.rel = "noopener"; }
        node.textContent = text;
        interact(node, { native: true, onActivate: () => {}, draw: linkStyle });
        return node;
    }

    // Bulleted or numbered list; each item may use *bold* and `code` markup.
    function list(items, { ordered = false, size = FONT.md } = {}) {
        const box = el(ordered ? "ol" : "ul", { margin: "0", paddingLeft: px(SPACE.xl), display: "flex", flexDirection: "column", gap: px(SPACE.sm) });
        items.forEach((item) => add(box, add(el("li"), rich(item, { size }))));
        return box;
    }

    app.ui.text = { label, para, heading, code, rich, link, list };
})();
