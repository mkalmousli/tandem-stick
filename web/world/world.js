// The Tandem world: an open night landscape where the product, plan, test lab and downloads are places you walk to.
import * as THREE from "../explorer/src/scene/three.js";
import { buildSky, buildGround, buildFireflies } from "./sky.js";
import { buildStick, buildLaptop, buildTower, makeScreens, buildPlanTower, buildLab, buildDock, portal, labelSprite, glowSprite, ACCENT, CYAN } from "./props.js";
import { createControls, poseLookingAt } from "./controls.js";
import { createHud } from "./hud.js";

export const STATIONS = [
    { id: "stick", key: "1", name: "The Stick", sub: "3D explorer", href: "explore.html", pos: [0, 0, 0], color: ACCENT,
      blurb: "The product itself: take the guided tour, open the case, click every part, trace the signal paths." },
    { id: "plan", key: "2", name: "Plan Tower", sub: "Roadmap and costs", href: "plan.html", pos: [-46, 0, -34], color: 0xc08bff,
      blurb: "Seven floors, one per phase: requirements, architecture, firmware, security, costs, compliance and risks." },
    { id: "lab", key: "3", name: "Test Lab", sub: "Run it in your browser", href: "test.html", pos: [48, 0, -30], color: CYAN,
      blurb: "Design checks on the real files, a pairing simulator, and a Web Serial bring-up tool for your first board." },
    { id: "dock", key: "4", name: "Download Dock", sub: "Gerbers, BOM, STL", href: "downloads.html", pos: [2, 0, 56], color: 0xffb454,
      blurb: "Everything to order the board and print the case, bundled, with checksums you can verify." },
];
const V = (s) => new THREE.Vector3(...s.pos);
const PORTAL_AT = 12, STAND_OFF = 24;

export function start(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, 1, .1, 1200);
    scene.fog = new THREE.FogExp2(0x07101f, .0028);

    scene.add(new THREE.HemisphereLight(0x6f9cff, 0x0a0f1c, 1.1));
    const moon = new THREE.DirectionalLight(0xaec4ff, 1.3); moon.position.set(-40, 80, -80); scene.add(moon);

    const sky = buildSky(); scene.add(sky.mesh);
    const ground = buildGround(STATIONS.slice(1).map((s) => new THREE.Vector2(s.pos[0], s.pos[2])).concat(new THREE.Vector2(0, 0)));
    ground.mesh.position.y = -.02; scene.add(ground.mesh);
    const flies = buildFireflies(); scene.add(flies.points);

    // Hub: the giant host stick on its pedestal.
    const hub = new THREE.Group(), pedestal = new THREE.Mesh(new THREE.CylinderGeometry(8, 9, 1.2, 40), new THREE.MeshStandardMaterial({ color: 0x141a2a, metalness: .6, roughness: .4 }));
    pedestal.position.y = .6;
    const hubRing = new THREE.Mesh(new THREE.TorusGeometry(8.2, .12, 8, 80), new THREE.MeshBasicMaterial({ color: ACCENT })); hubRing.rotation.x = Math.PI / 2; hubRing.position.y = 1.25;
    const bigStick = buildStick({ scale: 1.15 }); bigStick.group.position.y = 6;
    const hubLight = new THREE.PointLight(ACCENT, 600, 60); hubLight.position.y = 7;
    hub.add(pedestal, hubRing, bigStick.group, hubLight);
    scene.add(hub);
    const hubTop = new THREE.Vector3(0, 6.5, 0);

    // Landmarks
    const landmarks = {};
    const place = (st, built, extra = []) => {
        const g = built.group; g.position.copy(V(st)); scene.add(g);
        const face = Math.atan2(-st.pos[0], -st.pos[2]); g.rotation.y = 0;
        const label = labelSprite(st.name, st.sub); label.position.set(st.pos[0], (built.height || 12) + 3, st.pos[2]); scene.add(label);
        const dir = new THREE.Vector3(-st.pos[0], 0, -st.pos[2]).normalize();
        const pt = portal(st.color); pt.group.position.copy(V(st)).addScaledVector(dir, PORTAL_AT); pt.group.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI; scene.add(pt.group);
        const light = new THREE.PointLight(st.color, 500, 45); light.position.copy(V(st)).setY(8); scene.add(light);
        const hit = new THREE.Mesh(new THREE.SphereGeometry(10, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.position.copy(V(st)).setY(7); hit.userData.station = st; scene.add(hit);
        landmarks[st.id] = { st, built, label, portal: pt, hit, portalPos: pt.group.position.clone(), dir, face };
    };
    const plan = buildPlanTower(), lab = buildLab(), dock = buildDock();
    place(STATIONS[1], plan); place(STATIONS[2], lab); place(STATIONS[3], dock);
    {   // hub station
        const st = STATIONS[0], dir = new THREE.Vector3(0, 0, 1);
        const label = labelSprite(st.name, st.sub); label.position.set(0, 14, 0); scene.add(label);
        const pt = portal(st.color); pt.group.position.set(0, 0, PORTAL_AT - 2); scene.add(pt.group);
        const hit = new THREE.Mesh(new THREE.SphereGeometry(10, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.position.y = 7; hit.userData.station = st; scene.add(hit);
        landmarks.stick = { st, label, portal: pt, hit, portalPos: pt.group.position.clone(), dir };
    }

    // Fleet: machines around the hub, each with a stick, linked by radio arcs with travelling packets.
    const screens = makeScreens(4), targets = [], packets = [], rings = [];
    const taken = STATIONS.map((s) => Math.atan2(s.pos[2], s.pos[0]));
    const count = 14;
    for (let i = 0; i < count; i++) {
        let a = (i / count) * Math.PI * 2 + .2, r = i % 2 ? 24 : 32;
        if (taken.some((t, k) => k && Math.abs(wrapA(a - t)) < .32)) { r = 66 + (i % 3) * 8; }
        const isTower = i % 4 === 3, g = new THREE.Group();
        const mach = isTower ? buildTower() : { group: buildLaptop(screens.textures[i % 4]) };
        g.add(mach.group);
        const stk = buildStick({ scale: .2, accent: i % 2 ? CYAN : ACCENT });
        stk.group.rotation.y = Math.PI; stk.group.position.set(isTower ? -1.0 : -2.0, isTower ? 1.2 : .4, isTower ? 1.3 : .3);
        g.add(stk.group);
        g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.lookAt(0, 0, 0); g.rotateY(Math.PI);
        scene.add(g);
        const tip = new THREE.Vector3(); stk.group.getWorldPosition(tip); g.updateMatrixWorld(true); stk.group.getWorldPosition(tip); tip.y += .5;
        const mid = tip.clone().add(hubTop).multiplyScalar(.5); mid.y += 8 + tip.distanceTo(hubTop) * .22;
        const curve = new THREE.QuadraticBezierCurve3(hubTop.clone(), mid, tip);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), new THREE.LineDashedMaterial({ color: 0x4fa8ff, dashSize: .8, gapSize: .9, transparent: true, opacity: .45 }));
        line.computeLineDistances(); scene.add(line);
        targets.push({ g, stk, curve, tip, line, flash: 0, next: Math.random() * 3, strip: mach.strip, pos: g.position.clone() });
    }
    const packetGeo = new THREE.SphereGeometry(.28, 8, 8);
    function fire(t, back = false) {
        const m = new THREE.Mesh(packetGeo, new THREE.MeshBasicMaterial({ color: back ? CYAN : 0xffffff })); const h = glowSprite(back ? CYAN : ACCENT, 2.2); m.add(h); scene.add(m);
        packets.push({ m, t, back, k: 0, speed: .5 + Math.random() * .25 });
    }
    function pingRing(pos, color) {
        const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
        m.position.copy(pos); m.rotation.x = -Math.PI / 2; scene.add(m); rings.push({ m, k: 0, max: pos.y < 1 ? 9 : 14 });
    }

    // HUD, controls, interaction
    const hud = createHud(STATIONS, { fly: flyToStation, open: openStation, enter });
    const controls = createControls(canvas, camera, { radius: 175, onClick: clickPick });
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let mode = "intro", navigating = false, hovered = null, nearest = null;

    const standPose = (id) => {
        const lm = landmarks[id], s = lm.st;
        const pos = id === "stick" ? new THREE.Vector3(0, 4.2, 26) : V(s).addScaledVector(lm.dir, STAND_OFF).setY(4.4);
        return poseLookingAt(pos, V(s).setY(id === "stick" ? 6 : 7));
    };
    function flyToStation(id) { if (mode !== "play") return; controls.flyTo(standPose(id)); hud.show(id); }
    function openStation(id) {
        if (navigating) return; navigating = true; hud.fade(true);
        setTimeout(() => { location.href = STATIONS.find((s) => s.id === id).href; }, 450);
    }
    function enter() {
        mode = "play"; controls.enable(true);
        controls.flyTo({ x: 0, y: 3.4, z: 34, yaw: 0, pitch: .06 }, 2400);
        hud.play();
    }
    function clickPick(x, y) {
        if (mode !== "play") return;
        const r = canvas.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(Object.values(landmarks).map((l) => l.hit))[0];
        if (hit) flyToStation(hit.object.userData.station.id); else hud.show(null);
    }
    canvas.addEventListener("pointermove", (e) => {
        if (mode !== "play" || e.buttons) return;
        const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(Object.values(landmarks).map((l) => l.hit))[0];
        hovered = hit ? hit.object.userData.station.id : null; canvas.style.cursor = hovered ? "pointer" : "grab";
    });
    addEventListener("keydown", (e) => {
        if (mode === "intro" && (e.key === "Enter" || e.key === " ")) { enter(); e.preventDefault(); return; }
        if (mode !== "play") return;
        const st = STATIONS.find((s) => s.key === e.key);
        if (st) flyToStation(st.id);
        else if (e.key === "Enter" && nearest) openStation(nearest);
        else if (e.key === "Escape") hud.show(null);
    });
    addEventListener("pageshow", (e) => { if (e.persisted) { navigating = false; hud.fade(false); controls.set(standPose(hud.current || "stick")); } });

    function resize() {
        const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .8 ? 78 : 62; camera.updateProjectionMatrix();
    }
    addEventListener("resize", resize); resize();

    // joystick for touch
    hud.onPad((x, y) => controls.setPad(x, y));

    const clock = new THREE.Clock(); let t = 0; const tmp = new THREE.Vector3();
    function frame(now) {
        const dt = Math.min(.05, clock.getDelta()); t += dt;
        [sky.mat, ground.mat, flies.mat].forEach((m) => { m.uniforms.uTime.value = t; });
        if (mode === "intro") { // cinematic orbit until the visitor enters
            const a = t * .09 + .6;
            controls.set(poseLookingAt(new THREE.Vector3(Math.sin(a) * 58, 17 + Math.sin(t * .2) * 3, Math.cos(a) * 58), new THREE.Vector3(0, 5, 0)));
        } else controls.update(dt, now);
        sky.mesh.position.copy(camera.position);

        bigStick.group.rotation.y = t * .35; bigStick.group.position.y = 6 + Math.sin(t * .8) * .4;
        const pulse = .5 + .5 * Math.sin(t * 3); bigStick.ledHalo.material.opacity = .5 + pulse * .5; bigStick.ledMat.color.setHSL(.58, 1, .6 + pulse * .3);
        hubRing.material.color.setHSL(.6, .9, .55 + .15 * Math.sin(t * 2));
        plan.update(t); lab.update(t); dock.update(t); plan.beacon.material.opacity = .5 + .5 * Math.sin(t * 2.5);
        screens.update(dt);
        Object.entries(landmarks).forEach(([id, l]) => {
            const lit = hovered === id || nearest === id;
            l.portal.ring.scale.setScalar(1 + (lit ? .06 : 0) + Math.sin(t * 2 + id.length) * .02);
            l.portal.disc.material.opacity = (lit ? .34 : .16) + Math.sin(t * 3) * .04;
            l.label.position.y += (Math.sin(t + id.length) * .004);
        });

        // radio traffic
        if (Math.floor(t * 2) % 7 === 0 && Math.floor(t * 2) !== frame.ringAt) { frame.ringAt = Math.floor(t * 2); pingRing(new THREE.Vector3(0, 1.3, 0), ACCENT); }
        targets.forEach((tg) => {
            tg.next -= dt; if (tg.next < 0) { tg.next = 1.4 + Math.random() * 3.2; fire(tg); }
            tg.flash = Math.max(0, tg.flash - dt * 2);
            const l = tg.stk; if (l.ledMat) { l.ledMat.color.setHSL(.5 + tg.flash * .1, 1, .55 + tg.flash * .4); l.ledHalo.material.opacity = .35 + tg.flash * .65; }
            if (tg.strip) tg.strip.color.setHSL(.45, 1, .35 + .3 * (.5 + .5 * Math.sin(t * 6 + tg.pos.x)));
            tg.line.material.opacity = .3 + tg.flash * .5;
        });
        for (let i = packets.length - 1; i >= 0; i--) {
            const p = packets[i]; p.k += dt * p.speed;
            const k = p.back ? 1 - p.k : p.k; p.t.curve.getPoint(Math.min(1, Math.max(0, k)), p.m.position);
            if (p.k >= 1) {
                scene.remove(p.m); p.m.material.dispose(); packets.splice(i, 1);
                if (!p.back) { p.t.flash = 1; pingRing(p.t.tip, CYAN); fire(p.t, true); }
            }
        }
        for (let i = rings.length - 1; i >= 0; i--) {
            const r = rings[i]; r.k += dt * .6; r.m.scale.setScalar(1 + r.k * r.max); r.m.material.opacity = Math.max(0, .8 * (1 - r.k));
            if (r.k >= 1) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); }
        }

        // proximity and portals
        nearest = null;
        if (mode === "play") {
            let best = 12;
            Object.entries(landmarks).forEach(([id, l]) => {
                const d = Math.hypot(camera.position.x - l.portalPos.x, camera.position.z - l.portalPos.z);
                if (d < best) { best = d; nearest = id; }
                if (d < 2.4 && camera.position.y < 9 && !navigating && !controls.moving) openStation(id);
            });
            if (nearest && !controls.moving) hud.near(nearest); else if (!nearest) hud.near(null);
        }
        hud.map(camera.position, controls.pose.yaw, targets.map((tg) => tg.pos), landmarks);
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function wrapA(a) { return ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI; }
