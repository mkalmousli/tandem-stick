// Data table inside a horizontally scrollable frame, so wide tables never break the page on phones.
(() => {
    const { el, add, themed, scroller } = app.dom;
    const { copyButton } = app.ui.copy;
    const { FONT, SPACE, RADIUS, px } = app.styles;

    const ALIGN_RIGHT = "right";

    function cell(tag, content, right, bold) {
        const node = el(tag, {
            padding: `${px(SPACE.sm)} ${px(SPACE.md)}`, textAlign: right ? ALIGN_RIGHT : "left", fontSize: px(FONT.sm), fontFamily: FONT.sans,
            fontWeight: String(bold ? FONT.bold : FONT.regular), verticalAlign: "top", borderBottomWidth: "1px", borderBottomStyle: "solid",
            lineHeight: "1.45",
        });
        themed(node, { borderBottomColor: "line", color: "text" });
        if (content instanceof Node) add(node, content);
        else node.textContent = content;
        return node;
    }

    function line(values, numeric, tag, boldFirst) {
        const tr = el("tr");
        values.forEach((value, idx) => add(tr, cell(tag, value, numeric.includes(idx), tag === "th" || (boldFirst && idx === 0))));
        return tr;
    }

    // head: string[]; rows: (string|Node)[][]; numeric: indexes of right-aligned columns; foot: optional last row.
    function table({ head, rows, numeric = [], foot, boldFirst = false, copy = true }) {
        const frame = el("div", { overflowX: "auto", borderRadius: px(RADIUS.md), borderWidth: "1px", borderStyle: "solid" });
        themed(frame, { borderColor: "line", background: "surface" });
        const node = el("table", { borderCollapse: "collapse", width: "100%" });
        if (head) add(node, add(el("thead"), line(head, numeric, "th")));
        add(node, add(el("tbody"), rows.map((values) => line(values, numeric, "td", boldFirst))));
        if (foot) add(node, add(el("tfoot"), line(foot, numeric, "th")));
        add(frame, node);
        scroller(frame);
        if (!copy) return frame;
        const all = [head, ...rows].filter(Boolean).map((values) => values.map((value) => (value instanceof Node ? value.textContent : value)).join("\t")).join("\n");
        const wrap = el("div", { display: "flex", flexDirection: "column", gap: px(SPACE.xs), alignItems: "stretch" });
        const bar = el("div", { display: "flex", justifyContent: "flex-end" });
        return add(wrap, add(bar, copyButton("Copy table", () => all)), frame);
    }

    app.ui.table = { table };
})();
