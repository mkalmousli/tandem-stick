// Gerber layer and drill file facts.
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
    const { load, note, frame, previewWidth, GERBER_DIR } = C;
    const { outlinePoints } = app.files.board;
    const BACKDROP = "#0b1220", BOARD_FILL = "#1c1708", BOARD_PAD = 14, RATIO = 6;

    const LAYER_ROLE = { Cu: "Copper: the wires and pads", Mask: "Solder mask: the coating, openings show bare metal", Paste: "Solder paste stencil openings", Silkscreen: "Printed labels and outlines", Cuts: "Board outline" };
    const SHAPE_NAME = { flash: "Pads and vias", line: "Tracks", region: "Filled areas", arc: "Curved tracks" };
    const roleOf = (name) => LAYER_ROLE[Object.keys(LAYER_ROLE).find((key) => name.endsWith(key))] || "Board layer";

    // What the layer is and what is on it, counted by kind of shape.
    function layerFacts(name, ops, box) {
        const counts = {};
        ops.forEach((op) => { counts[op.type] = (counts[op.type] || 0) + 1; });
        const rows = [["Layer", name.replace(/_/g, " ")], ["Does", roleOf(name)], ["Board", `${(box.x1 - box.x0).toFixed(1)} × ${(box.y1 - box.y0).toFixed(1)} mm`], ...Object.entries(counts).map(([kind, count]) => [SHAPE_NAME[kind] || kind, String(count)])];
        return table({ rows, boldFirst: true, copy: false });
    }

    // One Gerber layer drawn over the board outline, with the raw file underneath.
    async function layerView(file) {
        const name = g.layerName(file.path);
        const [text, edgeText] = await Promise.all([load(file.path), load(`${GERBER_DIR}stick-Edge_Cuts.gm1`)]);
        const ops = g.parseGerber(text);
        const edge = g.parseGerber(edgeText);
        const box = g.bounds(edge);
        const width = previewWidth();
        const height = Math.round(width * ((box.y1 - box.y0) / (box.x1 - box.x0)) + 2 * BOARD_PAD);
        const canvas = el("canvas", { display: "block", width: "100%", height: "auto" });
        canvas.width = width * RATIO;
        canvas.height = height * RATIO;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(RATIO, 0, 0, RATIO, 0, 0);
        ctx.fillStyle = BACKDROP;
        ctx.fillRect(0, 0, width, height);
        const view = g.makeView(box, width, height, BOARD_PAD);
        g.drawOps(ctx, [{ type: "region", pts: outlinePoints(edge, box) }], view, BOARD_FILL, 1);
        const [, color, alpha] = g.styleFor(`stick-${name}.x`);
        g.drawOps(ctx, ops, view, color, Math.max(alpha, 0.55));
        g.drawOps(ctx, edge, view, "#ffd54a", 1);
        return [frame(zoomable(canvas, `${name} layer`)), layerFacts(name, ops, box)];
    }

    // Drill hits as a table: where each hole is and how big.
    async function drillView(file) {
        const holes = g.parseDrill(await load(file.path));
        const rows = holes.map(({ at, d }, idx) => [String(idx + 1), at[0].toFixed(2), at[1].toFixed(2), d.toFixed(2)]);
        const sizes = [...new Set(holes.map(({ d }) => d.toFixed(2)))].map((d) => `${holes.filter((hole) => hole.d.toFixed(2) === d).length} × ${d} mm`);
        return [note(`${holes.length} holes: ${sizes.join(", ") || "none"}. Positions in mm.`), table({ head: ["#", "X mm", "Y mm", "Diameter mm"], rows, numeric: [0, 1, 2, 3] })];
    }


    app.files.layers = { layerView, drillView };
})();
