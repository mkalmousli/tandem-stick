// A small Gerber and Excellon renderer: parses the KiCad files in the download bundle and draws them on a canvas.
(() => {
    const SCALE = 1e-6; // coordinates are 4.6 metric: millionths of a mm
    const LAYER_STYLE = [
        ["B_Cu", "#3b82f6", 0.7], ["In2_Cu", "#a78bfa", 0.35], ["In1_Cu", "#34d399", 0.35], ["F_Cu", "#ff8a3d", 0.85],
        ["B_Mask", "#22c55e", 0.0], ["F_Mask", "#22c55e", 0.0], ["B_Paste", "#cbd5e1", 0.5], ["F_Paste", "#cbd5e1", 0.5],
        ["B_Silkscreen", "#e2e8f0", 0.9], ["F_Silkscreen", "#f8fafc", 0.95], ["Edge_Cuts", "#ffd54a", 1],
    ];
    const DIM_ALPHA = 0.22;
    const MIN_STROKE_MM = 0.08;

    const layerName = (path) => (/stick-(.+)\.[a-z0-9]+$/i.exec(path) || [])[1] || "";
    const styleFor = (path) => LAYER_STYLE.find(([name]) => name === layerName(path)) || ["", "#9ca3af", 0.8];
    const isGerber = (path) => /\.(gtl|gbl|g2|g3|gto|gbo|gts|gbs|gtp|gbp|gm1)$/i.test(path);
    const isDrill = (path) => /\.drl$/i.test(path);

    function parseApertures(text) {
        const apertures = {};
        for (const m of text.matchAll(/%ADD(\d+)([A-Za-z]+),([^*]+)\*%/g)) {
            const nums = m[3].split("X").map(Number);
            apertures[m[1]] = m[2] === "C" ? { w: nums[0], h: nums[0], round: true }
                : m[2] === "R" || m[2] === "O" ? { w: nums[0], h: nums[1], round: m[2] === "O" }
                    : macroSize(nums);
        }
        return apertures;
    }

    // Rounded rectangles come as a macro: radius, then four corner points.
    function macroSize([radius, ...pts]) {
        const xs = pts.filter((_, idx) => idx % 2 === 0), ys = pts.filter((_, idx) => idx % 2 === 1);
        return { w: Math.max(...xs) - Math.min(...xs) + 2 * radius, h: Math.max(...ys) - Math.min(...ys) + 2 * radius, round: false };
    }

    // Returns drawing commands in mm: { line, flash, region }.
    function parseGerber(text) {
        const apertures = parseApertures(text);
        const ops = [];
        let current = null, region = null, x = 0, y = 0;
        const body = text.replace(/%[^%]*%/g, "");
        for (const word of body.split("*")) {
            const code = /^G3[67]$/.exec(word.trim());
            if (code) { if (code[0] === "G36") region = []; else { ops.push({ type: "region", pts: region }); region = null; } continue; }
            const sel = /^D(\d+)$/.exec(word.trim());
            if (sel && Number(sel[1]) >= 10) { current = apertures[sel[1]]; continue; }
            const m = /X(-?\d+)Y(-?\d+)D0([123])/.exec(word) || /X(-?\d+)D0([123])/.exec(word) || /Y(-?\d+)D0([123])/.exec(word);
            if (!m) continue;
            const nx = /X(-?\d+)/.exec(word), ny = /Y(-?\d+)/.exec(word);
            const px = nx ? Number(nx[1]) * SCALE : x, py = ny ? Number(ny[1]) * SCALE : y;
            const draw = word.includes("D01"), flash = word.includes("D03");
            if (region) { if (draw) region.push([px, py]); else region = [[px, py]]; }
            else if (draw && current) ops.push({ type: "line", from: [x, y], to: [px, py], w: current.w });
            else if (flash && current) ops.push({ type: "flash", at: [px, py], ap: current });
            x = px; y = py;
        }
        return ops;
    }

    function parseDrill(text) {
        const tools = {};
        for (const m of text.matchAll(/^T(\d+)C([\d.]+)/gm)) tools[m[1]] = Number(m[2]);
        const holes = [];
        let tool = 0;
        text.split("\n").forEach((line) => {
            const t = /^T(\d+)$/.exec(line.trim());
            if (t) { tool = tools[t[1]] || 0; return; }
            const m = /^X(-?[\d.]+)Y(-?[\d.]+)/.exec(line.trim());
            if (m && tool) holes.push({ at: [Number(m[1]), Number(m[2])], d: tool });
        });
        return holes;
    }

    function bounds(ops) {
        const xs = [], ys = [];
        ops.forEach((op) => {
            [op.from, op.to, op.at, ...(op.pts || [])].filter(Boolean).forEach(([px, py]) => { xs.push(px); ys.push(py); });
        });
        return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    }

    // Maps board mm to canvas pixels, y flipped because Gerber y points up.
    function makeView(box, w, h, pad) {
        const k = Math.min((w - 2 * pad) / (box.x1 - box.x0), (h - 2 * pad) / (box.y1 - box.y0));
        const ox = (w - (box.x1 - box.x0) * k) / 2 - box.x0 * k;
        const oy = (h + (box.y1 - box.y0) * k) / 2 + box.y0 * k;
        return { k, at: ([px, py]) => [ox + px * k, oy - py * k] };
    }

    function drawOps(ctx, ops, view, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ops.forEach((op) => {
            if (op.type === "line") {
                ctx.lineWidth = Math.max(op.w, MIN_STROKE_MM) * view.k;
                ctx.beginPath(); ctx.moveTo(...view.at(op.from)); ctx.lineTo(...view.at(op.to)); ctx.stroke();
            } else if (op.type === "flash") {
                const [cx, cy] = view.at(op.at), { w, h, round } = op.ap;
                if (round && w === h) { ctx.beginPath(); ctx.arc(cx, cy, (w * view.k) / 2, 0, Math.PI * 2); ctx.fill(); }
                else ctx.fillRect(cx - (w * view.k) / 2, cy - (h * view.k) / 2, w * view.k, h * view.k);
            } else if (op.type === "region" && op.pts && op.pts.length > 2) {
                ctx.beginPath();
                op.pts.forEach((pt, idx) => ctx[idx ? "lineTo" : "moveTo"](...view.at(pt)));
                ctx.closePath(); ctx.fill();
            }
        });
        ctx.restore();
    }

    function drawHoles(ctx, holes, view, color) {
        ctx.save();
        ctx.fillStyle = color;
        holes.forEach(({ at, d }) => { const [cx, cy] = view.at(at); ctx.beginPath(); ctx.arc(cx, cy, Math.max((d * view.k) / 2, 1.5), 0, Math.PI * 2); ctx.fill(); });
        ctx.restore();
    }

    app.files = Object.assign(app.files || {}, { gerber: { parseGerber, parseDrill, bounds, makeView, drawOps, drawHoles, layerName, styleFor, isGerber, isDrill, LAYER_STYLE, DIM_ALPHA } });
})();
