// Free-walk camera: WASD/arrows, drag to look, wheel to glide, touch pad, plus eased fly-to.
import * as THREE from "../explorer/src/scene/three.js";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const wrap = (a) => ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;

export function poseLookingAt(pos, target) {
    const d = new THREE.Vector3().subVectors(target, pos);
    return { x: pos.x, y: pos.y, z: pos.z, yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
}

export function createControls(canvas, camera, { radius = 170, onClick }) {
    const p = { x: 0, y: 3.4, z: 24, yaw: 0, pitch: -.05 };
    const keys = new Set(), vel = new THREE.Vector3(), pad = { x: 0, y: 0 };
    let tween = null, drag = null, travel = 0, enabled = false;
    camera.rotation.order = "YXZ";

    const apply = () => { camera.position.set(p.x, p.y, p.z); camera.rotation.set(p.pitch, p.yaw, 0); };

    function flyTo(pose, ms = 1700) {
        tween = { from: { ...p }, to: { ...pose, yaw: p.yaw + wrap(pose.yaw - p.yaw) }, start: performance.now(), ms };
    }
    function set(pose) { Object.assign(p, pose); tween = null; apply(); }

    window.addEventListener("keydown", (e) => { if (!e.metaKey && !e.ctrlKey) keys.add(e.key.toLowerCase()); });
    window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => keys.clear());
    canvas.addEventListener("pointerdown", (e) => { if (e.target !== canvas) return; canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY }; travel = 0; tween = null; });
    canvas.addEventListener("pointermove", (e) => {
        if (!drag || !enabled) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
        travel += Math.abs(dx) + Math.abs(dy);
        p.yaw -= dx * .0038; p.pitch = clamp(p.pitch - dy * .0038, -1.35, 1.35);
    });
    canvas.addEventListener("pointerup", (e) => { if (drag && travel < 5) onClick(e.clientX, e.clientY); drag = null; });
    canvas.addEventListener("pointercancel", () => { drag = null; });
    canvas.addEventListener("wheel", (e) => { if (!enabled) return; e.preventDefault(); tween = null; vel.addScaledVector(forward(), -e.deltaY * .03); }, { passive: false });

    const forward = () => new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const right = () => new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));

    function update(dt, now) {
        if (tween) {
            const k = clamp((now - tween.start) / tween.ms, 0, 1), m = ease(k);
            for (const key of ["x", "y", "z", "yaw", "pitch"]) p[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * m;
            if (k >= 1) tween = null;
        } else if (enabled) {
            const run = keys.has("shift") ? 2.4 : 1, accel = new THREE.Vector3();
            const fwd = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - pad.y;
            const side = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0) + pad.x;
            accel.addScaledVector(forward(), fwd).addScaledVector(right(), side);
            if (accel.lengthSq()) accel.normalize().multiplyScalar(60 * run);
            vel.addScaledVector(accel, dt);
            vel.y += ((keys.has("r") ? 1 : 0) - (keys.has("f") ? 1 : 0)) * 40 * dt;
            vel.multiplyScalar(Math.exp(-5 * dt));
            p.x += vel.x * dt; p.y = clamp(p.y + vel.y * dt, 1.6, 70); p.z += vel.z * dt;
            const r = Math.hypot(p.x, p.z); if (r > radius) { p.x *= radius / r; p.z *= radius / r; }
        }
        apply();
    }
    return { pose: p, flyTo, set, update, enable: (on) => { enabled = on; }, setPad: (x, y) => { pad.x = x; pad.y = y; }, get moving() { return !!tween; } };
}
