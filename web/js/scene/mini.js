// A tiny 3D stage for simple explainer scenes made of plain boxes: one renderer, one scene shown at a time, no model needed.
(() => {
    const { el, add, track, loop } = app.dom;
    const { RADIUS, px } = app.styles;
    const FRAME_MS = 30;
    const COLOR = { stick: 0xffc43a, plug: 0xb8bcc4, board: 0x2f8f5b, tray: 0xf0a010, laptop: 0x5b6472, screen: 0x2d6cdf, led: 0x38e08c };

    const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...extra });
    function box(parent, w, h, d, color, x = 0, y = 0, z = 0) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
        mesh.position.set(x, y, z);
        parent.add(mesh);
        return mesh;
    }
    // A stick lying along x, plug toward +x.
    function stick(color = COLOR.stick) {
        const group = new THREE.Group();
        box(group, 8, 1.8, 3.6, color);
        box(group, 3.2, 0.8, 2.6, COLOR.plug, 5.4);
        const led = box(group, 0.9, 0.25, 0.9, 0x222222, -2.2, 1, 0);
        return { group, setLed: (color) => led.material.color.set(color) };
    }
    // Laptop facing +z; the port is on its right side.
    function laptop(color = COLOR.screen) {
        const group = new THREE.Group();
        box(group, 12, 0.6, 8, COLOR.laptop, 0, 0.3, 0);
        const lid = new THREE.Group();
        lid.position.set(0, 0.6, -4);
        lid.rotation.x = -0.25;
        const screen = box(lid, 12, 7, 0.4, color, 0, 3.5, 0);
        group.add(lid);
        return { group, screen, port: new THREE.Vector3(6, 1.4, 0) };
    }
    function monitor(color = COLOR.screen) {
        const group = new THREE.Group();
        box(group, 1.2, 3, 1.2, COLOR.laptop, 0, 1.5, 0);
        box(group, 5, 0.4, 3, COLOR.laptop, 0, 0.2, 0);
        const screen = box(group, 8, 5, 0.5, color, 0, 5.5, 0);
        return { group, screen, port: new THREE.Vector3(4.2, 1.4, 0.8) };
    }
    const ball = (parent, color = COLOR.led) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshBasicMaterial({ color })); m.visible = false; parent.add(m); return m; };

    // `scenes` maps a name to build() -> { group, update(t) }; t counts seconds since that scene was shown.
    function createMini(parent, { ratio = 0.7 } = {}) {
        const wrap = el("div", { position: "relative", width: "100%", overflow: "hidden", borderRadius: px(RADIUS.md), aspectRatio: String(1 / ratio) });
        const canvas = el("canvas", { display: "block", width: "100%", height: "100%" }, { role: "img", "aria-label": "Simple 3D animation" });
        add(wrap, canvas);
        add(parent, wrap);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.6));
        const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
        sun.position.set(10, 25, 20);
        scene.add(sun);
        const camera = new THREE.PerspectiveCamera(32, 1 / ratio, 1, 200);
        camera.position.set(0, 16, 46);
        camera.lookAt(0, 2.5, 0);
        const state = { active: null, start: 0, last: 0 };
        const resize = () => { const w = Math.max(1, wrap.clientWidth); const h = Math.max(1, wrap.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
        new ResizeObserver(resize).observe(wrap);
        resize();
        loop(canvas, (now) => {
            if (!state.active || now - state.last < FRAME_MS) return;
            state.last = now;
            state.active.update((now - state.start) / 1000);
            renderer.render(scene, camera);
        });
        track(() => renderer.dispose());
        return {
            wrap,
            show(build) {
                if (state.active) scene.remove(state.active.group);
                state.active = build();
                state.start = performance.now();
                scene.add(state.active.group);
            },
        };
    }

    app.scene.mini = { createMini, box, stick, laptop, monitor, ball, COLOR };
})();
