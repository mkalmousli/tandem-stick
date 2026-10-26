// The PCB drawn from the real Gerber files, layer by layer.
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
    const BACKDROP = "#0b1220", BOARD_FILL = "#1c1708", BOARD_PAD = 14, RATIO = 6;

    const LAYER_GROUPS = [
        ["Top copper", ["F_Cu"]], ["Bottom copper", ["B_Cu"]], ["Inner", ["In1_Cu", "In2_Cu"]], ["Silk", ["F_Silkscreen", "B_Silkscreen"]],
        ["Mask", ["F_Mask", "B_Mask"]], ["Paste", ["F_Paste", "B_Paste"]], ["Outline", ["Edge_Cuts"]], ["Holes", ["__drill"]],
    ];
    const GERBER_FILES = ["F_Cu", "B_Cu", "In1_Cu", "In2_Cu", "F_Silkscreen", "B_Silkscreen", "F_Mask", "B_Mask", "F_Paste", "B_Paste", "Edge_Cuts"];
    const EXT = { F_Cu: "gtl", B_Cu: "gbl", In1_Cu: "g2", In2_Cu: "g3", F_Silkscreen: "gto", B_Silkscreen: "gbo", F_Mask: "gts", B_Mask: "gbs", F_Paste: "gtp", B_Paste: "gbp", Edge_Cuts: "gm1" };

    async function loadBoard() {
        const layers = {};
        await Promise.all(GERBER_FILES.map(async (name) => { layers[name] = g.parseGerber(await load(`${GERBER_DIR}stick-${name}.${EXT[name]}`)); }));
        const holes = [...g.parseDrill(await load(`${GERBER_DIR}stick-PTH.drl`)), ...g.parseDrill(await load(`${GERBER_DIR}stick-NPTH.drl`))];
        return { layers, holes };
    }

    function boardView(data) {
        const visible = new Set(["F_Cu", "F_Silkscreen", "Edge_Cuts", "__drill"]);
        let flipped = false;
        const width = previewWidth();
        const box = g.bounds(data.layers.Edge_Cuts);
        const height = Math.round(width * ((box.y1 - box.y0) / (box.x1 - box.x0)) + 2 * BOARD_PAD);
        const canvas = el("canvas", { display: "block", width: "100%", height: "auto" });
        canvas.width = width * RATIO;
        canvas.height = height * RATIO;
        const ctx = canvas.getContext("2d");
        const draw = () => {
            ctx.setTransform(RATIO, 0, 0, RATIO, 0, 0);
            ctx.fillStyle = BACKDROP;
            ctx.fillRect(0, 0, width, height);
            const view = g.makeView(box, width, height, BOARD_PAD);
            const at = view.at;
            const mapped = { k: view.k, at: flipped ? (pt) => { const [px_, py_] = at(pt); return [width - px_, py_]; } : at };
            ctx.save();
            ctx.fillStyle = BOARD_FILL;
            g.drawOps(ctx, data.layers.Edge_Cuts.length ? [{ type: "region", pts: outlinePoints(data.layers.Edge_Cuts, box) }] : [], mapped, BOARD_FILL, 1);
            ctx.restore();
            const order = flipped ? ["In2_Cu", "In1_Cu", "B_Cu", "B_Mask", "B_Paste", "B_Silkscreen", "F_Cu", "F_Silkscreen", "F_Mask", "F_Paste", "Edge_Cuts"]
                : ["B_Cu", "In2_Cu", "In1_Cu", "B_Mask", "B_Paste", "B_Silkscreen", "F_Mask", "F_Paste", "F_Cu", "F_Silkscreen", "Edge_Cuts"];
            order.forEach((name) => {
                if (!visible.has(name)) return;
                const [, color, alpha] = g.styleFor(`stick-${name}.x`);
                const dim = (flipped ? /^F_/.test(name) : /^B_/.test(name)) || /^In/.test(name);
                g.drawOps(ctx, data.layers[name], mapped, color, name.endsWith("Mask") ? 0.3 : dim ? Math.min(alpha, g.DIM_ALPHA + 0.3) : alpha);
            });
            if (visible.has("__drill")) g.drawHoles(ctx, data.holes, mapped, BACKDROP);
        };
        const chips = row(SPACE.xs);
        LAYER_GROUPS.forEach(([title, names]) => {
            const btn = button({ label: title, kind: "tab", pressed: names.every((name) => visible.has(name)), ariaLabel: `Show ${title}`, onClick: () => {
                const on_ = !names.every((name) => visible.has(name));
                names.forEach((name) => (on_ ? visible.add(name) : visible.delete(name)));
                btn.setPressed(on_);
                draw();
            } });
            add(chips, btn);
        });
        const flip = button({ label: "Flip board", kind: "tab", pressed: false, onClick: () => { flipped = !flipped; flip.setPressed(flipped); draw(); } });
        draw();
        return [frame(zoomable(canvas, "PCB render")), chips, flip, note(`${(box.x1 - box.x0).toFixed(1)} × ${(box.y1 - box.y0).toFixed(1)} mm · 4 layers · ${data.holes.length} drilled holes`)];
    }

    // Edge.Cuts is drawn as line segments; chain them to fill the board shape.
    function outlinePoints(ops, box) {
        const lines = ops.filter((op) => op.type === "line");
        if (!lines.length) return [[box.x0, box.y0], [box.x1, box.y0], [box.x1, box.y1], [box.x0, box.y1]];
        const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-3 && Math.abs(a[1] - b[1]) < 1e-3;
        const rest = lines.slice(1);
        const pts = [lines[0].from, lines[0].to];
        while (rest.length) {
            const tail = pts[pts.length - 1];
            const idx = rest.findIndex((seg) => same(seg.from, tail) || same(seg.to, tail));
            if (idx < 0) break;
            const [seg] = rest.splice(idx, 1);
            pts.push(same(seg.from, tail) ? seg.to : seg.from);
        }
        return pts;
    }


    app.files.board = { boardView, loadBoard, outlinePoints };
})();
