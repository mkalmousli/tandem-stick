import * as THREE from "./three.js";

const standard = (cfg) => new THREE.MeshStandardMaterial(cfg);

export const mats = {
    tray: standard({ metalness: 0, roughness: 0.42 }),
    lid: standard({ metalness: 0, roughness: 0.42, transparent: true }),
    pcb: standard({ metalness: 0, roughness: 0.4 }),
    chip: standard({ metalness: 0, roughness: 0.6 }),
    led: standard({ metalness: 0, roughness: 0.5 }),
    cap: standard({ metalness: 0, roughness: 0.7 }),
    metal: standard({ metalness: 1, roughness: 0.32 }),
    hole: standard({ metalness: 0, roughness: 0.9 }),
    trace: new THREE.MeshBasicMaterial(),
    flow: new THREE.MeshBasicMaterial(),
};

const SCENE_KEYS = ["tray", "lid", "pcb", "chip", "led", "cap", "metal", "hole", "trace"];

export function paintMaterials(scene, accent) {
    SCENE_KEYS.forEach((key) => mats[key].color.set(scene[key]));
    mats.flow.color.set(accent);
    Object.values(mats).forEach((mat) => {
        if (mat.isMeshStandardMaterial) mat.envMapIntensity = scene.env;
    });
}
