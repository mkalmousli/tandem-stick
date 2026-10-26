// A spreadsheet-style grid for CSV files: column letters, row numbers, striped rows. Used in the dialog and, trimmed, on cards.
(() => {
    const { el, add, themed } = app.dom;
    const { SPACE, FONT, RADIUS, px } = app.styles;

    const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const NUMBER = /^[-+€$]?[\d.,]+%?$/;

    function cell(tag, text, props, tone) {
        const node = el(tag, { padding: `${px(3)} ${px(SPACE.sm)}`, whiteSpace: "nowrap", textAlign: props.right ? "right" : "left", borderBottomWidth: "1px", borderBottomStyle: "solid", borderRightWidth: "1px", borderRightStyle: "solid", fontWeight: props.bold ? String(FONT.bold) : "400" });
        themed(node, { color: tone || "text", borderColor: "line", background: props.fill || "surface" });
        node.textContent = text;
        return node;
    }

    function sheet(head, rows, { maxRows = Infinity, height = "auto" } = {}) {
        const wrap = el("div", { overflow: "auto", maxHeight: height, borderRadius: px(RADIUS.sm), borderWidth: "1px", borderStyle: "solid", fontFamily: FONT.mono, fontSize: px(FONT.xs), scrollbarWidth: "thin" });
        themed(wrap, { borderColor: "line" });
        const table = el("table", { borderCollapse: "separate", borderSpacing: "0", width: "100%" });
        const top = el("tr");
        add(top, cell("th", "", { fill: "raised" }, "muted"), ...head.map((name, at) => cell("th", `${LETTERS[at] || at + 1}  ${name}`, { fill: "raised", bold: true }, "accent")));
        add(table, add(el("thead"), top));
        const body = el("tbody");
        rows.slice(0, maxRows).forEach((values, at) => {
            const line = el("tr");
            const fill = at % 2 ? "raised" : "surface";
            add(line, cell("td", String(at + 1), { fill: "raised", right: true }, "muted"), ...values.map((text) => cell("td", text, { fill, right: NUMBER.test(text) })));
            add(body, line);
        });
        add(wrap, add(table, body));
        return wrap;
    }

    app.files.sheet = { sheet };
})();
