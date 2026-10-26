// Step-by-step 3D explanation of Tandem Stick. Every step is a pure function of (step, t), so it can be scrubbed.
import * as THREE from "../explorer/src/scene/three.js";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (t, a, b) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
const lin = (t, a, b) => clamp01((t - a) / (b - a));
const C = { silver: 0xc0c0c0, dark: 0x404050, case: 0x3050b0, pcb: 0x00a050, chip: 0x181818, off: 0x303030, red: 0xff3030, blue: 0x3090ff, green: 0x30ff60, gold: 0xffcc00, white: 0xffffff, cyan: 0x30ffff, violet: 0xcc66ff };
const SC = .6, PORT_DX = -4.63;
const hex2 = (n) => ((n * 73 + 41) & 255).toString(16).toUpperCase().padStart(2, "0");

function mk(w, h, d, color, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color, flatShading: true }));
    m.position.set(x, y, z); parent?.add(m); return m;
}

function buildStick() {
    const g = new THREE.Group(), lid = new THREE.Group();
    mk(4, .35, 1.8, C.case, g, 0, 0, 0);
    mk(3.6, .1, 1.6, C.pcb, g, 0, .22, 0);
    mk(1.4, .2, 1.2, C.chip, g, .4, .37, 0);
    const ant = new THREE.Line(new THREE.BufferGeometry().setFromPoints([...Array(7)].map((_, i) => new THREE.Vector3(-1.7 + (i % 2) * .4, .3, -.7 + i * .23))), new THREE.LineBasicMaterial({ color: C.gold }));
    g.add(ant);
    mk(1.8, .4, 1.2, C.silver, g, 2.9, .02, 0);
    mk(1.7, .12, .7, C.dark, g, 2.95, .1, 0);
    mk(4, .3, 1.8, C.case, lid, 0, 0, 0);
    const led = mk(.4, .12, .4, C.off, lid, -1.4, .2, .5); led.material = new THREE.MeshBasicMaterial({ color: C.off });
    lid.position.y = .5; g.add(lid);
    return { g, lid, led, setLed: (c) => led.material.color.set(c) };
}

function makeScreen() {
    const c = document.createElement("canvas"); c.width = 160; c.height = 100;
    const tex = new THREE.CanvasTexture(c); tex.magFilter = tex.minFilter = THREE.NearestFilter;
    return { c, tex, key: "", g: c.getContext("2d") };
}
function drawScreen(s, title, lines, blink) {
    const key = title + lines.join("|") + blink; if (key === s.key) return; s.key = key;
    const g = s.g; g.fillStyle = "#000"; g.fillRect(0, 0, 160, 100);
    g.fillStyle = "#000080"; g.fillRect(0, 0, 160, 11); g.fillStyle = "#fff"; g.font = "bold 9px monospace"; g.fillText(title, 3, 9);
    g.font = "9px monospace"; g.fillStyle = "#55ff55";
    lines.slice(-8).forEach((l, i) => g.fillText(l, 3, 22 + i * 10));
    if (blink) { g.fillStyle = "#55ff55"; g.fillRect(3 + (lines.length ? g.measureText(lines.at(-1)).width : 0) + 1, 14 + Math.min(lines.length, 8) * 10, 5, 8); }
    s.tex.needsUpdate = true;
}

function buildLaptop(x, z, name) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    mk(5, .25, 3.6, C.silver, g, 0, .125, 0); mk(4.2, .05, 2, C.dark, g, 0, .27, .4);
    const hinge = new THREE.Group(); hinge.position.set(0, .25, -1.7); hinge.rotation.x = -.2; g.add(hinge);
    mk(5, 3.4, .15, C.silver, hinge, 0, 1.7, 0);
    const screen = makeScreen();
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.8), new THREE.MeshBasicMaterial({ map: screen.tex })); sm.position.set(0, 1.75, .09); hinge.add(sm);
    mk(.4, .12, .8, 0x101010, g, -2.5, .2, 0);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.8), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .25 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .02; g.add(shadow);
    return { g, x, z, name, screen, port: new THREE.Vector3(x + PORT_DX, .45, z) };
}

export function start() {
    const cv = document.getElementById("cv"), view = cv.parentElement, tagsEl = document.getElementById("tags");
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
    renderer.setPixelRatio(1);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x008080);
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 300);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x606080, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-8, 20, 14); scene.add(sun);

    const fc = document.createElement("canvas"); fc.width = fc.height = 2; const fg = fc.getContext("2d");
    fg.fillStyle = "#b8b8b8"; fg.fillRect(0, 0, 2, 2); fg.fillStyle = "#909090"; fg.fillRect(0, 0, 1, 1); fg.fillRect(1, 1, 1, 1);
    const ft = new THREE.CanvasTexture(fc); ft.magFilter = ft.minFilter = THREE.NearestFilter; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(80, 80);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ map: ft })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.01; scene.add(floor);

    const H = buildLaptop(-15, 0, "HOST"), A = buildLaptop(0, 0, "TARGET A"), B = buildLaptop(12, -2, "TARGET B"), D = buildLaptop(24, -4, "TARGET C");
    const laps = [H, A, B, D], targets = [A, B, D];
    laps.forEach((l) => scene.add(l.g));
    const HS = buildStick(), SA = buildStick(), SB = buildStick(), SD = buildStick(), sticks = [HS, SA, SB, SD];
    sticks.forEach((s) => scene.add(s.g));
    const links = [0, 1, 2].map(() => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([...Array(17)].map(() => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: C.cyan })); scene.add(l); return l; });
    const pk = [...Array(24)].map(() => { const m = mk(.45, .45, .45, C.gold, scene); m.material = new THREE.MeshBasicMaterial({ color: C.gold }); return m; });
    const rg = [...Array(10)].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 28), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; scene.add(m); return m; });
    const sel = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.9, 4), new THREE.MeshBasicMaterial({ color: 0xffff55, side: THREE.DoubleSide })); sel.rotation.x = -Math.PI / 2; sel.position.y = .05; scene.add(sel);

    // per-frame drawing helpers -------------------------------------------------------------------------
    let pi = 0, ri = 0, li = 0, tagUsed = new Set(); const tagEls = new Map(), v3 = new THREE.Vector3(), tagPending = [];
    const plugAt = (l, away = 0) => new THREE.Vector3(l.port.x + PORT_DX + 3.6 * 0 - away, .45, l.port.z).setX(l.x + PORT_DX - away);
    const radio = (s) => s.g.position.clone().add(new THREE.Vector3(0, 1, 0));
    const packet = (a, b, k, color = C.gold, h = 2.8) => { if (pi >= pk.length || k <= 0 || k >= 1) return null; const m = pk[pi++]; m.visible = true; m.position.lerpVectors(a, b, k); m.position.y += Math.sin(Math.PI * k) * h; m.material.color.set(color); m.rotation.y = k * 9; return m; };
    const ring = (pos, k, color = C.cyan, max = 9) => { if (ri >= rg.length || k <= 0 || k >= 1) return; const m = rg[ri++]; m.visible = true; m.position.copy(pos); m.scale.setScalar(.5 + k * max); m.material.opacity = 1 - k; m.material.color.set(color); };
    const link = (a, b, color = C.cyan, h = 4) => { if (li >= links.length) return; const l = links[li++]; l.visible = true; l.material.color.set(color); const p = l.geometry.attributes.position; for (let i = 0; i <= 16; i++) { const k = i / 16; v3.lerpVectors(a, b, k); v3.y += Math.sin(Math.PI * k) * h; p.setXYZ(i, v3.x, v3.y, v3.z); } p.needsUpdate = true; };
    const tag = (id, pos, text) => tagPending.push([id, pos.clone(), text]);

    // steps -----------------------------------------------------------------------------------------------
    const idle = (l, extra = []) => [`${l.name} ready`, ...extra];
    const hostLines = (t, list) => list.filter(([at]) => t >= at).map(([, s]) => s);
    const STEPS = [
        { title: "Meet the stick", dur: 14, cam: [[0, 2.6, 9], [0, 1.2, 0]], desc: "No buttons, no screen. Just a USB plug, a radio chip, an antenna and one light.",
          say: [[0, "This is a *Tandem Stick*. It has no buttons and no screen."], [3.6, "Lift the lid: an *ESP32-S3* chip holds the radio and the USB logic."], [7, "The *antenna* is a trace on the board. It talks to other sticks."], [10.5, "One *RGB light* shows what the stick is doing."]],
          fn(t) {
              laps.forEach((l) => { l.g.visible = false; });
              const g = HS.g; g.visible = true; g.scale.setScalar(1.7); g.position.set(0, 1.6, 0); g.rotation.y = -.5 + t * .22;
              HS.lid.position.y = .5 + seg(t, 3, 5.2) * 1.9 - seg(t, 12.5, 14, 0) * 0;
              HS.setLed([C.red, C.blue, C.green, C.white][Math.floor(t / 2.2) % 4]);
              const w = (v) => HS.g.localToWorld(v);
              if (t > 3.8) tag("chip", w(new THREE.Vector3(.4, .6, 0)), "ESP32-S3 chip");
              if (t > 7) tag("ant", w(new THREE.Vector3(-1.7, .5, 0)), "Antenna trace");
              if (t > 10.5) tag("led", w(new THREE.Vector3(-1.4, 2.7, .5)), "Status light");
              tag("plug", w(new THREE.Vector3(3.6, .3, 0)), "USB-A plug");
          } },
        { title: "Plug in your own computer", dur: 12, cam: [[-13, 6, 13], [-11, 1.2, 0]], desc: "The host stick enumerates as a plain USB keyboard, so no driver is needed.",
          say: [[0, "Plug the first stick into *your* computer. This one becomes the *host*."], [4.6, "The computer sees a standard *USB keyboard*. No driver to install."], [8, "The light goes green: the host is ready."]],
          fn(t) {
              const k = seg(t, 1, 4.2), p = plugAt(H, (1 - k) * 8); p.y += (1 - k) * 2; HS.g.visible = true; HS.g.scale.setScalar(SC); HS.g.position.copy(p);
              HS.setLed(t < 4.4 ? C.off : t < 6 ? C.white : C.green);
              if (t > 4.4) ring(radio(HS), lin(t, 4.4, 5.6), C.white, 3);
              H.lines = hostLines(t, [[4.4, "USB: new device"], [5.4, "HID keyboard: Tandem"], [6.6, "driver: built in"], [7.6, "stick ready"]]);
          } },
        { title: "Pair a blank stick (once)", dur: 15, cam: [[-8, 7, 14], [-8, 1, 1]], desc: "The host hands a blank stick the fleet key. This happens once, near the host.",
          say: [[0, "A *blank* stick has no key yet, so its light is red."], [3.5, "Bring it near the host. The host stick *sends the fleet key* by radio."], [8, "Key stored. The light turns blue: this stick now belongs to the fleet."]],
          fn(t) {
              HS.g.visible = SA.g.visible = true; HS.g.scale.setScalar(SC); SA.g.scale.setScalar(SC); HS.g.position.copy(plugAt(H)); HS.setLed(C.green);
              SA.g.position.set(-8, 1 + Math.sin(t * 2) * .15, 5.5); SA.g.rotation.y = Math.PI * .1;
              SA.setLed(t < 8 ? C.red : C.blue);
              const hp = radio(HS), ap = radio(SA);
              if (t > 3.5 && t < 8) { ring(hp, lin((t - 3.5) % 1.6, 0, 1.6), C.cyan, 12); const k = lin(t, 4.6, 7.8); packet(hp, ap, k, C.gold); if (k > 0 && k < 1) tag("key", hp.clone().lerp(ap, k).add(new THREE.Vector3(0, 3.2, 0)), "fleet key"); }
              if (t > 7.8) ring(ap, lin(t, 7.8, 9.2), C.blue, 5);
              H.lines = hostLines(t, [[0, "stick ready"], [4, "pairing blank stick"], [7.9, "paired: 1 stick"]]);
          } },
        { title: "Plug into any target", dur: 16, cam: [[-6, 8, 15], [-6, 1, 0]], desc: "On any computer it joins the fleet by itself. No setup, no software.",
          say: [[0, "Take the paired stick to *any* computer and plug it in."], [4.8, "That computer sees a *USB keyboard*. Nothing to install."], [8, "The stick *calls the host* by radio..."], [11, "...the host answers, and the two *link up*."]],
          fn(t) {
              HS.g.visible = SA.g.visible = true; HS.g.scale.setScalar(SC); SA.g.scale.setScalar(SC); HS.g.position.copy(plugAt(H)); HS.setLed(C.green);
              const k = seg(t, 1, 4.6), from = new THREE.Vector3(-8, 1, 5.5), to = plugAt(A);
              SA.g.position.lerpVectors(from, to, k); SA.g.position.y += Math.sin(Math.PI * k) * 3.5; SA.g.rotation.y = (1 - k) * Math.PI * .1;
              const linked = t > 12, up = t > 4.8;
              SA.setLed(!up ? C.blue : linked ? C.green : t > 7.5 ? C.cyan : C.white);
              A.lines = hostLines(t, [[4.8, "USB: new device"], [5.8, "HID keyboard: Tandem"], [6.8, "stick ready"]]);
              const hp = radio(HS), ap = radio(SA);
              if (t > 8 && t < 12) { ring(ap, lin((t - 8) % 1.5, 0, 1.5), C.cyan, 10); packet(ap, hp, lin(t, 8.4, 10.4), C.cyan, 3.5); packet(hp, ap, lin(t, 10.4, 12), C.gold, 3.5); }
              if (linked) link(hp, ap, C.cyan, 3.6);
              H.lines = hostLines(t, [[0, "stick ready"], [10.4, "stick 1 online"]]);
          } },
        { title: "Type once, it appears there", dur: 17, cam: [[-7.5, 6, 16], [-7.5, 1.6, 0]], desc: "Each key press is encrypted, sent by radio, and replayed on the target as a real USB key press.",
          say: [[0, "Now type on the *host*. The stick reads the key..."], [4, "...*encrypts* it, and sends the packet by radio."], [8, "The target stick *decrypts* it and acts as a USB keyboard."], [12, "The target computer just sees someone typing."]],
          fn(t) {
              const word = "HELLO WORLD", T0 = 1.4, GAP = .95, FLY = .85;
              HS.g.visible = SA.g.visible = true; HS.g.scale.setScalar(SC); SA.g.scale.setScalar(SC); HS.g.position.copy(plugAt(H)); SA.g.position.copy(plugAt(A));
              const hp = radio(HS), ap = radio(SA); link(hp, ap, C.cyan, 3.6);
              let sent = 0, got = 0, flash = 0;
              for (let c = 0; c < word.length; c++) { const tc = T0 + c * GAP; if (t >= tc) sent = c + 1; if (t >= tc + FLY) { got = c + 1; if (t < tc + FLY + .3) flash = 1; } const k = lin(t, tc, tc + FLY); if (k > 0 && k < 1) { packet(hp, ap, k, C.gold, 3.2); tag("pk", hp.clone().lerp(ap, k).add(new THREE.Vector3(0, 3.8, 0)), `0x${hex2(c)}${hex2(c + 9)} (encrypted)`); } }
              HS.setLed(sent > got ? C.gold : C.green); SA.setLed(flash ? C.white : C.green);
              H.lines = ["> type here", "> " + word.slice(0, sent)]; A.lines = ["C:\\> notepad", "> " + word.slice(0, got)];
          } },
        { title: "Many machines, one host", dur: 18, cam: [[5, 11, 27], [5, 1.5, -2]], desc: "One stick per target. The host picks which one receives your keys.",
          say: [[0, "Put a stick in *every* machine you want to control."], [4, "The host sends to *one at a time*. Here it is machine A..."], [8.5, "...now *B*. A hotkey on the host switches targets."], [13, "...now *C*. About twenty targets fit on one host."]],
          fn(t) {
              sticks.forEach((s) => { s.g.visible = true; s.g.scale.setScalar(SC); s.setLed(C.green); });
              HS.g.position.copy(plugAt(H)); SA.g.position.copy(plugAt(A)); SB.g.position.copy(plugAt(B)); SD.g.position.copy(plugAt(D));
              const idx = t < 8 ? 0 : t < 12.5 ? 1 : 2, tl = targets[idx], ts = [SA, SB, SD];
              const hp = radio(HS); targets.forEach((l, i) => link(hp, radio(ts[i]), i === idx ? 0xffff55 : 0x507070, 4 + i * .8));
              sel.visible = true; sel.position.set(tl.x, .05, tl.z); sel.rotation.z = t * .8;
              ts[idx].setLed(C.white);
              const k = ((t * .9) % 1); packet(hp, radio(ts[idx]), k, C.gold, 4);
              H.lines = ["hotkey: next target", `> sending to ${tl.name}`]; targets.forEach((l, i) => { l.lines = i === idx ? ["keys received", "> typing..."] : ["idle"]; });
              tag("host", radio(HS).add(new THREE.Vector3(0, 2.4, 0)), "HOST");
              ts.forEach((s, i) => tag("t" + i, radio(s).add(new THREE.Vector3(0, 2.4, 0)), targets[i].name));
          } },
        { title: "Updates over the air", dur: 16, cam: [[5, 11, 27], [5, 1.5, -2]], desc: "New firmware is pushed from the host to every stick by radio. No one needs to unplug anything.",
          say: [[0, "Firmware lives in the sticks, and they can be *updated by radio*."], [3.5, "The host sends the new image in *small blocks* to every stick."], [10, "Each stick checks the *signature* and reboots into the new version."], [13, "All green: the whole fleet is on the new firmware."]],
          fn(t) {
              sticks.forEach((s) => { s.g.visible = true; s.g.scale.setScalar(SC); });
              HS.g.position.copy(plugAt(H)); SA.g.position.copy(plugAt(A)); SB.g.position.copy(plugAt(B)); SD.g.position.copy(plugAt(D));
              const ts = [SA, SB, SD], hp = radio(HS), p = lin(t, 3, 11), done = t > 12, check = t > 11;
              HS.setLed(done ? C.green : C.violet);
              ts.forEach((s, i) => {
                  s.setLed(done ? C.green : check ? C.white : (Math.floor(t * 6 + i) % 2 ? C.violet : C.off)); link(hp, radio(s), done ? C.green : C.violet, 4 + i * .8);
                  if (p > 0 && p < 1) packet(hp, radio(s), (t * .9 + i * .31) % 1, C.violet, 4);
                  const bar = "#".repeat(Math.round(p * 12)).padEnd(12, ".");
                  targets[i].lines = done ? ["update complete", "v4.2 active"] : check ? ["verify signature", "rebooting..."] : ["firmware v4.1 > v4.2", `[${bar}]`, `${Math.round(p * 100)}%`];
              });
              H.lines = done ? ["fleet on v4.2"] : ["pushing v4.2", `${Math.round(p * 100)}% sent`];
              tag("fw", hp.clone().add(new THREE.Vector3(0, 2.4, 0)), done ? "all updated" : "firmware blocks");
          } },
    ];

    // UI -----------------------------------------------------------------------------------------------------
    const $ = (id) => document.getElementById(id);
    const list = $("steps"), say = $("say"), scrub = $("scrub"), play = $("play"), status = $("status");
    STEPS.forEach((s, i) => { const li2 = document.createElement("li"); li2.innerHTML = `<b><span class="n" style="display:inline">${i + 1}.</span> ${s.title}</b><span>${s.desc}</span>`; li2.onclick = () => go(i); list.append(li2); });
    let cur = Math.min(STEPS.length - 1, Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1)), t = 0, playing = true;
    const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(); let camInit = false;
    function go(i) { cur = (i + STEPS.length) % STEPS.length; t = 0; history.replaceState(null, "", "#" + (cur + 1)); [...list.children].forEach((e, k) => e.classList.toggle("on", k === cur)); list.children[cur].scrollIntoView({ block: "nearest" }); }
    $("prev").onclick = () => go(cur - 1); $("next").onclick = () => go(cur + 1);
    play.onclick = () => { playing = !playing; play.textContent = playing ? "❚❚ Pause" : "▶ Play"; };
    scrub.oninput = () => { t = (scrub.value / 1000) * STEPS[cur].dur; playing = false; play.textContent = "▶ Play"; };
    addEventListener("keydown", (e) => { if (e.key === "ArrowRight") go(cur + 1); else if (e.key === "ArrowLeft") go(cur - 1); else if (e.key === " " && e.target === document.body) { e.preventDefault(); play.click(); } });
    function typed(text, n) { let out = "", left = n; text.split("*").forEach((part, i) => { const s = part.slice(0, Math.max(0, left)); left -= part.length; out += i % 2 ? `<b>${s}</b>` : s; }); return out; }

    function resize() { const sc = innerWidth < 700 ? 2 : 3, w = view.clientWidth, h = view.clientHeight; renderer.setSize(Math.max(1, Math.floor(w / sc)), Math.max(1, Math.floor(h / sc)), false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    addEventListener("resize", resize); resize(); go(cur);

    let last = performance.now();
    function frame(now) {
        const dt = Math.min(.05, (now - last) / 1000); last = now;
        const S = STEPS[cur];
        if (playing) { t += dt; if (t >= S.dur) { go(cur + 1); } }
        const st = STEPS[cur];
        // reset
        sticks.forEach((s) => { s.g.visible = false; s.g.rotation.set(0, 0, 0); s.g.scale.setScalar(SC); s.lid.position.y = .5; s.setLed(C.off); });
        laps.forEach((l) => { l.g.visible = true; l.lines = idle(l); }); pk.forEach((m) => { m.visible = false; }); rg.forEach((m) => { m.visible = false; }); links.forEach((l) => { l.visible = false; }); sel.visible = false;
        pi = ri = li = 0; tagPending.length = 0;
        st.fn(t);
        const blink = Math.floor(now / 500) % 2;
        laps.forEach((l) => drawScreen(l.screen, l.name, l.lines, blink));
        // camera: pull back on narrow views so the whole scene still fits
        const asp = camera.aspect, [cp, cl] = st.cam, look = new THREE.Vector3(...cl), pos = new THREE.Vector3(...cp);
        pos.sub(look).multiplyScalar(Math.max(1.3, 1.9 / asp)).add(look);
        if (!camInit) { camPos.copy(pos); camLook.copy(look); camInit = true; }
        const e = 1 - Math.exp(-dt * 3); camPos.lerp(pos, e); camLook.lerp(look, e);
        camera.position.copy(camPos); camera.lookAt(camLook);
        camera.updateMatrixWorld(); renderer.render(scene, camera);

        // tags
        const W = view.clientWidth, Hh = view.clientHeight; tagUsed.clear();
        tagPending.forEach(([id, pos3, text]) => {
            let el = tagEls.get(id); if (!el) { el = document.createElement("div"); el.className = "tag"; tagsEl.append(el); tagEls.set(id, el); }
            v3.copy(pos3).project(camera); el.style.left = (v3.x * .5 + .5) * W + "px"; el.style.top = (-v3.y * .5 + .5) * Hh + "px"; el.style.opacity = 1; if (el.textContent !== text) el.textContent = text; tagUsed.add(id);
        });
        tagEls.forEach((el, id) => { if (!tagUsed.has(id)) el.style.opacity = 0; });
        // captions + controls
        const line = [...st.say].reverse().find(([at]) => t >= at) || st.say[0];
        say.innerHTML = typed(line[1], Math.floor((t - line[0]) * 45));
        if (playing) scrub.value = Math.round((t / st.dur) * 1000);
        status.textContent = `Step ${cur + 1} of ${STEPS.length}: ${st.title}  |  ${t.toFixed(1)}s / ${st.dur}s  |  ← → keys, space to pause`;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
