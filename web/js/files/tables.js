// CSV, text, zip, binary and image views.
(() => {
    const { el, add, on, track, region, themed } = app.dom;
    const { SPACE, RADIUS, FONT, px } = app.styles;
    const { para } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row } = app.ui.layout;
    const { table } = app.ui.table;
    const { zoomable } = app.ui.zoom;
    const { copyButton } = app.ui.copy;
    const g = app.files.gerber;
    const C = app.files.common;
    const { load, note, frame, previewWidth, GERBER_DIR, sizeText } = C;
    const TEXT_H = 300;

    // Quoted fields, escaped quotes and empty cells all keep their column; short rows are padded.
    function csvRows(text) {
        const rows = [[""]];
        let quoted = false;
        for (let at = 0; at < text.length; at++) {
            const ch = text[at], row = rows[rows.length - 1];
            if (quoted) { if (ch === '"' && text[at + 1] === '"') { row[row.length - 1] += '"'; at++; } else if (ch === '"') quoted = false; else row[row.length - 1] += ch; }
            else if (ch === '"') quoted = true;
            else if (ch === ",") row.push("");
            else if (ch === "\n") rows.push([""]);
            else if (ch !== "\r") row[row.length - 1] += ch;
        }
        const filled = rows.filter((row) => row.length > 1 || row[0]);
        const width = Math.max(...filled.map((row) => row.length));
        return filled.map((row) => row.concat(Array(width - row.length).fill("")));
    }

    const copyRow = (...buttons) => add(row(SPACE.sm), buttons);

    function csvView(text) {
        const [head, ...rows] = csvRows(text);
        return [copyRow(copyButton("Copy as CSV", () => text)), app.files.sheet.sheet(head, rows, { height: `${TEXT_H + 60}px` }), note(`${rows.length} rows, ${head.length} columns. Copy pastes straight into a spreadsheet.`)];
    }

    // The whole file, selectable, in a scrolling box. Copy puts all of it on the clipboard.
    function textView(text) {
        const lines = text.split("\n");
        const pre = el("pre", { margin: "0", padding: px(SPACE.md), overflow: "auto", scrollbarWidth: "thin", height: px(TEXT_H), fontFamily: FONT.mono, fontSize: px(FONT.xs), lineHeight: "1.5", userSelect: "text", whiteSpace: "pre", boxSizing: "border-box", tabSize: "4" });
        themed(pre, { color: "text" });
        pre.textContent = text;
        pre.tabIndex = 0;
        pre.setAttribute("aria-label", "File contents");
        const select = () => { const range = document.createRange(); range.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); };
        return [copyRow(copyButton("Copy all", () => text, { fallback: select }), button({ label: "Select all", onClick: select })), frame(pre), note(`${lines.length.toLocaleString()} lines, ${(text.length / 1024).toFixed(1)} KB. The whole file is shown.`)];
    }

    // Lists a zip's entries from its central directory (no decompression needed).
    function zipEntries(buf) {
        const view = new DataView(buf);
        let end = buf.byteLength - 22;
        while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
        if (end < 0) return [];
        const count = view.getUint16(end + 10, true);
        let at = view.getUint32(end + 16, true);
        const names = new TextDecoder();
        const out = [];
        for (let i = 0; i < count && view.getUint32(at, true) === 0x02014b50; i++) {
            const nameLen = view.getUint16(at + 28, true);
            const extraLen = view.getUint16(at + 30, true);
            const commentLen = view.getUint16(at + 32, true);
            out.push([names.decode(new Uint8Array(buf, at + 46, nameLen)), sizeText(view.getUint32(at + 24, true))]);
            at += 46 + nameLen + extraLen + commentLen;
        }
        return out;
    }

    function zipView(buf) {
        const rows = zipEntries(buf);
        return [table({ head: ["File in the zip", "Size"], rows, numeric: [1] }), note(`${rows.length} files. Download the zip to get them all.`)];
    }

    const MAGIC = [["PNG image", [0x89, 0x50]], ["JPEG image", [0xff, 0xd8]], ["ZIP archive", [0x50, 0x4b]], ["gzip archive", [0x1f, 0x8b]], ["PDF document", [0x25, 0x50]], ["ESP32 firmware image", [0xe9]]];

    // Binary files: say what it is and how big, instead of dumping bytes nobody can read.
    function binaryView(file, buf) {
        const head = new Uint8Array(buf, 0, Math.min(buf.byteLength, 4));
        const found = MAGIC.find(([, bytes]) => bytes.every((byte, idx) => head[idx] === byte));
        return [table({ rows: [["File", file.name], ["Looks like", found ? found[0] : "Binary data"], ["Size", `${buf.byteLength.toLocaleString()} bytes`]], boldFirst: true, copy: false }), note("Not readable as text. Use the download button to open it in the right program.")];
    }

    function imageView(file) {
        const img = el("img", { display: "block", width: "100%", height: "auto" }, { alt: file.name, src: BASE + file.path });
        return [frame(zoomable(img, file.name))];
    }

    app.files.tables = { csvRows, zipEntries, csvView, textView, zipView, binaryView, imageView };
})();
