// Signal routes drawn as flat traces with pulses running along the active ones.
import * as THREE from "./three.js";
import { mats } from "./materials.js";
import { state } from "../state.js";

const LAYER = {
    usb: { level: 1, width: 0.3 },
    ctrl: { level: 2, width: 0.2 },
    power: { level: 3, width: 0.5 },
};
const BASE_Y = 0.86;
const LEVEL_STEP = 0.03;
const TRACE_THICKNESS = 0.06;
const PULSE_RADIUS = 0.25;
const PULSE_SPACING = 6;
const PULSE_SPEED = 9; // mm per second


const route = (layer, mode, pts, rev = false) => ({ layer, mode, pts, rev });

// Board frame: x right, +x is the plug end. Every route is live in both roles.
export const ROUTES = [
    route("usb", null, [[12.75, 1.5], [8.25, 1.5]], true),
    route("ctrl", null, [[8.25, 4.5], [9.5, 4.5]]),
    route("power", null, [[12.75, -4.5], [12.3, -4.5], [12.3, -3.55], [11.8, -3.55]]),
    route("power", null, [[9.2, -4.5], [7, -4.5]]),
];

const pulseGeo = new THREE.SphereGeometry(PULSE_RADIUS, 12, 8);

function toPoints(def) {
    const y = BASE_Y + LAYER[def.layer].level * LEVEL_STEP;
    return def.pts.map(([x, z]) => new THREE.Vector3(x, y, z));
}

function segmentMesh(from, to, width) {
    const len = from.distanceTo(to);
    const geo = new THREE.BoxGeometry(len + width, TRACE_THICKNESS, width);
    const mesh = new THREE.Mesh(geo, mats.trace);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.rotation.y = -Math.atan2(to.z - from.z, to.x - from.x);
    mesh.raycast = () => {};
    return mesh;
}

function measure(points) {
    const cumulative = [0];
    for (let idx = 1; idx < points.length; idx++) {
        cumulative.push(cumulative[idx - 1] + points[idx].distanceTo(points[idx - 1]));
    }
    return cumulative;
}

function pointAt(points, cumulative, dist) {
    let idx = 1;
    while (idx < cumulative.length - 1 && cumulative[idx] < dist) idx++;
    const span = cumulative[idx] - cumulative[idx - 1] || 1;
    const k = (dist - cumulative[idx - 1]) / span;
    return points[idx - 1].clone().lerp(points[idx], k);
}

function buildPath(def, group) {
    const points = toPoints(def);
    const cumulative = measure(points);
    const total = cumulative[cumulative.length - 1];
    const meshes = [];
    for (let idx = 1; idx < points.length; idx++) {
        meshes.push(segmentMesh(points[idx - 1], points[idx], LAYER[def.layer].width));
    }
    const pulses = Array.from({ length: Math.max(1, Math.round(total / PULSE_SPACING)) }, () => {
        const pulse = new THREE.Mesh(pulseGeo, mats.flow);
        pulse.raycast = () => {};
        return pulse;
    });
    const holder = new THREE.Group();
    holder.add(...meshes, ...pulses);
    group.add(holder);
    return { def, points, cumulative, total, meshes, pulses, holder };
}

const isActive = (def) => def.layer === "power" || def.mode === null || def.mode === state.mode;

export function buildFlow() {
    const group = new THREE.Group();
    const paths = ROUTES.map((def) => buildPath(def, group));

    function refresh() {
        paths.forEach((path) => {
            const active = isActive(path.def);
            path.holder.visible = state.layers[path.def.layer];
            path.meshes.forEach((mesh) => { mesh.material = active ? mats.flow : mats.trace; });
            path.pulses.forEach((pulse) => { pulse.visible = active; });
        });
    }

    function update(seconds) {
        paths.forEach((path) => {
            if (!path.holder.visible || !isActive(path.def)) return;
            path.pulses.forEach((pulse, idx) => {
                const phase = (seconds * PULSE_SPEED / path.total + idx / path.pulses.length) % 1;
                const frac = path.def.rev ? 1 - phase : phase;
                pulse.position.copy(pointAt(path.points, path.cumulative, frac * path.total));
                pulse.position.y += TRACE_THICKNESS;
            });
        });
    }

    refresh();
    return { group, refresh, update };
}
