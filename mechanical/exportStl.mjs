// Writes the tray and the plain lid blank as binary STL (mm). The lid blank is the input of `npm run product`, which adds the logo and writes the printable mechanical/case-lid.stl.
import { writeFileSync } from "node:fs";
import { loadScene } from "../tests/lib/webapp.mjs";

const { THREE, buildTray, buildLid, DIM } = loadScene();

function toStl(group) {
    group.updateMatrixWorld(true);
    const tris = [];
    group.traverse((obj) => {
        if (!obj.isMesh || obj.geometry.attributes.position.count < 4 && !obj.geometry.index) return;
        const geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry;
        const pos = geo.attributes.position;
        for (let idx = 0; idx < pos.count; idx += 3) {
            tris.push([0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, idx + k).applyMatrix4(obj.matrixWorld)));
        }
    });
    const buf = Buffer.alloc(84 + tris.length * 50);
    buf.writeUInt32LE(tris.length, 80);
    tris.forEach(([a, b, c], idx) => {
        const n = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
        const vals = [n, a, b, c].flatMap((v) => [v.x, v.y, v.z]);
        vals.forEach((val, k) => buf.writeFloatLE(Number.isFinite(val) ? val : 0, 84 + idx * 50 + k * 4));
    });
    return { buf, count: tris.length };
}

const tray = buildTray();
const lid = buildLid().group;
// Print the lid upside down so its flat top lies on the bed and the lip points up.
lid.rotation.x = Math.PI;
lid.position.y = DIM.wall;
// Slicers are Z-up; the viewer is Y-up.
const zUp = (part) => new THREE.Group().add(part).rotateX(Math.PI / 2);
[["case-tray", zUp(tray)], ["case-lid", zUp(lid)]].forEach(([name, group]) => {
    const { buf, count } = toStl(group);
    writeFileSync(new URL(name === "case-lid" ? "../scripts/product/base/case-lid.stl" : `./${name}.stl`, import.meta.url), buf);
    const box = new THREE.Box3().setFromObject(group);
    console.log(name, count, "tris", box.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(1)).join(" × "));
});
