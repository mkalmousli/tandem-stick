import * as THREE from "./three.js";
import { DIM, CHIPS, PASSIVES } from "../data.js";

// FDM layer lines: fine horizontal ridges, used as a bump map on printed parts.
function layerLines() {
    const c = document.createElement("canvas"); c.width = 4; c.height = 8;
    const g = c.getContext("2d"); g.fillStyle = "#808080"; g.fillRect(0, 0, 4, 8); g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, 4, 3); g.fillStyle = "#505050"; g.fillRect(0, 5, 4, 3);
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 36); tex.anisotropy = 8;
    return tex;
}

// Solder-mask green board with copper traces, pads and white silkscreen, baked to one texture.
function boardTexture() {
    const S = 48, W = DIM.pcbW * S, D = DIM.pcbD * S, c = document.createElement("canvas"); c.width = W; c.height = D;
    const g = c.getContext("2d"), px = (x) => (x + DIM.pcbW / 2) * S, py = (z) => (z + DIM.pcbD / 2) * S;
    g.fillStyle = "#0d5230"; g.fillRect(0, 0, W, D);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; g.fillRect(Math.random() * W, Math.random() * D, 2, 2); }
    const hub = CHIPS.find((p) => p.id === "esp").pos;
    g.strokeStyle = "#1d7a49"; g.lineWidth = .35 * S; g.lineCap = "round"; g.lineJoin = "round";
    CHIPS.filter((p) => p.id !== "esp").forEach((p, i) => { g.beginPath(); g.moveTo(px(p.pos[0]), py(p.pos[1])); g.lineTo(px((p.pos[0] + hub[0]) / 2), py(p.pos[1])); g.lineTo(px((p.pos[0] + hub[0]) / 2), py(hub[1] + (i ? 3 : -3))); g.lineTo(px(hub[0]), py(hub[1] + (i ? 3 : -3))); g.stroke(); });
    [-4, -2, 0, 2, 4].forEach((z, i) => { g.beginPath(); g.moveTo(px(-DIM.pcbW / 2 + 1), py(z)); g.lineTo(px(-DIM.pcbW / 2 + 5 + i), py(z)); g.lineTo(px(hub[0] - 6), py(z * .5)); g.stroke(); });
    g.fillStyle = "#e8c86a"; PASSIVES.forEach((p) => [-1, 1].forEach((s) => g.fillRect(px(p.pos[0]) + s * p.size[0] * .7 - .3 * S, py(p.pos[1]) - .35 * S, .6 * S, .7 * S)));
    g.fillStyle = "#f4f4f0"; g.strokeStyle = "#f4f4f0"; g.lineWidth = .12 * S; g.font = `bold ${1.1 * S}px monospace`;
    CHIPS.forEach((p) => { g.strokeRect(px(p.pos[0]) - p.size[0] / 2 - .5 * S / S * S * .5, py(p.pos[1]) - p.size[1] / 2 - .3 * S, p.size[0] * S + .5 * S, p.size[1] * S + .6 * S); });
    g.fillText("TANDEM STICK", px(-DIM.pcbW / 2 + 6), py(DIM.pcbD / 2 - 1.2)); g.font = `${.9 * S}px monospace`; g.fillText("v1  open hardware  MIT", px(-DIM.pcbW / 2 + 6), py(-DIM.pcbD / 2 + 2));
    g.fillText("U1", px(hub[0]) - .8 * S, py(hub[1]) - DIM.pcbD * S * .38); g.fillText("U2", px(CHIPS[1].pos[0]) - 2.4 * S, py(CHIPS[1].pos[1]) - .2 * S); g.fillText("D1", px(CHIPS[2].pos[0]) - 2.4 * S, py(CHIPS[2].pos[1]));
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 16; tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const physical = (cfg) => new THREE.MeshPhysicalMaterial(cfg);
const lines = layerLines();

export const mats = {
    tray: physical({ metalness: 0, roughness: 0.55, bumpMap: lines, bumpScale: 0.5 }),
    lid: physical({ metalness: 0, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25, transparent: true, bumpMap: lines, bumpScale: 0.25 }),
    pcb: physical({ color: 0xffffff, map: boardTexture(), metalness: 0, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
    chip: physical({ metalness: 0, roughness: 0.35, clearcoat: 0.3 }),
    led: physical({ metalness: 0, roughness: 0.4 }),
    cap: physical({ metalness: 0, roughness: 0.5 }),
    metal: physical({ metalness: 1, roughness: 0.22 }),
    hole: physical({ metalness: 0, roughness: 0.9 }),
    trace: new THREE.MeshBasicMaterial(),
    flow: new THREE.MeshBasicMaterial(),
};

const SCENE_KEYS = ["tray", "lid", "chip", "led", "cap", "metal", "hole", "trace"];

export function paintMaterials(scene, accent) {
    SCENE_KEYS.forEach((key) => mats[key].color.set(scene[key]));
    mats.flow.color.set(accent);
    Object.values(mats).forEach((mat) => {
        if (mat.isMeshStandardMaterial) mat.envMapIntensity = scene.env;
    });
}
