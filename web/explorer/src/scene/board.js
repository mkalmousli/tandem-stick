// The PCB in its own frame: origin at board centre, +y up, top surface at y = pcbT / 2.
import * as THREE from "./three.js";
import { mats } from "./materials.js";
import { DIM, CHIPS, PORTS, PASSIVES } from "../data.js";
import { buildPort, facePoint } from "./ports.js";

const SURFACE = DIM.pcbT / 2;
const MODULE = { baseH: 0.8, antennaLen: 6.2, canInset: 0.4, meanderBars: 5, meanderPitch: 1.1, meanderWidth: 0.3, meanderMargin: 1.5, copperLift: 0.02 };
const LEG = { length: 0.5, width: 0.4, height: 0.15 };
const LENS = { size: 1.1, height: 0.04 };

const boxAt = (size, pos, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...pos);
    return mesh;
};

function buildMeander(length, width) {
    const reach = width / 2 - MODULE.meanderMargin;
    const y = MODULE.baseH + MODULE.copperLift;
    const x0 = -length / 2 + MODULE.meanderPitch;
    const parts = [];
    for (let bar = 0; bar < MODULE.meanderBars; bar++) {
        const x = x0 + bar * MODULE.meanderPitch;
        parts.push(boxAt([MODULE.meanderWidth, MODULE.copperLift, 2 * reach], [x, y, 0], mats.metal));
        if (bar < MODULE.meanderBars - 1) {
            const end = bar % 2 === 0 ? reach : -reach;
            parts.push(boxAt([MODULE.meanderPitch, MODULE.copperLift, MODULE.meanderWidth], [x + MODULE.meanderPitch / 2, y, end], mats.metal));
        }
    }
    return parts;
}

// Module: black base board, shield can over the electronics, copper meander antenna at the far end.
function buildModule(item, group) {
    const [length, width, height] = item.size;
    const canLength = length - MODULE.antennaLen;
    const canHeight = height - MODULE.baseH;
    group.add(
        boxAt([length, MODULE.baseH, width], [0, MODULE.baseH / 2, 0], mats.pcb),
        boxAt([canLength, canHeight, width - 2 * MODULE.canInset], [MODULE.antennaLen / 2, MODULE.baseH + canHeight / 2, 0], mats.metal),
        ...buildMeander(length, width),
    );
}

function buildLegs(item, group) {
    const [w, , h] = item.size;
    item.legs.forEach((row, side) => {
        const x = (side === 0 ? -1 : 1) * (w / 2 + LEG.length / 2);
        row.forEach((z) => group.add(boxAt([LEG.length, LEG.height, LEG.width], [x, LEG.height / 2 + 0.1, z], mats.metal)));
    });
    return h;
}

function buildIc(item, group) {
    const [w, d, h] = item.size;
    group.add(boxAt([w, h, d], [0, h / 2, 0], mats.chip));
    if (item.legs) buildLegs(item, group);
}

function buildLed(item, group) {
    const [w, d, h] = item.size;
    group.add(boxAt([w, h, d], [0, h / 2, 0], mats.led), boxAt([LENS.size, LENS.height, LENS.size], [0, h + LENS.height / 2, 0], mats.flow));
}

const LOOKS = {
    module: buildModule,
    ic: buildIc,
    led: buildLed,
    cap: (item, group) => group.add(boxAt([item.size[0], item.size[2], item.size[1]], [0, item.size[2] / 2, 0], mats.cap)),
};

// Group origin sits on the board surface at the part's centre.
function buildPart(item) {
    const group = new THREE.Group();
    LOOKS[item.look](item, group);
    group.position.set(item.pos[0], SURFACE, item.pos[1]);
    return group;
}

function buildChip(item) {
    const group = buildPart(item);
    group.userData.id = item.id;
    return group;
}

function placePort(item) {
    const group = buildPort(item);
    group.position.copy(facePoint(item.face, item.u, DIM.plugY - DIM.pcbY));
    return group;
}

export function buildBoard() {
    const group = new THREE.Group();
    const anchors = new Map();
    const byId = new Map();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(DIM.pcbW, DIM.pcbT, DIM.pcbD), mats.pcb));
    group.add(...PASSIVES.map(buildPart));
    [...CHIPS.map(buildChip), ...PORTS.map(placePort)].forEach((part) => {
        group.add(part);
        byId.set(part.userData.id, part);
        anchors.set(part.userData.id, part.position.clone());
    });
    return { group, anchors, byId };
}
