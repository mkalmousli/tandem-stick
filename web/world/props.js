// Things that live in the world: sticks, machines, landmarks, labels, portals.
import * as THREE from "../explorer/src/scene/three.js";

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .5, metalness: .25, ...o });
const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
export const ACCENT = 0x5b9bff, CYAN = 0x5df2d0;

let haloTex;
function halo() {
    if (!haloTex) {
        const c = document.createElement("canvas"); c.width = c.height = 64;
        const g = c.getContext("2d"), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(.3, "rgba(255,255,255,.35)"); grad.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
        haloTex = new THREE.CanvasTexture(c);
    }
    return haloTex;
}
export function glowSprite(color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(size);
    return s;
}

export function labelSprite(title, sub, color = "#ffffff") {
    const c = document.createElement("canvas"); c.width = 512; c.height = 160;
    const g = c.getContext("2d");
    g.textAlign = "center"; g.fillStyle = color; g.font = "700 54px Helvetica, Arial, sans-serif"; g.fillText(title, 256, 78);
    g.fillStyle = "#8fb4ff"; g.font = "28px Helvetica, Arial, sans-serif"; g.fillText(sub, 256, 124);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(12.8, 4, 1);
    return s;
}

// A stick at unit scale: body 7.2 × 1.8 × 4.0, plug on +x. `open` shows a glass lid over a lit board.
export function buildStick({ scale = 1, accent = ACCENT, led = true } = {}) {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.BoxGeometry(7.2, .9, 4), std(0x20263a, { metalness: .4 }));
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(6.6, .14, 3.5), std(0x0c1a2e, { emissive: 0x08203a, emissiveIntensity: .8 }));
    pcb.position.y = .52;
    const chip = new THREE.Mesh(new THREE.BoxGeometry(3.6, .45, 2.9), std(0x0a0a0c, { metalness: .8, roughness: .3 }));
    chip.position.set(.5, .82, 0);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(7.2, .9, 4), new THREE.MeshStandardMaterial({ color: accent, transparent: true, opacity: .22, roughness: .1, metalness: .3 }));
    lid.position.y = 1.15;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(lid.geometry), new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: .8 }));
    edges.position.copy(lid.position);
    const plug = new THREE.Mesh(new THREE.BoxGeometry(3.6, .9, 2.4), std(0xcfd8ee, { metalness: .9, roughness: .25 }));
    plug.position.set(5.4, .15, 0);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(3.7, .25, 1.6), std(0x11141c));
    slot.position.set(5.4, .3, 0);
    tray.position.y = 0;
    g.add(tray, pcb, chip, lid, edges, plug, slot);
    // meander antenna at the far end
    const pts = []; for (let i = 0; i < 9; i++) { pts.push(new THREE.Vector3(-3.1 + (i % 2) * .5, .62, -1.3 + i * .32), new THREE.Vector3(-3.1 + ((i + 1) % 2) * .5, .62, -1.3 + i * .32)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: CYAN })));
    let ledMat = null, ledHalo = null;
    if (led) {
        ledMat = glow(0xffffff);
        const l = new THREE.Mesh(new THREE.BoxGeometry(.5, .2, .5), ledMat); l.position.set(-1.6, .75, 1.3);
        ledHalo = glowSprite(accent, 3.2); ledHalo.position.set(-1.6, 1.1, 1.3);
        g.add(l, ledHalo);
    }
    g.scale.setScalar(scale);
    return { group: g, ledMat, ledHalo, lid };
}

function terminalCanvas(seed) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 160;
    return { c, g: c.getContext("2d"), tex: new THREE.CanvasTexture(c), lines: [], seed };
}
const WORDS = ["link ok", "key 0x1C", "ack #", "pair ✓", "rssi -52", "hid:kbd", "usb:cfg", "fleet 10", "ping 2ms", "frame ok"];
export function makeScreens(n = 4) {
    const screens = Array.from({ length: n }, (_, i) => terminalCanvas(i));
    let acc = 0;
    return {
        textures: screens.map((s) => s.tex),
        update(dt) {
            acc += dt; if (acc < .45) return; acc = 0;
            screens.forEach((s) => {
                s.lines.push(`$ ${WORDS[Math.floor(Math.random() * WORDS.length)]} ${Math.floor(Math.random() * 99)}`);
                if (s.lines.length > 9) s.lines.shift();
                const g = s.g; g.fillStyle = "#06101c"; g.fillRect(0, 0, 256, 160);
                g.fillStyle = "#0e2a4a"; g.fillRect(0, 0, 256, 14);
                g.font = "13px monospace"; g.fillStyle = "#7fe3ff";
                s.lines.forEach((l, i) => g.fillText(l, 8, 30 + i * 14));
                g.fillStyle = "#fff"; g.fillRect(8 + (s.lines.length ? g.measureText(s.lines.at(-1)).width : 0) + 4, 20 + s.lines.length * 14, 7, 11);
                s.tex.needsUpdate = true;
            });
        },
    };
}

export function buildLaptop(screenTex) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, .18, 2.8), std(0x2a3246, { metalness: .6 }));
    base.position.y = .09;
    const keys = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.5), new THREE.MeshBasicMaterial({ color: 0x14243c }));
    keys.rotation.x = -Math.PI / 2; keys.position.set(0, .2, .2);
    const hinge = new THREE.Group(); hinge.position.set(0, .18, -1.4); hinge.rotation.x = -.22;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, .12), std(0x2a3246, { metalness: .6 })); lid.position.y = 1.3;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.3), new THREE.MeshBasicMaterial({ map: screenTex })); screen.position.set(0, 1.3, .07);
    hinge.add(lid, screen);
    g.add(base, keys, hinge);
    return g;
}

export function buildTower() {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(2, 4.2, 2.4), std(0x1b2133, { metalness: .5 }));
    box.position.y = 2.1;
    const strip = glow(CYAN); const bar = new THREE.Mesh(new THREE.BoxGeometry(.12, 3, .05), strip); bar.position.set(.7, 2.2, 1.23);
    g.add(box, bar);
    return { group: g, strip };
}

// Landmarks -------------------------------------------------------------------------------------------------

export function portal(color) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, .14, 12, 48), glow(color)); ring.position.y = 3;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.5, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    disc.position.y = 3;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.2, .25, 32), std(0x141a2a)); base.position.y = .12;
    g.add(ring, disc, base, glowSprite(color, 9));
    g.children[3].position.y = 3;
    return { group: g, disc, ring };
}

export function buildPlanTower() {
    const g = new THREE.Group(), slabs = [];
    const phases = [0x4ade80, 0x4ade80, 0x5b9bff, 0x5b9bff, 0x5b9bff, 0x8b7bff, 0xc08bff];
    phases.forEach((col, i) => {
        const w = 11 - i * .9;
        const s = new THREE.Group(); s.position.y = 1 + i * 2.1;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, w), std(0x161d30, { metalness: .5 }));
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: col }));
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + .1, .18, w + .1), glow(col, .85)); stripe.position.y = -.5;
        s.add(body, edge, stripe); g.add(s); slabs.push(s);
    });
    const spire = new THREE.Mesh(new THREE.ConeGeometry(.5, 5, 8), glow(0xc08bff)); spire.position.y = 1 + 7 * 2.1 + 2.2;
    const beacon = glowSprite(0xc08bff, 8); beacon.position.y = spire.position.y + 2.6;
    g.add(spire, beacon);
    return { group: g, update: (t) => slabs.forEach((s, i) => { s.rotation.y = Math.sin(t * .3 + i * .5) * .12 + (i % 2 ? .08 : -.08) * t * .3; }), beacon, height: 18 };
}

export function buildLab() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 1.2, 8), std(0x161d30, { metalness: .5 })); base.position.y = .6;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: CYAN, transparent: true, opacity: .14, roughness: .1, side: THREE.DoubleSide })); dome.position.y = 1.2;
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(dome.geometry), new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: .35 })); wire.position.y = 1.2;
    const gyro = new THREE.Group(); gyro.position.y = 5;
    const rings = [0, 1, 2].map((i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(2.2 + i * .6, .09, 8, 48), glow(CYAN)); r.rotation.set(i * 1.0, i * .7, 0); gyro.add(r); return r; });
    gyro.add(glowSprite(CYAN, 6));
    const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(.4, 1, .4), glow(0x7fe3ff), 40), m = new THREE.Matrix4();
    bars.position.y = 1.3; g.add(base, dome, wire, gyro, bars);
    return { group: g, update(t) {
        rings.forEach((r, i) => { r.rotation.x += .01 * (i + 1); r.rotation.y += .008 * (3 - i); });
        for (let i = 0; i < 40; i++) {
            const a = (i / 40) * Math.PI * 2, h = .4 + (.5 + .5 * Math.sin(t * 3 + i * .5)) * 2.2;
            m.compose(new THREE.Vector3(Math.cos(a) * 6.8, h / 2, Math.sin(a) * 6.8), new THREE.Quaternion(), new THREE.Vector3(1, h, 1));
            bars.setMatrixAt(i, m);
        }
        bars.instanceMatrix.needsUpdate = true;
    } };
}

export function buildDock() {
    const g = new THREE.Group(), cols = [0x2f5de0, 0x1fa8c9, 0x6d4ae0, 0x223055];
    [[-6, 0, -2, 0], [-6, 2.6, -2, 1], [0, 0, -3, 2], [6, 0, -2, 3], [6, 2.6, -2, 0], [-1, 2.6, -3, 1]].forEach(([x, y, z, c]) => {
        const box = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 2.4), std(cols[c], { metalness: .4 })); box.position.set(x, y + 1.25, z);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25 })); e.position.copy(box.position);
        g.add(box, e);
    });
    const layers = new THREE.Group(); layers.position.set(0, 8, 4);
    ["#b87333", "#2d8a4e", "#2d8a4e", "#b87333"].forEach((c, i) => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(6.6, .16, 3.5), std(c, { emissive: c, emissiveIntensity: .25 })); l.position.y = i * .9 - 1.3; layers.add(l);
    });
    layers.add(glowSprite(0x5b9bff, 10));
    g.add(layers);
    return { group: g, update: (t) => { layers.rotation.y = t * .6; layers.position.y = 8 + Math.sin(t) * .4; layers.children.forEach((l, i) => { if (l.isMesh) l.position.y = (i - 1.5) * (.9 + .5 * (.5 + .5 * Math.sin(t * .8))); }); } };
}
