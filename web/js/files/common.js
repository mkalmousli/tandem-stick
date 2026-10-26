// Shared bits of the file previews: fetching, kinds, sizes, and the framed box.
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

    const BASE = "files/";
    const GERBER_DIR = "hardware/fab/gerbers/";
    const PREVIEW_MAX = 640;
    const cache = new Map();
    const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
    const kindOf = (path) => (/\.stl$/i.test(path) ? "stl" : /\.(csv|tsv)$/i.test(path) ? "csv" : /\.zip$/i.test(path) ? "zip" : IMAGE_EXT.test(path) ? "image" : g.isGerber(path) ? "layer" : g.isDrill(path) ? "drill" : "text");
    const sizeText = (bytes) => (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`);
    const previewWidth = () => Math.max(260, Math.min(PREVIEW_MAX, app.state.state.viewport.w - 2 * SPACE.xl - 2 * SPACE.lg));

    async function load(path, binary) {
        const key = `${binary ? "b" : "t"}:${path}`;
        if (!cache.has(key)) {
            cache.set(key, fetch(app.v(BASE + path)).then((res) => {
                if (!res.ok) throw new Error(`${res.status}`);
                return binary ? res.arrayBuffer() : res.text();
            }));
        }
        return cache.get(key);
    }

    const note = (text) => para(text, { size: FONT.sm, tone: "muted" });
    const frame = (...children) => {
        const box = el("div", { borderRadius: px(RADIUS.md), overflow: "hidden", borderWidth: "1px", borderStyle: "solid", boxSizing: "border-box" });
        themed(box, { borderColor: "line", background: "raised" });
        return add(box, children);
    };


    app.files.common = { BASE, GERBER_DIR, load, kindOf, sizeText, previewWidth, note, frame };
})();
