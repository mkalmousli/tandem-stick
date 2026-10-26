// Files tab: every downloadable file with a live preview (3D for STL, a rendered board for Gerbers, tables for CSV, text for code).
(() => {
    const { el, add, on, track, region, themed, scroller } = app.dom;
    const { state, setState } = app.ex;
    const { SPACE, RADIUS, FONT, px } = app.styles;
    const { label, para } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row } = app.ui.layout;
    const { fileLink } = app.ui.download;
    const { table } = app.ui.table;
    const { badge } = app.ui.card;
    const { zoomable } = app.ui.zoom;
    const { copyButton } = app.ui.copy;
    const g = app.files.gerber;

    const BASE = "files/";
    const GERBER_DIR = "hardware/fab/gerbers/";
    const BACKDROP = "#0b1220";
    const BOARD_FILL = "#1c1708";
    const BOARD_PAD = 14;
    const RATIO = 6;
    const TEXT_H = 520;
    const SPIN_SPEED = 0.006;
    const STL_COLOR = 0xffb224;
    const cache = new Map();

    const FILES = [
        { id: "board", name: "PCB (Gerbers)", kind: "board", note: "11 layers rendered from the real fab files", get: [["Gerbers + drill (zip)", "bundles/tandem-gerbers.zip"]] },
        { id: "tray", name: "Case tray", kind: "stl", path: "mechanical/case-tray.stl", note: "Print this one first" },
        { id: "lid", name: "Case lid", kind: "stl", path: "mechanical/case-lid.stl", note: "Snaps on the tray" },
        { id: "bom", name: "BOM", kind: "csv", path: "hardware/fab/bom.csv", note: "Parts list for assembly" },
        { id: "pos", name: "Placement", kind: "csv", path: "hardware/fab/pos.csv", note: "Pick-and-place positions in mm" },
        { id: "kicad", name: "KiCad board", kind: "text", path: "hardware/stick.kicad_pcb", note: "Open in KiCad 7 or newer", get: [["KiCad project (zip)", "bundles/tandem-kicad-project.zip"]] },
        { id: "gen", name: "Board generator", kind: "text", path: "hardware/build_board.py", note: "Python script that writes the KiCad board" },
        { id: "drc", name: "DRC runner", kind: "text", path: "hardware/drc.py", note: "Checks the board against fab rules" },
        { id: "fw", name: "Firmware", kind: "later", note: "Not written yet. It will appear here as a .bin you can flash." },
    ];

    const MANIFEST = "manifest.json";
    const BYTES_PER_ROW = 16;
    const HEX_LIMIT = 4096;
    const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
    const kindOf = (path) => (/\.stl$/i.test(path) ? "stl" : /\.(csv|tsv)$/i.test(path) ? "csv" : /\.zip$/i.test(path) ? "zip" : IMAGE_EXT.test(path) ? "image" : g.isGerber(path) ? "layer" : g.isDrill(path) ? "drill" : "text");
    const GROUPS = [["stl", "3D models"], ["layer", "PCB layers (Gerber)"], ["drill", "Drill files"], ["csv", "Tables"], ["zip", "Bundles"], ["image", "Images"], ["text", "Source and project files"]];
    const sizeText = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

    // Everything in the manifest becomes previewable, curated entries first.
    async function listFiles() {
        const { files } = JSON.parse(await load(MANIFEST));
        const known = new Set(FILES.map((file) => file.path).filter(Boolean));
        const extra = files.filter((file) => !known.has(file.path)).map((file) => ({ id: file.path, name: file.path.split("/").pop(), kind: kindOf(file.path), path: file.path, note: `${file.path} · ${sizeText(file.bytes)}`, extra: true }));
        return FILES.concat(extra);
    }

    async function load(path, binary) {
        const key = `${binary ? "b" : "t"}:${path}`;
        if (!cache.has(key)) {
            cache.set(key, fetch(BASE + path).then((res) => {
                if (!res.ok) throw new Error(`${res.status}`);
                return binary ? res.arrayBuffer() : res.text();
            }));
        }
        return cache.get(key);
    }

    const heading3 = (text) => label(text.toUpperCase(), { size: FONT.xs, weight: FONT.bold, tone: "muted" });
    const note = (text) => para(text, { size: FONT.sm, tone: "muted" });
    const frame = (...children) => {
        const box = el("div", { borderRadius: px(RADIUS.md), overflow: "hidden", borderWidth: "1px", borderStyle: "solid", boxSizing: "border-box" });
        themed(box, { borderColor: "line", background: "raised" });
        return add(box, children);
    };

    // ---- 3D (STL) ----
    function parseStl(buf) {
        const view = new DataView(buf);
        const count = view.getUint32(80, true);
        const positions = [];
        if (84 + count * 50 === buf.byteLength) {
            for (let tri = 0; tri < count; tri++) {
                for (let vert = 0; vert < 3; vert++) {
                    const at = 84 + tri * 50 + 12 + vert * 12;
                    positions.push(view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true));
                }
            }
        } else {
            for (const m of new TextDecoder().decode(buf).matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) positions.push(+m[1], +m[2], +m[3]);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();
        geometry.center();
        return geometry;
    }

    function stlView(buf) {
        const geometry = parseStl(buf);
        geometry.computeBoundingSphere();
        const radius = geometry.boundingSphere.radius;
        const width = Math.max(240, Math.round(app.state.state.viewport.w < 700 ? app.state.state.viewport.w - 2 * SPACE.lg : 340));
        const height = Math.round(width * 0.7);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.setClearColor(BACKDROP);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, radius * 20);
        camera.position.set(0, radius * 1.4, radius * 3.2);
        camera.lookAt(0, 0, 0);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.1));
        const sun = new THREE.DirectionalLight(0xffffff, 1.4);
        sun.position.set(radius, radius * 2, radius);
        scene.add(sun);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: STL_COLOR, roughness: 0.55, metalness: 0.05 }));
        mesh.rotation.x = -Math.PI / 2;
        const pivot = new THREE.Group();
        pivot.add(mesh);
        scene.add(pivot);
        let spinning = true, dragging = false, lastX = 0, lastY = 0, frameId = 0;
        const canvas = renderer.domElement;
        canvas.style.display = "block";
        canvas.style.touchAction = "none";
        canvas.style.cursor = "grab";
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        on(canvas, "pointerdown", (evt) => { dragging = true; spinning = false; lastX = evt.clientX; lastY = evt.clientY; canvas.setPointerCapture(evt.pointerId); });
        on(canvas, "pointermove", (evt) => {
            if (!dragging) return;
            pivot.rotation.y += (evt.clientX - lastX) * 0.01;
            pivot.rotation.x += (evt.clientY - lastY) * 0.01;
            lastX = evt.clientX; lastY = evt.clientY;
        });
        on(canvas, "pointerup", () => { dragging = false; });
        const tick = () => {
            if (spinning) pivot.rotation.y += SPIN_SPEED;
            renderer.render(scene, camera);
            frameId = requestAnimationFrame(tick);
        };
        tick();
        track(() => { cancelAnimationFrame(frameId); renderer.dispose(); geometry.dispose(); });
        const size = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
        const dims = size.getSize(new THREE.Vector3());
        return [frame(canvas), note(`${dims.x.toFixed(1)} × ${dims.y.toFixed(1)} × ${dims.z.toFixed(1)} mm · ${(geometry.attributes.position.count / 3).toLocaleString()} triangles · drag to rotate`)];
    }

    // ---- Board (Gerber) ----
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
        const width = Math.max(260, Math.round(app.state.state.viewport.w < 700 ? app.state.state.viewport.w - 2 * SPACE.lg : 340));
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

    // ---- CSV and text ----
    function csvRows(text) {
        return text.trim().split("\n").map((line) => [...line.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)].slice(0, -1).map((m) => m[2] !== undefined ? m[2] : m[1]));
    }

    const copyRow = (...buttons) => add(row(SPACE.sm), buttons);

    function csvView(text) {
        const [head, ...rows] = csvRows(text);
        return [copyRow(copyButton("Copy as CSV", () => text)), table({ head, rows, copy: false }), note(`${rows.length} rows. Copy pastes straight into a spreadsheet.`)];
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

    function hexView(buf) {
        const bytes = new Uint8Array(buf, 0, Math.min(buf.byteLength, HEX_LIMIT));
        const lines = [];
        for (let i = 0; i < bytes.length; i += BYTES_PER_ROW) {
            const chunk = [...bytes.slice(i, i + BYTES_PER_ROW)];
            const hex = chunk.map((byte) => byte.toString(16).padStart(2, "0")).join(" ").padEnd(BYTES_PER_ROW * 3 - 1);
            lines.push(`${i.toString(16).padStart(6, "0")}  ${hex}  ${chunk.map((byte) => (byte > 31 && byte < 127 ? String.fromCharCode(byte) : ".")).join("")}`);
        }
        return [...textView(lines.join("\n")), note(`Binary file: first ${bytes.length} bytes shown.`)];
    }

    function imageView(file) {
        const img = el("img", { display: "block", width: "100%", height: "auto" }, { alt: file.name, src: BASE + file.path });
        return [frame(zoomable(img, file.name))];
    }

    // One Gerber layer drawn over the board outline, with the raw file underneath.
    async function layerView(file) {
        const name = g.layerName(file.path);
        const [text, edgeText] = await Promise.all([load(file.path), load(`${GERBER_DIR}stick-Edge_Cuts.gm1`)]);
        const ops = g.parseGerber(text);
        const edge = g.parseGerber(edgeText);
        const box = g.bounds(edge);
        const width = Math.max(260, Math.round(app.state.state.viewport.w < 700 ? app.state.state.viewport.w - 2 * SPACE.lg : 340));
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
        return [frame(zoomable(canvas, `${name} layer`)), note(`${name.replace("_", " ")}: ${ops.length.toLocaleString()} drawing operations on a ${(box.x1 - box.x0).toFixed(1)} × ${(box.y1 - box.y0).toFixed(1)} mm board.`), heading3("Raw file"), ...textView(text)];
    }

    // Drill hits as a table: where each hole is and how big.
    async function drillView(file) {
        const holes = g.parseDrill(await load(file.path));
        const rows = holes.map(({ at, d }, idx) => [String(idx + 1), at[0].toFixed(2), at[1].toFixed(2), d.toFixed(2)]);
        const sizes = [...new Set(holes.map(({ d }) => d.toFixed(2)))].map((d) => `${holes.filter((hole) => hole.d.toFixed(2) === d).length} × ${d} mm`);
        return [note(`${holes.length} holes: ${sizes.join(", ") || "none"}. Positions in mm.`), table({ head: ["#", "X mm", "Y mm", "Diameter mm"], rows, numeric: [0, 1, 2, 3] })];
    }

    const RENDER = {
        layer: async (file) => layerView(file),
        drill: async (file) => drillView(file),
        zip: async (file) => zipView(await load(file.path, true)),
        image: async (file) => imageView(file),
        board: async () => boardView(await loadBoard()),
        stl: async (file) => stlView(await load(file.path, true)),
        csv: async (file) => csvView(await load(file.path)),
        text: async (file) => {
            const buf = await load(file.path, true);
            const sample = new Uint8Array(buf, 0, Math.min(buf.byteLength, 2048));
            return sample.includes(0) ? hexView(buf) : textView(new TextDecoder().decode(buf));
        },
        later: async (file) => [note(file.note)],
    };

    function preview(file) {
        const holder = stack(SPACE.sm);
        const view = region(holder);
        view.render(() => add(holder, note("Loading preview…")));
        RENDER[file.kind](file).then((nodes) => view.render(() => add(holder, nodes))).catch(() => {
            view.render(() => add(holder, note("Preview needs the published site (the files are added at build time). Use the download button instead.")));
        });
        return holder;
    }

    function fileView(file) {
        const links = [];
        const path = file.path || null;
        if (path) links.push(fileLink(path.split("/").pop(), BASE + path));
        (file.get || []).forEach(([text, href]) => links.push(fileLink(text, BASE + href)));
        return [
            add(row(SPACE.sm), label(file.name, { size: FONT.lg, weight: FONT.bold }), file.kind === "later" ? badge("coming later") : null),
            file.kind === "later" ? null : note(file.note),
            preview(file),
            add(stack(SPACE.xs), links),
        ];
    }

    const MORE_H = 200;

    function filesView() {
        const holder = stack(SPACE.md);
        const view = region(holder);
        listFiles().then((all) => view.render(() => {
            const file = all.find((item) => item.id === state.file) || all[0];
            const picker = row(SPACE.xs);
            all.filter((item) => !item.extra).forEach((item) => add(picker, button({ label: item.name, kind: "tab", pressed: item.id === file.id, onClick: () => setState({ file: item.id }) })));
            const extras = all.filter((item) => item.extra);
            const more = scroller(stack(SPACE.sm, { overflowY: "auto", height: px(MORE_H) }));
            GROUPS.forEach(([kind, title]) => {
                const items = extras.filter((item) => item.kind === kind);
                if (!items.length) return;
                const chips = row(SPACE.xs, { flexWrap: "wrap" });
                items.forEach((item) => add(chips, button({ label: item.name, kind: "tab", pressed: item.id === file.id, onClick: () => setState({ file: item.id }) })));
                add(more, add(stack(SPACE.xs), label(`${title.toUpperCase()} · ${items.length}`, { size: FONT.xs, weight: FONT.bold, tone: "muted" }), chips));
            });
            add(holder, picker, extras.length ? add(stack(SPACE.xs), label(`ALL FILES · ${extras.length} MORE`, { size: FONT.xs, weight: FONT.bold, tone: "accent" }), more) : null, ...fileView(file));
        })).catch(() => view.render(() => add(holder, note("The file list comes with the published site. Use the Downloads page."))));
        return [holder];
    }

    app.ex.files = { FILES, filesView };
})();
