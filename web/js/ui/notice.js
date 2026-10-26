// The "untested" strip shown under the header on every page.
(() => {
    const { el, add, themed } = app.dom;
    const { FONT, SPACE, px } = app.styles;
    const { label } = app.ui.text;

    const MESSAGE = "A DIY design. No board has been built or checked on real hardware yet, and the firmware is not released.";

    function untestedNotice() {
        const node = el("div", {
            display: "flex", alignItems: "center", justifyContent: "center", gap: px(SPACE.sm),
            padding: `${px(SPACE.xs)} ${px(SPACE.lg)}`, boxSizing: "border-box", textAlign: "center",
        }, { role: "note" });
        themed(node, { background: "accent" });
        const strong = label("Untested.", { size: FONT.sm, weight: FONT.bold });
        const rest = label(MESSAGE, { size: FONT.sm });
        [strong, rest].forEach((part) => themed(part, { color: "onAccent" }));
        return add(node, strong, rest);
    }

    app.ui.notice = { untestedNotice };
})();
