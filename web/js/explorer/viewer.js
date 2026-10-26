// The 3D viewport: renderer, lights, picking, highlights, glass toolbar and hover label.
(() => {
    const { el, add, on, paint, themed, track } = app.dom;
    const { state, setState, subscribe, onCommand, emit } = app.ex;
    const { FONT, RADIUS, SPACE, px } = app.styles;
    const { pal } = app.state;
    const { label } = app.ui.text;
    const { button } = app.ui.button;
    const { row } = app.ui.layout;
    const { findItem } = app.data;
    const { selectItem } = app.ex.actions;
    const { paintMaterials } = app.scene.materials;
    const { buildModel, focusY } = app.scene.model;
    const { createOrbit } = app.scene.orbit;

    const PRESETS = {
        front: { theta: 0, phi: 1.3, radius: 140 },
        rear: { theta: Math.PI, phi: 1.3, radius: 140 },
        top: { theta: 0, phi: 0.12, radius: 160 },
        iso: { theta: 0.65, phi: 1.0, radius: 150 },
        fleet: { theta: 0.5, phi: 0.95, radius: 290 },
    };
    const PRESET_LABELS = [["front", "Front"], ["rear", "Rear"], ["top", "Top"], ["iso", "Iso"]];
    const FACE_THETA = { front: 0, rear: Math.PI, side: Math.PI / 2 };
    const FOCUS_PORT = { phi: 1.25, radius: 38 };
    const FOCUS_CHIP = { theta: 0.45, phi: 0.85, radius: 42 };
    const FOCUS_PIECE = { theta: 0.6, phi: 0.95, radius: 85 };
    const FOCUS_PULL = 0.55;
    const FOV = 35;
    const PORTRAIT_FIT = 1.45;
    const EASE_RATE = 8;
    const LIGHT = { hemi: 0.6, key: 2.2, keyPos: [30, 70, 45], shadow: 4096, shadowRange: 140 };
    const GHOST_PICK_LIMIT = 0.3;
    const SPIN_GUARD_MS = 1500;
    const GLASS_ALPHA = "b8";
    const BLUR = "blur(10px)";
    const HINT = "Drag to orbit · scroll to zoom · shift-drag to pan · click a part · ? for shortcuts";

    function buildEnvironment(renderer) {
        const studio = new THREE.Scene();
        studio.background = new THREE.Color(0.16, 0.16, 0.18);
        const softbox = (w, h, pos, power) => {
            const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(power, power, power), side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            mesh.position.set(...pos);
            mesh.lookAt(0, 0, 0);
            studio.add(mesh);
        };
        softbox(10, 6, [0, 8, 6], 6);
        softbox(6, 10, [-9, 2, 0], 3);
        softbox(6, 10, [9, 2, -3], 2.5);
        softbox(14, 4, [0, -4, 8], 1.2);
        const pmrem = new THREE.PMREMGenerator(renderer);
        const texture = pmrem.fromScene(studio, 0.04).texture;
        return { texture, pmrem };
    }

    function buildLights(scene) {
        scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, LIGHT.hemi));
        const key = new THREE.DirectionalLight(0xffffff, LIGHT.key);
        key.position.set(...LIGHT.keyPos);
        key.castShadow = true;
        key.shadow.mapSize.set(LIGHT.shadow, LIGHT.shadow);
        const range = LIGHT.shadowRange;
        Object.assign(key.shadow.camera, { left: -range, right: range, top: range, bottom: -range, near: 1, far: 600 });
        key.shadow.bias = -0.0005;
        scene.add(key);
    }

    function buildGround(scene) {
        const mat = new THREE.ShadowMaterial();
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05;
        ground.receiveShadow = true;
        scene.add(ground);
        return mat;
    }

    function buildHelper() {
        const helper = new THREE.BoxHelper(undefined, "#ffffff");
        helper.material.depthTest = false;
        helper.material.transparent = true;
        helper.renderOrder = 10;
        helper.visible = false;
        return helper;
    }

    function buildTip(parent) {
        const box = el("div", {
            position: "absolute", left: "0px", top: "0px", pointerEvents: "none", display: "none", backdropFilter: BLUR,
            padding: `${px(SPACE.xs)} ${px(SPACE.sm)}`, borderRadius: px(RADIUS.sm), borderWidth: "1px",
            borderStyle: "solid", transform: "translate(-50%, -130%)", whiteSpace: "nowrap",
        });
        paint(box, (node, palette) => {
            node.style.background = `${palette.surface}${GLASS_ALPHA}`;
            node.style.borderColor = palette.line;
        });
        const title = label("", { size: FONT.sm, weight: FONT.bold });
        const sub = label("", { size: FONT.xs, tone: "muted" });
        sub.style.marginLeft = px(SPACE.sm);
        add(box, title, sub);
        add(parent, box);
        return {
            show(name, detail, x, y) {
                title.textContent = name;
                sub.textContent = detail;
                Object.assign(box.style, { display: "block", left: px(x), top: px(y) });
            },
            hide() { box.style.display = "none"; },
        };
    }

    const describe = (id) => {
        const item = findItem(id);
        return item ? [item.name, item.part || item.section] : [id, ""];
    };

    // The glass strip with view presets, spin and share.
    function buildToolbar(wrap, orbit) {
        const bar = row(SPACE.xs, {
            position: "absolute", left: px(SPACE.md), top: px(SPACE.md), padding: px(SPACE.xs), borderRadius: px(RADIUS.md),
            borderWidth: "1px", borderStyle: "solid", backdropFilter: BLUR,
        });
        paint(bar, (node, palette) => {
            node.style.background = `${palette.surface}${GLASS_ALPHA}`;
            node.style.borderColor = palette.line;
        });
        PRESET_LABELS.forEach(([name, text]) => add(bar, button({ label: text, onClick: () => emit("preset", name) })));
        const spin = button({ label: "Spin", kind: "tab", pressed: state.spin, ariaLabel: "Auto-rotate", onClick: () => setState({ spin: !state.spin }) });
        const share = button({ label: "Copy link", ariaLabel: "Copy a link to this view", onClick: () => emit("share", share) });
        add(bar, spin, share);
        subscribe((patch) => { if ("spin" in patch) { spin.setPressed(state.spin); orbit.setSpin(state.spin); } });
        const hint = label(HINT, { size: FONT.xs, tone: "muted" });
        Object.assign(hint.style, { position: "absolute", left: px(SPACE.md), bottom: px(SPACE.md), pointerEvents: "none" });
        add(wrap, bar, hint);
    }

    function createViewer(parent) {
        const wrap = el("div", { position: "relative", overflow: "hidden", borderRadius: px(RADIUS.md) });
        const canvas = el("canvas", { display: "block", touchAction: "none", outlineOffset: "-3px" }, {
            tabindex: "0", role: "img", "aria-label": "Interactive 3D model. Drag to rotate, scroll to zoom, arrow keys to orbit.",
        });
        add(wrap, canvas);
        add(parent, wrap);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        const scene = new THREE.Scene();
        const env = buildEnvironment(renderer);
        scene.environment = env.texture;
        const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 2000);
        buildLights(scene);
        const shadowMat = buildGround(scene);
        const model = buildModel();
        scene.add(model.root);
        const hoverHelper = buildHelper();
        const selectHelper = buildHelper();
        scene.add(hoverHelper, selectHelper);
        const tip = buildTip(wrap);

        const size = { w: 1, h: 1 };
        const live = { explode: state.explode, hover: null, fit: 1, first: true, running: true, last: 0 };
        const born = performance.now();
        // The tour's opening move must not cancel the default spin; any later move does.
        const stopSpin = () => { if (state.spin && performance.now() - born > SPIN_GUARD_MS) setState({ spin: false }); };
        const orbit = createOrbit(canvas, camera, { onTouch: stopSpin, onClick: (x, y) => handleClick(pick(x, y)) });

        const ray = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const tmpBox = new THREE.Box3();
        const tmpVec = new THREE.Vector3();

        function pick(clientX, clientY) {
            const rect = canvas.getBoundingClientRect();
            ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
            ray.setFromCamera(ndc, camera);
            const hits = ray.intersectObject(model.root, true);
            const hit = hits.find((item) => !(item.object.userData.ghost && live.explode > GHOST_PICK_LIMIT));
            let obj = hit ? hit.object : null;
            while (obj && obj.userData.id === undefined) obj = obj.parent;
            return obj ? obj.userData.id : null;
        }

        function handleClick(id) {
            if (id) selectItem(id);
            else setState({ selected: null });
        }

        function onHover(evt) {
            if (evt.buttons) return;
            const id = pick(evt.clientX, evt.clientY);
            if (id === live.hover) return;
            live.hover = id;
            canvas.style.cursor = id ? "pointer" : "grab";
        }

        function trackHelper(helper, id) {
            const obj = id ? model.byId.get(id) : null;
            helper.visible = !!obj;
            if (obj) helper.setFromObject(obj);
        }

        function updateLabel() {
            const id = live.hover || state.selected;
            const obj = id ? model.byId.get(id) : null;
            if (!obj || state.tab === "signal") return tip.hide();
            tmpBox.setFromObject(obj).getCenter(tmpVec).project(camera);
            const [name, detail] = describe(id);
            tip.show(name, detail, (tmpVec.x * 0.5 + 0.5) * size.w, (-tmpVec.y * 0.5 + 0.5) * size.h);
        }

        function frame(now) {
            if (!live.running) return;
            const dt = Math.min(0.05, (now - (live.last || now)) / 1000);
            live.last = now;
            live.explode += (state.explode - live.explode) * Math.min(1, dt * EASE_RATE);
            model.setExplode(live.explode);
            orbit.view.target.y = focusY(live.explode);
            orbit.update(now);
            model.update(now / 1000);
            trackHelper(hoverHelper, live.hover !== state.selected ? live.hover : null);
            trackHelper(selectHelper, state.selected);
            updateLabel();
            renderer.render(scene, camera);
            requestAnimationFrame(frame);
        }

        function focus(id) {
            const item = findItem(id);
            if (!item) return;
            stopSpin();
            const chip = item.type !== "port";
            const at = model.anchor(id, state.explode);
            const base = item.type === "piece" ? FOCUS_PIECE : chip ? FOCUS_CHIP : { ...FOCUS_PORT, theta: FACE_THETA[item.face] };
            orbit.flyTo({ ...base, radius: base.radius * live.fit, x: at.x * FOCUS_PULL, z: at.z * FOCUS_PULL });
        }

        function preset(name) {
            if (name !== "fleet") stopSpin();
            const cfg = PRESETS[name];
            orbit.flyTo({ ...cfg, radius: cfg.radius * live.fit, x: 0, z: name === "fleet" ? -30 : 0 });
        }

        function resize(w, h) {
            size.w = w;
            size.h = h;
            [wrap, canvas].forEach((node) => Object.assign(node.style, { width: px(w), height: px(h) }));
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            live.fit = Math.max(1, PORTRAIT_FIT / camera.aspect);
            if (live.first) {
                live.first = false;
                orbit.view.radius = PRESETS.iso.radius * live.fit;
            }
        }

        const flags = { keyboard: false, focus: false };
        const drawFocus = (node, palette) => { node.style.outline = flags.focus && flags.keyboard ? `2px solid ${palette.accent}` : "none"; };
        paint(canvas, drawFocus);
        on(window, "keydown", () => { flags.keyboard = true; });
        on(canvas, "pointerdown", () => { flags.keyboard = false; });
        on(canvas, "focus", () => { flags.focus = true; drawFocus(canvas, pal()); });
        on(canvas, "blur", () => { flags.focus = false; drawFocus(canvas, pal()); });
        on(canvas, "pointermove", onHover);
        on(canvas, "pointerleave", () => { live.hover = null; });

        paint(wrap, (node, palette) => {
            node.style.background = `radial-gradient(ellipse at 50% 38%, ${palette.raised} 0%, ${palette.bg} 78%)`;
            paintMaterials(palette.scene, palette.accent);
            shadowMat.opacity = palette.scene.shadow;
            hoverHelper.material.color.set(palette.muted);
            selectHelper.material.color.set(palette.accent);
            model.refresh();
        });
        subscribe((patch) => { if ("mode" in patch || "layers" in patch || "tab" in patch) model.refresh(); });
        let prevTab = state.tab;
        subscribe((patch) => {
            if (!("tab" in patch) || patch.tab === prevTab) return;
            const wasSignal = prevTab === "signal";
            prevTab = patch.tab;
            if (state.tab === "signal") emit("preset", "fleet");
            else if (wasSignal) emit("preset", "iso");
        });
        subscribe((patch) => { if ("isolate" in patch || "selected" in patch) { model.isolate(state.isolate ? state.selected : null); model.refresh(); } });
        onCommand("preset", preset);
        onCommand("focus", focus);
        buildToolbar(wrap, orbit);
        orbit.setSpin(state.spin);
        requestAnimationFrame(frame);
        track(() => {
            live.running = false;
            env.pmrem.dispose();
            renderer.dispose();
        });
        return { el: wrap, resize };
    }

    app.ex.createViewer = createViewer;
})();
