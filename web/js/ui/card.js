// Surfaces: card, section, key/value list, badge, callout.
(() => {
    const { el, add, themed } = app.dom;
    const { FONT, SPACE, RADIUS, px } = app.styles;
    const { label, para } = app.ui.text;
    const { stack } = app.ui.layout;

    function card(...children) {
        const node = stack(SPACE.sm, { padding: px(SPACE.lg), borderRadius: px(RADIUS.md), borderWidth: "1px", borderStyle: "solid", boxSizing: "border-box" });
        themed(node, { background: "surface", borderColor: "line" });
        return add(node, children);
    }

    function section(title, ...children) {
        const box = stack(SPACE.sm);
        add(box, label(title.toUpperCase(), { size: FONT.xs, weight: FONT.bold, tone: "muted" }), children);
        box.firstChild.style.letterSpacing = "0.08em";
        return box;
    }

    function kvList(rows) {
        const list = stack(SPACE.sm);
        rows.forEach(([key, value]) => {
            const line = el("div", { display: "flex", flexDirection: "column", gap: "2px" });
            add(line, label(key, { size: FONT.xs, tone: "muted" }), label(value, { size: FONT.sm }));
            add(list, line);
        });
        return list;
    }

    function badge(text, tone = "accent") {
        const node = label(text, { size: FONT.xs, weight: FONT.bold, tone: "muted" });
        Object.assign(node.style, { padding: `2px ${px(SPACE.sm)}`, borderRadius: px(RADIUS.pill), borderWidth: "1px", borderStyle: "solid", whiteSpace: "nowrap" });
        themed(node, tone === "accent"
            ? { background: "accent", color: "onAccent", borderColor: "accent" }
            : { background: () => "transparent", color: "muted", borderColor: "line" });
        return node;
    }

    // A bar with an accent edge: used for the "untested" warnings.
    function callout(...children) {
        const node = stack(SPACE.xs, { padding: `${px(SPACE.md)} ${px(SPACE.lg)}`, borderRadius: px(RADIUS.sm), borderLeftWidth: "3px", borderLeftStyle: "solid", boxSizing: "border-box" });
        themed(node, { background: "raised", borderLeftColor: "accent" });
        return add(node, children);
    }

    function note(text) {
        return para(text, { size: FONT.sm, tone: "muted" });
    }

    app.ui.card = { card, section, kvList, badge, callout, note };
})();
