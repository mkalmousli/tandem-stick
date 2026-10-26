// What each file card shows: the file itself, small. Spreadsheets, code and bundles get their own look.
(() => {
    const { el, add, themed } = app.dom;
    const { SPACE, FONT, RADIUS, px } = app.styles;
    const { label } = app.ui.text;
    const { load } = app.files.common;
    const T = app.files.tables;

    const LAYER_EXT = { F_Cu: "gtl", B_Cu: "gbl", In1_Cu: "g2", In2_Cu: "g3", F_Mask: "gts", B_Mask: "gbs", F_Silkscreen: "gto", B_Silkscreen: "gbo" };
    const BOARD_FILES = ["hardware/stick.kicad_pcb", "hardware/build_board.py"];

    // The layer STLs are shown flat: the same layer as its Gerber, in 2D.
    const gerberOf = (file) => {
        const match = /^hardware\/3d\/(.+)\.stl$/.exec(file.path || "");
        return match && LAYER_EXT[match[1]] ? { ...file, kind: "layer", path: `hardware/fab/gerbers/stick-${match[1]}.${LAYER_EXT[match[1]]}` } : null;
    };

    function code(text) {
        const pre = el("pre", { margin: "0", padding: px(SPACE.sm), width: "100%", fontFamily: FONT.mono, fontSize: px(FONT.xs), lineHeight: "1.5", overflow: "hidden", boxSizing: "border-box" });
        themed(pre, { color: "text" });
        pre.textContent = text.split("\n").slice(0, 12).map((line, at) => `${String(at + 1).padStart(2)}  ${line.slice(0, 60)}`).join("\n");
        return pre;
    }

    // A bundle shows a small tree of what is inside it, folders then files, each with its size.
    function bundle(buf) {
        const items = app.files.bundle.readZip(buf);
        const box = el("div", { width: "100%", padding: px(SPACE.sm), boxSizing: "border-box", display: "flex", flexDirection: "column", gap: px(1) });
        add(box, label(`${items.length} files inside`, { size: FONT.sm, weight: FONT.bold, tone: "accent" }));
        const dirs = new Set();
        let shown = 0;
        items.forEach((item) => {
            const parts = item.name.split("/");
            parts.slice(0, -1).forEach((dir, depth) => {
                const key = parts.slice(0, depth + 1).join("/");
                if (!dirs.has(key) && shown < 7) { dirs.add(key); shown++; add(box, label(`${"  ".repeat(depth)}▾ ${dir}`, { size: FONT.xs, tone: "muted", mono: true })); }
            });
            if (shown < 7) { shown++; add(box, label(`${"  ".repeat(parts.length - 1)}${parts[parts.length - 1]}`, { size: FONT.xs, mono: true })); }
        });
        if (shown >= 7) add(box, label("…", { size: FONT.xs, tone: "muted" }));
        return box;
    }

    async function thumbOf(file, RENDER) {
        const flat = gerberOf(file);
        if (flat) return [(await RENDER.layer(flat))[0]];
        if (BOARD_FILES.includes(file.path)) return [(await RENDER.board())[0]];
        if (file.kind === "csv") { const [head, ...rows] = T.csvRows(await load(file.path)); return [app.files.sheet.sheet(head, rows, { maxRows: 6 })]; }
        if (file.kind === "zip") return [bundle(await load(file.path, true))];
        if (file.kind === "text") return [code(await load(file.path))];
        return [(await RENDER[file.kind](file))[0]];
    }

    app.files.thumbs = { thumbOf, gerberOf };
})();
