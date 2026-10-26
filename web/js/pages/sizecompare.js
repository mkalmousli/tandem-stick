// Home: the stick next to everyday things at true proportions, so its size is obvious at a glance.
(() => {
    const { el, add, themed } = app.dom;
    const { SPACE, FONT, RADIUS, px } = app.styles;
    const { label } = app.ui.text;
    const { row } = app.ui.layout;

    // Real sizes in mm: [name, width, height, shape].
    const THINGS = [["2 € coin", 25.75, 25.75, "coin"], ["AA battery", 50.5, 14.5, "cell"], ["Tandem Stick", 46.5, 20.4, "stick"], ["Credit card", 85.6, 54, "card"]];

    function shape(kind, w, h, k) {
        const node = el("div", { position: "relative", width: px(w * k), height: px(h * k), boxSizing: "border-box", flexShrink: "0" });
        if (kind === "coin") Object.assign(node.style, { borderRadius: "50%", background: "linear-gradient(135deg,#e8ecf2,#b3bac6)", borderWidth: "3px", borderStyle: "solid", borderColor: "#d9a441" });
        if (kind === "cell") Object.assign(node.style, { borderRadius: px(RADIUS.sm), background: "linear-gradient(#6b7280,#3b4049)" });
        if (kind === "card") Object.assign(node.style, { borderRadius: px(RADIUS.sm * 1.5), background: "linear-gradient(135deg,#4f7cff,#2a3a8a)" });
        if (kind === "stick") {
            const plug = 12 * k;
            add(node, el("div", { position: "absolute", left: "0", top: "0", bottom: "0", right: px(plug), borderRadius: `${px(RADIUS.sm * 2)} 0 0 ${px(RADIUS.sm * 2)}`, background: "linear-gradient(135deg,#ffd978,#f0a010)" }),
                el("div", { position: "absolute", right: "0", top: px(h * k * 0.18), bottom: px(h * k * 0.18), width: px(plug), background: "linear-gradient(#c9cfda,#8e96a5)" }));
        }
        return node;
    }

    function sizeCompare(scale = 2.2) {
        const box = row(SPACE.md, { alignItems: "flex-end", flexWrap: "wrap" });
        THINGS.forEach(([name, w, h, kind]) => {
            const tag = label(`${name} · ${w === h ? `Ø${w}` : w} mm`, { size: FONT.xs, tone: kind === "stick" ? "accent" : "muted", weight: kind === "stick" ? FONT.bold : FONT.regular });
            const cell = el("div", { display: "flex", flexDirection: "column", gap: px(SPACE.xs), alignItems: "flex-start" });
            add(cell, shape(kind, w, h, scale), tag);
            add(box, cell);
        });
        return box;
    }

    app.pages.sizeCompare = { sizeCompare };
})();
