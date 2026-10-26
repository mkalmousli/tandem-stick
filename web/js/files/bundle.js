// Bundle (zip) preview: a tree of what is inside next to a preview of the selected file, read in the browser.
(() => {
    const { el, add, on, region, themed } = app.dom;
    const { SPACE, RADIUS, FONT, px } = app.styles;
    const { label } = app.ui.text;
    const { stack } = app.ui.layout;
    const { note, kindOf, sizeText } = app.files.common;
    const T = app.files.tables;

    // Entries from the central directory, with what is needed to unpack one.
    function readZip(buf) {
        const view = new DataView(buf);
        let end = buf.byteLength - 22;
        while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
        const out = [];
        let at = end < 0 ? 0 : view.getUint32(end + 16, true);
        for (let i = 0; end >= 0 && i < view.getUint16(end + 10, true); i++) {
            const n = view.getUint16(at + 28, true);
            out.push({ name: new TextDecoder().decode(new Uint8Array(buf, at + 46, n)), method: view.getUint16(at + 10, true), packed: view.getUint32(at + 20, true), size: view.getUint32(at + 24, true), head: view.getUint32(at + 42, true) });
            at += 46 + n + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
        }
        return out.filter((item) => !item.name.endsWith("/"));
    }

    async function unpack(buf, item) {
        const view = new DataView(buf);
        const start = item.head + 30 + view.getUint16(item.head + 26, true) + view.getUint16(item.head + 28, true);
        const raw = new Blob([buf.slice(start, start + item.packed)]);
        if (item.method === 0) return raw.arrayBuffer();
        return new Response(raw.stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
    }

    async function show(buf, item) {
        const data = await unpack(buf, item);
        const kind = kindOf(item.name);
        if (kind === "stl") return app.files.stl.stlView(data, item.name);
        if (kind === "csv") return T.csvView(new TextDecoder().decode(data));
        if (kind === "image") return [note("Image file. Download the zip to open it.")];
        const sample = new Uint8Array(data, 0, Math.min(data.byteLength, 2048));
        return sample.includes(0) ? T.binaryView({ name: item.name }, data) : [...T.textView(new TextDecoder().decode(data))];
    }

    // Folders become indented headings, files become rows.
    function treeRows(items, pick) {
        const rows = [], seen = new Set();
        items.forEach((item) => {
            const parts = item.name.split("/");
            parts.slice(0, -1).forEach((dir, depth) => {
                const key = parts.slice(0, depth + 1).join("/");
                if (!seen.has(key)) { seen.add(key); rows.push(add(el("div", { padding: `${px(2)} ${px(SPACE.xs)} ${px(2)} ${px(depth * 14)}` }), label(`▾ ${dir}`, { size: FONT.xs, tone: "muted", weight: FONT.bold }))); }
            });
            const row = el("button", { display: "flex", justifyContent: "space-between", gap: px(SPACE.sm), textAlign: "left", border: "0", borderRadius: px(RADIUS.sm), padding: `${px(3)} ${px(SPACE.xs)} ${px(3)} ${px((parts.length - 1) * 14 + 4)}`, cursor: "pointer", fontFamily: FONT.mono, fontSize: px(FONT.xs) });
            row.append(parts[parts.length - 1], el("span", {}, { textContent: sizeText(item.size) }));
            on(row, "click", () => pick(item, row));
            rows.push(row);
        });
        return rows;
    }

    function bundleView(buf) {
        const items = readZip(buf);
        const side = el("div", { display: "flex", flexDirection: "column", gap: px(1), flex: "0 1 240px", minWidth: "180px", maxHeight: "420px", overflowY: "auto", scrollbarWidth: "thin" });
        const holder = stack(SPACE.sm, { flex: "1 1 320px", minWidth: "0" });
        const view = region(holder);
        let current = null;
        const pick = (item, row) => {
            if (current) themed(current, { background: "surface", color: "text" });
            current = row;
            themed(row, { background: "accent", color: "onAccent" });
            view.render(() => add(holder, note("Loading preview…")));
            show(buf, item).then((nodes) => view.render(() => add(holder, nodes)), () => view.render(() => add(holder, note("This file could not be previewed. Download the zip to open it."))));
        };
        const rows = treeRows(items, pick);
        rows.forEach((row) => { if (row.tagName === "BUTTON") themed(row, { background: "surface", color: "text" }); });
        add(side, rows);
        const first = rows.find((row) => row.tagName === "BUTTON");
        if (first) first.click();
        const wrap = el("div", { display: "flex", flexWrap: "wrap", gap: px(SPACE.md), alignItems: "flex-start" });
        return [add(wrap, side, holder), note(`${items.length} files in this bundle. Pick one to preview it, download the zip to get them all.`)];
    }

    app.files.bundle = { bundleView, readZip };
})();
