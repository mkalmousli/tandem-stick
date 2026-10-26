// A small live 3D view of the real model for pages and dialogs: whole or only some parts, spinning, draggable, or a one-off still.
(() => {
    const { el, add, track, loop, paint, createScope, withScope } = app.dom;
    const { RADIUS, px } = app.styles;
    const FOV = 30;
    const PORTRAIT_FIT = 1.45;
    const STILL = { w: 480, h: 320 };
    const within = (obj, ids) => { for (; obj; obj = obj.parent) if (ids.has(obj.userData.id)) return true; return false; };

    // opts: { ids: part ids to show (default all), explode 0..1, ratio height/width, spin rad/s, interactive, still, view {theta, phi, radius, y} }
    function mount(parent, opts = {}) {
        const { ids = null, explode = 0, toggle = false, ratio = 0.62, spin = 0.35, interactive = false, still = false, view = {} } = opts;
        const wrap = el("div", { position: "relative", width: "100%", overflow: "hidden", borderRadius: px(RADIUS.md), aspectRatio: String(1 / ratio) });
        const canvas = el("canvas", { display: "block", width: "100%", height: "100%", touchAction: interactive ? "none" : "auto" }, { role: "img", "aria-label": opts.label || "3D view of the Tandem Stick" });
        add(wrap, canvas);
        add(parent, wrap);
        const scope = createScope();
        track(() => scope.dispose());
        app.scene.glb.ensureModel().then(() => withScope(scope, () => run(wrap, canvas)));
        return wrap;

        function run() {
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: still });
            renderer.setPixelRatio(Math.min(devicePixelRatio || 1, app.scene.studio.MAX_RATIO));
            renderer.toneMapping = app.scene.studio.TONE.map;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            const scene = new THREE.Scene();
            const env = app.scene.studio.buildEnvironment(renderer);
            scene.environment = env.texture;
            app.scene.studio.buildLights(scene);
            const shadow = app.scene.studio.buildGround(scene);
            const model = app.scene.model.buildModel();
            model.quiet();
            model.setExplode(explode);
            if (ids) {
                const set = new Set(ids);
                model.root.traverse((obj) => { if (obj.isMesh) obj.visible = within(obj, set); });
            }
            scene.add(model.root);
            const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 2000);
            const orbit = app.scene.orbit.createOrbit(canvas, camera, interactive ? {} : { passive: true });
            Object.assign(orbit.view, { theta: 0.65, phi: 1.0, radius: 150, ...view });
            orbit.view.target.set(view.x ?? 0, view.y ?? app.scene.model.focusY(explode), view.z ?? 0);
            let base = orbit.view.radius;
            orbit.setSpin(!still && spin > 0);
            // Swap what is shown (and where the camera looks) without making a new view.
            wrap.setParts = (next, aim = {}) => {
                const set = next ? new Set(next) : null;
                model.root.traverse((obj) => { if (obj.isMesh) obj.visible = !set || within(obj, set); });
                const { theta, ...look } = aim;
                Object.assign(orbit.view, { phi: 1.0, radius: 150, ...look });
                orbit.view.target.set(aim.x ?? 0, aim.y ?? app.scene.model.focusY(explode), aim.z ?? 0);
                base = orbit.view.radius;
                resize();
            };
            const resize = () => {
                const w = Math.max(1, wrap.clientWidth || STILL.w);
                const h = Math.max(1, wrap.clientHeight || w * ratio);
                renderer.setSize(w, h, false);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                orbit.view.radius = base * Math.max(1, PORTRAIT_FIT / camera.aspect);
            };
            let amount = explode, goal = explode;
            const draw = () => {
                if (amount !== goal) { amount += Math.max(-0.04, Math.min(0.04, goal - amount)); model.setExplode(amount); orbit.view.target.y = app.scene.model.focusY(amount); }
                orbit.update(performance.now()); model.update(performance.now() / 1000); renderer.render(scene, camera);
            };
            if (toggle) {
                let down = null;
                canvas.style.cursor = "pointer";
                canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
                canvas.addEventListener("pointerup", (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) goal = goal ? 0 : 1; down = null; });
            }
            paint(wrap, (_, palette) => {
                app.scene.materials.paintMaterials(palette.scene, palette.accent);
                shadow.opacity = palette.scene.shadow;
                model.refresh();
                if (still) draw();
            });
            resize();
            new ResizeObserver(resize).observe(wrap);
            track(() => { env.pmrem.dispose(); renderer.dispose(); });
            if (still) return snapshot(draw, renderer);
            loop(canvas, draw);
        }

        // One frame, then keep only the picture so a grid of previews does not hold a WebGL context each.
        function snapshot(draw, renderer) {
            draw();
            const img = el("img", { display: "block", width: "100%", height: "100%", objectFit: "contain" }, { src: canvas.toDataURL("image/png"), alt: opts.label || "" });
            canvas.replaceWith(img);
            renderer.dispose();
            renderer.forceContextLoss();
        }
    }

    app.scene.showcase = { mount };
})();
