// Download cards and file links. A "coming later" card marks things that do not exist yet.
(() => {
    const { el, add, themed, interact, focusRing } = app.dom;
    const { FONT, SPACE, RADIUS, px } = app.styles;
    const { label, para, heading } = app.ui.text;
    const { card, badge } = app.ui.card;
    const { stack, row } = app.ui.layout;

    function drawFile(node, palette, flags) {
        node.style.background = flags.hover ? palette.raised : palette.surface;
        node.style.borderColor = flags.hover ? palette.accent : palette.line;
        node.style.outline = focusRing(palette, flags.ring);
    }

    function fileLink(text, href) {
        const node = el("a", {
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: px(SPACE.md), padding: `${px(SPACE.sm)} ${px(SPACE.md)}`,
            borderRadius: px(RADIUS.sm), borderWidth: "1px", borderStyle: "solid", fontFamily: FONT.sans, fontSize: px(FONT.sm),
            textDecoration: "none", boxSizing: "border-box",
        });
        node.href = href;
        node.setAttribute("download", "");
        add(node, label(text, { size: FONT.sm }), label("Download", { size: FONT.xs, tone: "accent", weight: FONT.bold }));
        interact(node, { native: true, onActivate: () => {}, draw: drawFile });
        return node;
    }

    function downloadCard({ title, note, href, meta }) {
        const node = el("a", { display: "flex", flexDirection: "column", gap: px(SPACE.xs), padding: px(SPACE.lg), borderRadius: px(RADIUS.md), borderWidth: "1px", borderStyle: "solid", textDecoration: "none", boxSizing: "border-box" });
        node.href = href;
        node.setAttribute("download", "");
        add(node, heading(3, title), para(note, { size: FONT.sm, tone: "muted" }), meta ? label(meta, { size: FONT.xs, tone: "muted", mono: true }) : null);
        interact(node, { native: true, onActivate: () => {}, draw: drawFile });
        return node;
    }

    function comingCard(title, note) {
        const box = card(add(row(SPACE.sm), heading(3, title), badge("coming later")), para(note, { size: FONT.sm, tone: "muted" }));
        box.style.borderStyle = "dashed";
        return box;
    }

    app.ui.download = { fileLink, downloadCard, comingCard };
})();
