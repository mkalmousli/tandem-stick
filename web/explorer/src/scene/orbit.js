// Pointer / wheel / pinch / keyboard orbit camera with animated fly-to.
import * as THREE from "./three.js";
import { on } from "../dom.js";
import { MOTION } from "../theme.js";

const LIMITS = { phiMin: 0.05, phiMax: 1.6, radiusMin: 12, radiusMax: 320, pan: 60 };
const SPEED = { rotate: 0.008, wheel: 0.001, key: 0.06, keyZoom: 1.08, pan: 0.0015 };
const CLICK_SLOP = 5;
const TWO_PI = Math.PI * 2;

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const wrapAngle = (angle) => ((((angle + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function createOrbit(canvas, camera, { onClick }) {
    const view = { theta: 0.65, phi: 1.0, radius: 160, target: new THREE.Vector3(0, 3.6, 0) };
    const pointers = new Map();
    let fly = null;
    let travel = 0;
    const auto = { rate: 0, last: 0 };

    function apply() {
        const sinPhi = Math.sin(view.phi);
        camera.position.set(
            view.target.x + view.radius * sinPhi * Math.sin(view.theta),
            view.target.y + view.radius * Math.cos(view.phi),
            view.target.z + view.radius * sinPhi * Math.cos(view.theta),
        );
        camera.lookAt(view.target);
    }

    function rotate(dTheta, dPhi) {
        view.theta -= dTheta;
        view.phi = clamp(view.phi - dPhi, LIMITS.phiMin, LIMITS.phiMax);
    }

    function zoom(factor) {
        view.radius = clamp(view.radius * factor, LIMITS.radiusMin, LIMITS.radiusMax);
    }

    function pan(dx, dy) {
        const scale = view.radius * SPEED.pan;
        const sin = Math.sin(view.theta);
        const cos = Math.cos(view.theta);
        view.target.x = clamp(view.target.x - cos * dx * scale - sin * dy * scale, -LIMITS.pan, LIMITS.pan);
        view.target.z = clamp(view.target.z + sin * dx * scale - cos * dy * scale, -LIMITS.pan, LIMITS.pan);
    }

    function flyTo(goal) {
        fly = {
            start: performance.now(),
            from: { theta: view.theta, phi: view.phi, radius: view.radius, x: view.target.x, z: view.target.z },
            to: {
                theta: view.theta + wrapAngle((goal.theta ?? view.theta) - view.theta),
                phi: goal.phi ?? view.phi,
                radius: goal.radius ?? view.radius,
                x: goal.x ?? view.target.x,
                z: goal.z ?? view.target.z,
            },
        };
    }

    function update(now) {
        const dt = Math.min(0.05, (now - (auto.last || now)) / 1000);
        auto.last = now;
        if (auto.rate && !fly && pointers.size === 0) view.theta += auto.rate * dt;
        if (fly) {
            const k = clamp((now - fly.start) / MOTION.flyMs, 0, 1);
            const mix = ease(k);
            const lerp = (key) => fly.from[key] + (fly.to[key] - fly.from[key]) * mix;
            view.theta = lerp("theta");
            view.phi = lerp("phi");
            view.radius = lerp("radius");
            view.target.x = lerp("x");
            view.target.z = lerp("z");
            if (k >= 1) fly = null;
        }
        apply();
    }

    function onDown(evt) {
        canvas.setPointerCapture(evt.pointerId);
        pointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
        travel = 0;
        fly = null;
    }

    function pinchDistance() {
        const [a, b] = [...pointers.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function onMove(evt) {
        const last = pointers.get(evt.pointerId);
        if (!last) return;
        const dx = evt.clientX - last.x;
        const dy = evt.clientY - last.y;
        travel += Math.abs(dx) + Math.abs(dy);
        const before = pointers.size === 2 ? pinchDistance() : 0;
        pointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
        if (pointers.size === 2) {
            zoom(before / Math.max(1, pinchDistance()));
        } else if (evt.buttons & 2 || evt.shiftKey) {
            pan(dx, dy);
        } else {
            rotate(dx * SPEED.rotate, dy * SPEED.rotate);
        }
    }

    function onUp(evt) {
        const wasSingle = pointers.size === 1;
        pointers.delete(evt.pointerId);
        if (wasSingle && travel < CLICK_SLOP && evt.type === "pointerup") onClick(evt.clientX, evt.clientY);
    }

    function onWheel(evt) {
        evt.preventDefault();
        fly = null;
        zoom(Math.exp(evt.deltaY * SPEED.wheel));
    }

    const KEYS = {
        ArrowLeft: () => rotate(-SPEED.key, 0),
        ArrowRight: () => rotate(SPEED.key, 0),
        ArrowUp: () => rotate(0, SPEED.key),
        ArrowDown: () => rotate(0, -SPEED.key),
        "+": () => zoom(1 / SPEED.keyZoom),
        "=": () => zoom(1 / SPEED.keyZoom),
        "-": () => zoom(SPEED.keyZoom),
    };

    function onKey(evt) {
        const action = KEYS[evt.key];
        if (!action) return;
        evt.preventDefault();
        fly = null;
        action();
    }

    on(canvas, "pointerdown", onDown);
    on(canvas, "pointermove", onMove);
    on(canvas, "pointerup", onUp);
    on(canvas, "pointercancel", onUp);
    on(canvas, "wheel", onWheel, { passive: false });
    on(canvas, "keydown", onKey);
    on(canvas, "contextmenu", (evt) => evt.preventDefault());

    return { view, update, flyTo, setSpin: (on) => { auto.rate = on ? 0.35 : 0; } };
}
