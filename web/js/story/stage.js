// The 3D stage for "How it works": a host laptop, a few target devices and the sticks between them.
// It only builds and poses objects; what happens when is decided in steps.js.
(() => {
    const { el, add, paint, track } = app.dom;
    const { FONT, SPACE, RADIUS, px } = app.styles;
    const { label } = app.ui.text;
    const { W, H, createScreen } = app.story.screens;

    const COLOR = {
        case: 0x3b4252, caseTop: 0x4c566a, pcb: 0x1f8a5b, chip: 0x15171b, metal: 0xc7ccd4, dark: 0x2b2f38, body: 0x2f3440, key: 0x59616f,
        led: { off: 0x30343c, white: 0xffffff, blue: 0x4aa3ff, green: 0x45e08a, red: 0xff5a5a, violet: 0xb48cff },
        radio: 0xffb224,
    };
    const STICK = { len: 4, h: 0.4, d: 1.8, plug: 1.5 };
    const TARGET_X = [0, 10.5, 21];
    const HOST_X = -15;
    const PLUG_TIP = STICK.len / 2 + STICK.plug - 0.3; // distance from a stick's centre to its plug tip
    const FOV = 35;
    const EASE = 3.2;
    const PORTRAIT_FIT = 1.7;
    const TAG_SHIFT = "translate(-50%, -120%)";

    const lambert = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, flatShading: true });
    function box(w, h, d, color, parent, x = 0, y = 0, z = 0) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (parent) parent.add(mesh);
        return mesh;
    }

    // A stick lying along x with its plug at +x. `lid` can be lifted to show the board.
    function buildStick() {
        const group = new THREE.Group();
        const body = new THREE.Group();
        box(STICK.len, STICK.h, STICK.d, COLOR.case, body);
        box(STICK.len - 0.4, 0.12, STICK.d - 0.3, COLOR.pcb, body, 0, STICK.h / 2 + 0.02, 0);
        box(1.5, 0.22, 1.2, COLOR.chip, body, -0.3, STICK.h / 2 + 0.17, 0);
        const lid = new THREE.Group();
        box(STICK.len, 0.3, STICK.d, COLOR.caseTop, lid);
        const ledMat = new THREE.MeshBasicMaterial({ color: COLOR.led.off });
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), ledMat);
        led.position.set(-1.3, 0.2, 0.4);
        lid.add(led);
        lid.position.y = STICK.h / 2 + 0.2;
        const plug = box(STICK.plug, 0.45, 1.25, COLOR.metal, body, STICK.len / 2 + STICK.plug / 2 - 0.3, 0, 0);
        plug.castShadow = false;
        group.add(body, lid);
        return { group, lid, setLed: (color) => ledMat.color.set(color), setLidLift: (amount) => { lid.position.y = STICK.h / 2 + 0.2 + amount; } };
    }

    // Laptop, monitor or kiosk. Returns the screen plane and the point where a stick's plug touches the case.
    function buildDevice(kind, screen) {
        const group = new THREE.Group();
        const tex = new THREE.CanvasTexture(screen.canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        const face = new THREE.Mesh(new THREE.PlaneGeometry(1, H / W), new THREE.MeshBasicMaterial({ map: tex }));
        let width = 6.4;
        let portY = 0.4;
        if (kind === "laptop") {
            box(width, 0.3, 4.2, COLOR.body, group, 0, 0.15, 0);
            box(width - 1, 0.04, 2.2, COLOR.key, group, 0, 0.32, 0.6);
            const lid = new THREE.Group();
            box(width, 4.2, 0.2, COLOR.dark, lid, 0, 2.1, 0);
            lid.add(face);
            face.scale.set(width - 0.5, width - 0.5, 1);
            face.position.set(0, 2.15, 0.11);
            lid.position.set(0, 0.3, -2.0);
            lid.rotation.x = -0.12;
            group.add(lid);
        } else {
            width = kind === "kiosk" ? 4.6 : 7.2;
            const height = width * (H / W) + 0.5;
            const baseY = kind === "kiosk" ? 2.6 : 1.4;
            box(width, height, 0.25, COLOR.dark, group, 0, baseY + height / 2, 0);
            face.scale.set(width - 0.4, width - 0.4, 1);
            face.position.set(0, baseY + height / 2, 0.14);
            group.add(face);
            box(0.4, baseY, 0.4, COLOR.body, group, 0, baseY / 2, -0.1);
            box(2.6, 0.12, 1.6, COLOR.body, group, 0, 0.06, -0.1);
            portY = baseY + 0.7;
        }
        face.material.toneMapped = false;
        const port = new THREE.Vector3(-width / 2, portY, 0);
        return { group, tex, port, width };
    }

    function buildTargetSlot(idx, scenario) {
        const screen = createScreen();
        const device = buildDevice(scenario.device, screen);
        device.group.position.set(TARGET_X[idx], 0, 0);
        const stick = buildStick();
        return { idx, screen, device, stick, name: scenario.targets[idx], model: null };
    }

    function buildLink(group) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: COLOR.radio, transparent: true, opacity: 0.35 }));
        group.add(mesh);
        return mesh;
    }

    function buildPulse(group) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), new THREE.MeshBasicMaterial({ color: COLOR.radio }));
        mesh.visible = false;
        group.add(mesh);
        return mesh;
    }

    function buildRing(group) {
        const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 6, 40), new THREE.MeshBasicMaterial({ color: COLOR.radio, transparent: true }));
        mesh.rotation.x = Math.PI / 2;
        mesh.visible = false;
        group.add(mesh);
        return mesh;
    }

    // HTML tags that follow 3D points, so labels stay crisp and readable.
    function createTags(parent) {
        const list = [];
        return {
            add(text, getPoint) {
                const node = el("div", {
                    position: "absolute", left: "0px", top: "0px", pointerEvents: "none", display: "none", transform: TAG_SHIFT, whiteSpace: "nowrap",
                    padding: `${px(SPACE.xs)} ${px(SPACE.sm)}`, borderRadius: px(RADIUS.sm), borderWidth: "1px", borderStyle: "solid",
                });
                paint(node, (target, palette) => {
                    target.style.background = `${palette.surface}e0`;
                    target.style.borderColor = palette.line;
                    target.style.color = palette.text;
                });
                node.style.fontFamily = FONT.sans;
                node.style.fontSize = px(FONT.sm);
                node.textContent = text;
                add(parent, node);
                const tag = { node, getPoint, on: false, set text(value) { node.textContent = value; } };
                list.push(tag);
                return tag;
            },
            update(camera, w, h) {
                const point = new THREE.Vector3();
                list.forEach((tag) => {
                    tag.node.style.display = tag.on ? "block" : "none";
                    if (!tag.on) return;
                    tag.getPoint(point).project(camera);
                    Object.assign(tag.node.style, { left: px((point.x * 0.5 + 0.5) * w), top: px((-point.y * 0.5 + 0.5) * h) });
                });
            },
            hideAll() { list.forEach((tag) => { tag.on = false; }); },
        };
    }

    function createStage(parent, scenario) {
        const wrap = el("div", { position: "relative", overflow: "hidden", borderRadius: px(RADIUS.md) });
        paint(wrap, (node, palette) => { node.style.background = `radial-gradient(ellipse at 50% 35%, ${palette.raised} 0%, ${palette.bg} 80%)`; });
        const canvas = el("canvas", { display: "block", touchAction: "pan-y" });
        add(wrap, canvas);
        add(parent, wrap);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, app.scene.studio.MAX_RATIO));
        renderer.setClearColor(0x000000, 0);
        renderer.shadowMap.enabled = true;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 400);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x555566, 1.1));
        const sun = new THREE.DirectionalLight(0xffffff, 2.2);
        sun.position.set(10, 30, 25);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 30, bottom: -30, near: 1, far: 120 });
        scene.add(sun);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.25 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        const world = new THREE.Group();
        scene.add(world);
        const hero = buildStick();
        const host = { screen: createScreen(), stick: buildStick(), blank: buildStick() };
        host.device = buildDevice("laptop", host.screen);
        host.device.group.position.set(HOST_X, 0, 0);
        const targets = scenario.targets.map((_, idx) => buildTargetSlot(idx, scenario));
        world.add(hero.group, host.device.group, host.stick.group, host.blank.group);
        targets.forEach((slot) => world.add(slot.device.group, slot.stick.group));
        const links = targets.map(() => buildLink(world));
        const pulses = targets.map(() => buildPulse(world));
        const rings = [buildRing(world), buildRing(world)];

        const tags = createTags(wrap);
        const size = { w: 1, h: 1, fit: 1 };
        const cam = { pos: new THREE.Vector3(0, 6, 14), look: new THREE.Vector3(), goalPos: new THREE.Vector3(), goalLook: new THREE.Vector3(), from: new THREE.Vector3() };

        // Camera config is given for a 16:10 stage; narrow stages pull back along the view direction.
        function setCamera(cfg, instant) {
            cam.goalLook.set(...cfg.look);
            cam.from.set(...cfg.pos).sub(cam.goalLook).multiplyScalar(size.fit);
            cam.goalPos.copy(cam.goalLook).add(cam.from);
            if (instant) { cam.pos.copy(cam.goalPos); cam.look.copy(cam.goalLook); }
        }

        function resize(w, h) {
            Object.assign(size, { w, h });
            size.fit = Math.max(1, PORTRAIT_FIT / (w / h));
            [wrap, canvas].forEach((node) => Object.assign(node.style, { width: px(w), height: px(h) }));
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }

        const tmp = new THREE.Vector3();
        function render(dt) {
            const k = Math.min(1, dt * EASE);
            cam.pos.lerp(cam.goalPos, k);
            cam.look.lerp(cam.goalLook, k);
            camera.position.copy(cam.pos);
            camera.lookAt(cam.look);
            targets.concat([host]).forEach((slot) => { slot.device.tex.needsUpdate = true; });
            renderer.render(scene, camera);
            tags.update(camera, size.w, size.h);
        }

        const portWorld = (device) => device.group.position.clone().add(device.port);
        track(() => { renderer.dispose(); });
        return { el: wrap, canvas, hero, host, targets, links, pulses, rings, tags, world, setCamera, resize, render, portWorld, tmp };
    }

    app.story.stage = { createStage, COLOR, STICK, PLUG_TIP, HOST_X, TARGET_X };
})();
