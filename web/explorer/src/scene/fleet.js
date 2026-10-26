// Other sticks around the main one, joined to it by radio pulses.
import * as THREE from "./three.js";
import { mats } from "./materials.js";
import { state } from "../state.js";

const SLOTS = [[-36, -30, 0.5], [2, -44, -0.3], [40, -28, 0.2]]; // x, z, yaw
const LINK_Y = 9;
const LINK_WIDTH = 0.15;
const PULSES_PER_LINK = 3;
const PULSE_RADIUS = 0.5;
const PULSE_RATE = 0.35; // links per second

const inert = (obj) => {
    obj.raycast = () => {};
    return obj;
};

function buildLink(from, to, group) {
    const line = inert(new THREE.Mesh(new THREE.BoxGeometry(from.distanceTo(to), LINK_WIDTH, LINK_WIDTH), mats.trace));
    line.position.copy(from).add(to).multiplyScalar(0.5);
    line.rotation.y = Math.atan2(-(to.z - from.z), to.x - from.x);
    const geo = new THREE.SphereGeometry(PULSE_RADIUS, 12, 8);
    const pulses = Array.from({ length: PULSES_PER_LINK }, () => inert(new THREE.Mesh(geo, mats.flow)));
    group.add(line, ...pulses);
    return { from, to, pulses, parts: [line, ...pulses] };
}

export function buildFleet(makeStick) {
    const group = new THREE.Group();
    const origin = new THREE.Vector3(0, LINK_Y, 0);
    const links = SLOTS.map(([x, z, yaw]) => {
        const stick = makeStick();
        stick.position.set(x, 0, z);
        stick.rotation.y = yaw;
        group.add(stick);
        return buildLink(origin, new THREE.Vector3(x, LINK_Y, z), group);
    });

    function refresh() {
        links.forEach((link) => link.parts.forEach((part) => { part.visible = state.layers.radio; }));
    }

    function update(seconds) {
        if (!state.layers.radio) return;
        links.forEach((link) => link.pulses.forEach((pulse, idx) => {
            pulse.position.lerpVectors(link.from, link.to, (seconds * PULSE_RATE + idx / PULSES_PER_LINK) % 1);
        }));
    }

    refresh();
    return { group, refresh, update };
}
