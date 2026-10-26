// The 3D viewport: renderer, lights, picking, highlights, preset buttons and hover label.
import * as THREE from "./three.js";
import { el, add, on, paint, themed } from "../dom.js";
import { state, setState, subscribe, onCommand, emit } from "../state.js";
import { FONT, RADIUS, SPACE, pal } from "../theme.js";
import { button, label, px, wrapRow } from "../widgets.js";
import { findItem } from "../data.js";
import { selectItem } from "../actions.js";
import { paintMaterials } from "./materials.js";
import { buildModel, focusY } from "./model.js";
import { createOrbit } from "./orbit.js";

const PRESETS = {
    front: { theta: 0, phi: 1.3, radius: 140 },
    rear: { theta: Math.PI, phi: 1.3, radius: 140 },
    top: { theta: 0, phi: 0.12, radius: 160 },
    iso: { theta: 0.65, phi: 1.0, radius: 150 },
};
const PRESET_LABELS = [["front", "Front"], ["rear", "Rear"], ["top", "Top"], ["iso", "Iso"]];
const FACE_THETA = { front: 0, rear: Math.PI, side: Math.PI / 2 };
const FOCUS_PORT = { phi: 1.25, radius: 38 };
const FOCUS_CHIP = { theta: 0.45, phi: 0.85, radius: 42 };
const FOCUS_PULL = 0.55;
const FOV = 35;
const PORTRAIT_FIT = 1.45;
const EASE_RATE = 8;
const LIGHT = { hemi: 0.6, key: 2.2, keyPos: [30, 70, 45], shadow: 4096, shadowRange: 80 };
const HOVER_COLOR = "#92929a";
const GHOST_PICK_LIMIT = 0.3;

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
    return pmrem.fromScene(studio, 0.04).texture;
}

function buildLights(scene) {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, LIGHT.hemi));
    const key = new THREE.DirectionalLight(0xffffff, LIGHT.key);
    key.position.set(...LIGHT.keyPos);
    key.castShadow = true;
    key.shadow.mapSize.set(LIGHT.shadow, LIGHT.shadow);
    Object.assign(key.shadow.camera, { left: -LIGHT.shadowRange, right: LIGHT.shadowRange, top: LIGHT.shadowRange, bottom: -LIGHT.shadowRange, near: 1, far: 600 });
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

function buildHelper(color) {
    const helper = new THREE.BoxHelper(undefined, color);
    helper.material.depthTest = false;
    helper.material.transparent = true;
    helper.renderOrder = 10;
    helper.visible = false;
    return helper;
}

function buildLabel(parent) {
    const box = el("div", {
        position: "absolute", left: "0px", top: "0px", pointerEvents: "none", display: "none",
        padding: `${px(SPACE.xs)} ${px(SPACE.sm)}`, borderRadius: px(RADIUS.sm), borderWidth: "1px",
        borderStyle: "solid", transform: "translate(-50%, -130%)", whiteSpace: "nowrap",
    });
    themed(box, { background: "surface", borderColor: "line" });
    const title = label("", { size: FONT.sm, weight: 600 });
    const sub = label("", { size: FONT.xs, tone: "muted" });
    add(box, title, sub);
    add(parent, box);
    return {
        show(name, detail, x, y) {
            title.textContent = name;
            sub.textContent = detail;
            box.style.display = "block";
            box.style.left = px(x);
            box.style.top = px(y);
        },
        hide() { box.style.display = "none"; },
    };
}

function describe(id) {
    const item = findItem(id);
    return item ? [item.name, item.part || item.section] : [id, ""];
}

export function createViewer(parent) {
    const wrap = el("div", { position: "absolute", overflow: "hidden" });
    const canvas = el("canvas", { display: "block", touchAction: "none", outlineOffset: "-3px" }, {
        tabindex: "0", role: "img", "aria-label": "Interactive 3D model. Drag to rotate, scroll to zoom, arrow keys to orbit.",
    });
    add(wrap, canvas);
    add(parent, wrap);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.environment = buildEnvironment(renderer);
    const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 2000);
    buildLights(scene);
    const shadowMat = buildGround(scene);
    const model = buildModel();
    scene.add(model.root);
    const hoverHelper = buildHelper(HOVER_COLOR);
    const selectHelper = buildHelper("#ffffff");
    scene.add(hoverHelper, selectHelper);
    const tip = buildLabel(wrap);

    const size = { w: 1, h: 1 };
    const live = { explode: state.explode, hover: null, fit: 1, first: true };
    const orbit = createOrbit(canvas, camera, { onClick: (x, y) => handleClick(pick(x, y)) });

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
        if (id) {
            selectItem(id);
        } else {
            setState({ selected: null });
        }
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
        if (!obj) return tip.hide();
        tmpBox.setFromObject(obj).getCenter(tmpVec).project(camera);
        const [name, detail] = describe(id);
        tip.show(name, detail, (tmpVec.x * 0.5 + 0.5) * size.w, (-tmpVec.y * 0.5 + 0.5) * size.h);
    }

    function frame(now) {
        const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
        frame.last = now;
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
        const chip = item.type === "chip";
        const at = model.anchor(id, state.explode);
        const base = chip ? FOCUS_CHIP : { ...FOCUS_PORT, theta: FACE_THETA[item.face] };
        orbit.flyTo({ ...base, radius: base.radius * live.fit, x: at.x * FOCUS_PULL, z: at.z * FOCUS_PULL });
    }

    function preset(name) {
        const cfg = PRESETS[name];
        orbit.flyTo({ ...cfg, radius: cfg.radius * live.fit, x: 0, z: 0 });
    }

    function resize(w, h) {
        size.w = w;
        size.h = h;
        wrap.style.width = px(w);
        wrap.style.height = px(h);
        canvas.style.width = px(w);
        canvas.style.height = px(h);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        live.fit = Math.max(1, PORTRAIT_FIT / camera.aspect);
        if (live.first) {
            live.first = false;
            orbit.view.radius = PRESETS.iso.radius * live.fit;
        }
    }

    function buildControls() {
        const bar = wrapRow(SPACE.xs, { position: "absolute", left: px(SPACE.md), top: px(SPACE.md) });
        PRESET_LABELS.forEach(([name, text]) => add(bar, button({ label: text, onClick: () => emit("preset", name) })));
        const spin = button({ label: "Spin", pressed: state.spin, ariaLabel: "Auto-rotate", onClick: () => setState({ spin: !state.spin }) });
        const share = button({ label: "Copy link", ariaLabel: "Copy a link to this view", onClick: () => emit("share", share) });
        add(bar, spin, share);
        subscribe((patch) => { if ("spin" in patch) { spin.setPressed(state.spin); orbit.setSpin(state.spin); } });
        const hint = label("Drag to orbit · scroll to zoom · shift-drag to pan · click a part · press ? for shortcuts", { size: FONT.xs, tone: "muted" });
        Object.assign(hint.style, { position: "absolute", left: px(SPACE.md), bottom: px(SPACE.md), pointerEvents: "none" });
        add(wrap, bar, hint);
    }

    // Keyboard-only focus ring on the canvas
    const flags = { keyboard: false, focus: false };
    const drawFocus = (p) => { canvas.style.outline = flags.focus && flags.keyboard ? `2px solid ${p.accent}` : "none"; };
    paint(canvas, drawFocus);
    on(window, "keydown", () => { flags.keyboard = true; });
    on(canvas, "pointerdown", () => { flags.keyboard = false; });
    on(canvas, "focus", () => { flags.focus = true; drawFocus(pal()); });
    on(canvas, "blur", () => { flags.focus = false; drawFocus(pal()); });
    on(canvas, "pointermove", onHover);
    on(canvas, "pointerleave", () => { live.hover = null; });

    paint(wrap, (p) => {
        scene.background = new THREE.Color(p.scene.bg);
        paintMaterials(p.scene, p.accent);
        shadowMat.opacity = p.scene.shadow;
        hoverHelper.material.color.set(p.muted);
        selectHelper.material.color.set(p.accent);
        model.refresh();
    });
    subscribe((patch) => { if ("mode" in patch || "layers" in patch || "tab" in patch) model.refresh(); });
    onCommand("preset", preset);
    onCommand("focus", focus);
    buildControls();
    requestAnimationFrame(frame);
    return { el: wrap, resize };
}
