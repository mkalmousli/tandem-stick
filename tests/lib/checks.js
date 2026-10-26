// Design checks used by `npm test`. Pure: no DOM, no Node APIs.
import { loadData } from "./webapp.mjs";
const { DIM, BOM, SETUP, CHIPS, PORTS, PASSIVES } = loadData();

export const GERBER_FILES = ["B_Cu.gbl", "B_Mask.gbs", "B_Paste.gbp", "B_Silkscreen.gbo", "Edge_Cuts.gm1", "F_Cu.gtl", "F_Mask.gts", "F_Paste.gtp", "F_Silkscreen.gto", "In1_Cu.g2", "In2_Cu.g3"].map((n) => `hardware/fab/gerbers/stick-${n}`);
export const DRILL_FILES = ["PTH", "NPTH"].map((n) => `hardware/fab/gerbers/stick-${n}.drl`);
export const STL_FILES = ["mechanical/case-tray.stl", "mechanical/case-lid.stl"];
export const BOARD = { w: 33, d: 17.4, tab: 13.5 }; // the USB-A plug is a tab beyond the main board

export function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ",") { row.push(cell); cell = ""; }
        else if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") i++;
            row.push(cell); cell = "";
            if (row.some((v) => v !== "")) rows.push(row);
            row = [];
        } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    const [head, ...body] = rows;
    return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

// Bounding box of every X/Y coordinate in a Gerber file, in mm.
export function gerberBounds(text) {
    const fs = /%FSLAX(\d)(\d)Y\d\d\*%/.exec(text);
    if (!fs || !/%MOMM\*%/.test(text)) throw new Error("expected metric Gerber with FSLA header");
    const scale = 10 ** Number(fs[2]);
    const xs = [], ys = [];
    for (const m of text.matchAll(/X(-?\d+)Y(-?\d+)D0[123]\*/g)) { xs.push(Number(m[1]) / scale); ys.push(Number(m[2]) / scale); }
    if (!xs.length) throw new Error("no coordinates");
    return { w: Math.max(...xs) - Math.min(...xs), d: Math.max(...ys) - Math.min(...ys) };
}

// Binary STL → triangle count, bounding box and whether every edge is used an even number of times.
export function stlInfo(buffer) {
    const view = new DataView(buffer);
    const count = view.getUint32(80, true);
    const expected = 84 + count * 50;
    if (buffer.byteLength !== expected) throw new Error(`size ${buffer.byteLength} does not match ${count} triangles (${expected})`);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const edges = new Map();
    const key = (p) => p.map((v) => Math.round(v * 1000)).join(",");
    for (let t = 0; t < count; t++) {
        const pts = [0, 1, 2].map((k) => [0, 1, 2].map((a) => view.getFloat32(84 + t * 50 + 12 + k * 12 + a * 4, true)));
        pts.forEach((p) => p.forEach((v, a) => { min[a] = Math.min(min[a], v); max[a] = Math.max(max[a], v); }));
        for (let k = 0; k < 3; k++) {
            const [a, b] = [key(pts[k]), key(pts[(k + 1) % 3])].sort();
            if (a === b) continue;
            edges.set(`${a}|${b}`, (edges.get(`${a}|${b}`) || 0) + 1);
        }
    }
    const open = [...edges.values()].filter((n) => n % 2).length;
    return { count, size: max.map((v, i) => v - min[i]), openEdges: open };
}

const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const euro = (n) => `€${n.toFixed(2)}`;
const perStick = (qty) => (BOM.reduce((t, [, q, u]) => t + q * u, 0) * qty + SETUP.reduce((t, [, lo, hi]) => t + (lo + hi) / 2, 0)) / qty;

// Each check: { group, name, run(load) } where run throws on failure and returns a short detail string.
// load(path, "text" | "buffer") resolves repo-relative paths like "hardware/fab/bom.csv".
export const CHECKS = [
    { group: "Model", name: "Case dimensions follow from part sizes", run() {
        const wantW = DIM.pcbW + 2 * 0.3 + 2 * DIM.wall, wantD = DIM.pcbD + 2 * 0.3 + 2 * DIM.wall;
        if (!near(DIM.w, wantW) || !near(DIM.d, wantD)) throw new Error(`got ${DIM.w} × ${DIM.d}, want ${wantW} × ${wantD}`);
        return `${DIM.w.toFixed(1)} × ${DIM.d.toFixed(1)} × ${DIM.h.toFixed(1)} mm`;
    } },
    { group: "Model", name: "Case matches board size", run() {
        if (!near(DIM.pcbW, BOARD.w) || !near(DIM.pcbD, BOARD.d)) throw new Error(`model board ${DIM.pcbW} × ${DIM.pcbD}`);
        return `${BOARD.w} × ${BOARD.d} mm`;
    } },
    { group: "Model", name: "Plug sticks out of the case", run() {
        if (!(DIM.plugOut > 10)) throw new Error(`plugOut ${DIM.plugOut}`);
        return `${DIM.plugOut.toFixed(2)} mm outside`;
    } },
    { group: "Model", name: "Every part fits inside the board", run() {
        const bad = [...CHIPS, ...PASSIVES].filter(({ pos: [x, z], size: [sx, sz] }) => Math.abs(x) + sx / 2 > DIM.pcbW / 2 + 0.01 || Math.abs(z) + sz / 2 > DIM.pcbD / 2 + 0.01);
        if (bad.length) throw new Error(`${bad.length} part(s) overhang the board`);
        return `${CHIPS.length} chips, ${PASSIVES.length} passives`;
    } },
    { group: "Model", name: "Part IDs are unique", run() {
        const ids = [...CHIPS, ...PORTS].map((i) => i.id);
        if (new Set(ids).size !== ids.length) throw new Error("duplicate id");
        return ids.join(", ");
    } },
    { group: "Cost", name: "BOM lines are positive", run() {
        const bad = BOM.filter(([, q, u]) => !(q > 0 && u > 0));
        if (bad.length) throw new Error(bad.map((b) => b[0]).join(", "));
        return `${BOM.length} lines`;
    } },
    { group: "Cost", name: "Per-stick cost at 5 units is near €10", run() {
        const c = perStick(5);
        if (c < 8 || c > 12) throw new Error(`${euro(c)} is outside €8–€12`);
        return euro(c);
    } },
    { group: "Cost", name: "Cost falls as quantity rises", run() {
        if (!(perStick(20) < perStick(5))) throw new Error("not monotonic");
        return `${euro(perStick(5))} → ${euro(perStick(20))}`;
    } },
    { group: "Fab files", name: "All 11 Gerber layers are well-formed", async run(load) {
        for (const f of GERBER_FILES) {
            const t = await load(f, "text");
            if (!t.startsWith("%TF.GenerationSoftware") || !/M02\*\s*$/.test(t)) throw new Error(`${f} is truncated or malformed`);
        }
        return `${GERBER_FILES.length} files`;
    } },
    { group: "Fab files", name: "Drill files are well-formed", async run(load) {
        for (const f of DRILL_FILES) {
            const t = await load(f, "text");
            if (!t.startsWith("M48") || !/M30\s*$/.test(t)) throw new Error(`${f} is malformed`);
        }
        return DRILL_FILES.length + " files";
    } },
    { group: "Fab files", name: "Board outline is 33 × 17.4 mm", async run(load) {
        const { w, d } = gerberBounds(await load("hardware/fab/gerbers/stick-Edge_Cuts.gm1", "text"));
        if (!near(w, BOARD.w + BOARD.tab) || !near(d, BOARD.d)) throw new Error(`outline is ${w} × ${d}`);
        return `${w} × ${d} mm`;
    } },
    { group: "Fab files", name: "Job file says 4 layers, 1.6 mm", async run(load) {
        const job = JSON.parse(await load("hardware/fab/gerbers/stick-job.gbrjob", "text"));
        const g = job.GeneralSpecs;
        if (g.LayerNumber !== 4 || !near(g.BoardThickness, 1.6)) throw new Error(`${g.LayerNumber} layers, ${g.BoardThickness} mm`);
        return `${g.LayerNumber} layers, ${g.BoardThickness} mm`;
    } },
    { group: "Fab files", name: "Every placed part is in the BOM", async run(load) {
        const bom = parseCsv(await load("hardware/fab/bom.csv", "text"));
        const pos = parseCsv(await load("hardware/fab/pos.csv", "text"));
        const listed = new Set(bom.flatMap((r) => r.Designator.split(",").map((s) => s.trim())));
        const missing = pos.map((r) => r.Designator).filter((d) => !listed.has(d) && d !== "J1");
        if (missing.length) throw new Error(`not in BOM: ${missing.join(", ")}`);
        return `${pos.length} placements`;
    } },
    { group: "Fab files", name: "BOM has no duplicate designators", async run(load) {
        const bom = parseCsv(await load("hardware/fab/bom.csv", "text"));
        const all = bom.flatMap((r) => r.Designator.split(",").map((s) => s.trim()));
        if (new Set(all).size !== all.length) throw new Error("duplicate designator");
        return `${all.length} designators`;
    } },
    { group: "Fab files", name: "KiCad board has 4 copper layers", async run(load) {
        const t = await load("hardware/stick.kicad_pcb", "text");
        const n = (t.match(/\(\d+ "[^"]+" (signal|power)\b/g) || []).length;
        if (n !== 4) throw new Error(`${n} copper layers`);
        return "F.Cu, In1.Cu, In2.Cu, B.Cu";
    } },
    ...STL_FILES.map((file) => ({ group: "Case STL", name: `${file.split("/")[1]}: valid binary STL, closed shells, fits the case`, async run(load) {
        const info = stlInfo(await load(file, "buffer"));
        if (info.openEdges) throw new Error(`${info.openEdges} edges are not paired`);
        const [x, y, z] = info.size;
        if (x > DIM.w + 0.5 || y > DIM.d + 0.5 || z > DIM.h + 0.5) throw new Error(`${x.toFixed(1)} × ${y.toFixed(1)} × ${z.toFixed(1)} exceeds the case`);
        return `${info.count} tris, ${x.toFixed(1)} × ${y.toFixed(1)} × ${z.toFixed(1)} mm`;
    } })),
];

export async function runAll(load, onResult = () => {}) {
    const out = [];
    for (const check of CHECKS) {
        let res;
        try { res = { ...check, ok: true, detail: await check.run(load) }; } catch (err) { res = { ...check, ok: false, detail: String(err.message || err) }; }
        out.push(res);
        onResult(res);
    }
    return out;
}
