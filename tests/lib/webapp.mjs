// Loads the site's plain scripts into a Node vm so tests and tools can reuse the real data and scene code.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const web = new URL("../../web/", import.meta.url);

// Materials draw label textures on a canvas; headless runs get a canvas that accepts any call.
const inert = () => new Proxy(function () {}, { get: () => inert(), apply: () => inert() });
const fakeDocument = { createElement: () => inert() };

export function loadWeb(files) {
    const sandbox = { app: { scene: {}, ui: {}, pages: {}, ex: {}, story: {} }, console, performance, document: fakeDocument };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    files.forEach((path) => vm.runInContext(readFileSync(new URL(path, web), "utf8"), sandbox, { filename: path }));
    return sandbox;
}

export const loadData = () => loadWeb(["js/data/product.js"]).app.data;

export function loadScene() {
    const sandbox = loadWeb(["vendor/three.js", "js/data/product.js", "js/scene/materials.js", "js/scene/ports.js", "js/scene/enclosure.js"]);
    return { THREE: sandbox.THREE, ...sandbox.app.scene.enclosure, DIM: sandbox.app.data.DIM };
}
