// Files tab: every downloadable file with a live preview (3D for STL, a rendered board for Gerbers, tables for CSV, text for code).
(() => {
    const { el, add, on, track, region, themed } = app.dom;
    const { state, setState } = app.ex;
    const { SPACE, RADIUS, FONT, px } = app.styles;
    const { label, para } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row } = app.ui.layout;
    const { fileLink } = app.ui.download;
    const { table } = app.ui.table;
    const { badge } = app.ui.card;
    const g = app.files.gerber;

    const BASE = "files/";
    const GERBER_DIR = "hardware/fab/gerbers/";
    const BACKDROP = "#0b1220";
    const BOARD_FILL = "#14532d";
    const BOARD_PAD = 14;
    const CODE_LINES = 70;
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
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext("2d");
        const draw = () => {
            ctx.setTransform(2, 0, 0, 2, 0, 0);
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
        return [frame(canvas), chips, flip, note(`${(box.x1 - box.x0).toFixed(1)} × ${(box.y1 - box.y0).toFixed(1)} mm · 4 layers · ${data.holes.length} drilled holes`)];
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

    function csvView(text) {
        const [head, ...rows] = csvRows(text);
        return [table({ head, rows }), note(`${rows.length} rows`)];
    }

    function textView(text) {
        const lines = text.split("\n");
        const pre = el("pre", { margin: "0", padding: px(SPACE.md), overflow: "auto", maxHeight: "320px", fontFamily: FONT.mono, fontSize: px(FONT.xs), lineHeight: "1.5" });
        themed(pre, { color: "text" });
        pre.textContent = lines.slice(0, CODE_LINES).join("\n");
        return [frame(pre), note(lines.length > CODE_LINES ? `First ${CODE_LINES} of ${lines.length.toLocaleString()} lines. Download for the full file.` : `${lines.length} lines`)];
    }

    const RENDER = {
        board: async () => boardView(await loadBoard()),
        stl: async (file) => stlView(await load(file.path, true)),
        csv: async (file) => csvView(await load(file.path)),
        text: async (file) => textView(await load(file.path)),
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

    function filesView() {
        const picker = row(SPACE.xs);
        FILES.forEach((file) => add(picker, button({ label: file.name, kind: "tab", pressed: file.id === state.file, onClick: () => setState({ file: file.id }) })));
        const file = FILES.find((item) => item.id === state.file) || FILES[0];
        return [picker, ...fileView(file)];
    }

    app.ex.files = { FILES, filesView };
})();
