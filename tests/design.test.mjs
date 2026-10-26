import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CHECKS, parseCsv } from "../web/assets/checks.js";

const root = new URL("../", import.meta.url);
const load = async (path, kind) => {
    const buf = await readFile(new URL(path, root));
    return kind === "buffer" ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf.toString("utf8");
};

for (const check of CHECKS) {
    test(`${check.group}: ${check.name}`, async () => { await check.run(load); });
}

test("CSV parser handles quoted commas", () => {
    assert.deepEqual(parseCsv('a,b\n"x,y",2\n'), [{ a: "x,y", b: "2" }]);
});

test("checks can fail: truncated STL and wrong outline are rejected", async () => {
    const { stlInfo, gerberBounds } = await import("../web/assets/checks.js");
    assert.throws(() => stlInfo(new ArrayBuffer(100)));
    assert.throws(() => gerberBounds("%FSLAX46Y46*%\n%MOMM*%\nM02*"));
    const open = new ArrayBuffer(84 + 50); // one lone triangle has unpaired edges
    const v = new DataView(open); v.setUint32(80, 1, true); v.setFloat32(84 + 12 + 12, 1, true); v.setFloat32(84 + 12 + 28, 1, true);
    assert.ok(stlInfo(open).openEdges > 0);
});

test("simulator is deterministic and loss hurts", async () => {
    const { simulateJoin, simulateInput } = await import("../web/assets/sim.js");
    const a = simulateJoin({ targets: 10, loss: 0.1, seed: 3 });
    assert.deepEqual(a, simulateJoin({ targets: 10, loss: 0.1, seed: 3 }));
    assert.equal(a.joined, 10);
    assert.ok(simulateInput({ loss: 0.4, retries: 1 }).delivered < simulateInput({ loss: 0.05, retries: 1 }).delivered);
});
