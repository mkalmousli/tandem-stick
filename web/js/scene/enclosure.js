(() => {
// Printed case: rounded tray with a slot for the board's plug, and a snap-on lid with an inner lip.
const { mats } = app.scene.materials;
const { DIM } = app.data;
const { slotBounds } = app.scene.ports;

const CORNER = 2;
const CORNER_STEPS = 6;
const RIB_RADIUS = 1;
const RIB_INSET = 2;
const LID_BEVEL = 0.3;
const LIP = { fit: 0.15, thickness: 0.5, height: 0.8 };

// Rounded rectangle in the x/z plane, counter-clockwise, running from (hx, gap) round to (hx, -gap).
function loop(halfX, halfZ, radius, gap = 0) {
    const centres = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    const points = [new THREE.Vector2(halfX, gap)];
    centres.forEach(([sx, sz], corner) => {
        for (let step = 0; step <= CORNER_STEPS; step++) {
            const angle = ((corner + step / CORNER_STEPS) * Math.PI) / 2;
            points.push(new THREE.Vector2(sx * (halfX - radius) + radius * Math.cos(angle), sz * (halfZ - radius) + radius * Math.sin(angle)));
        }
    });
    points.push(new THREE.Vector2(halfX, -gap));
    return gap ? points : points.slice(0, -1);
}

function prism(points, hole, y0, y1, bevel = 0) {
    const shape = new THREE.Shape(points);
    if (hole) shape.holes.push(new THREE.Path(hole));
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: y1 - y0 - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 1,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y0 + bevel, 0);
    return geo;
}

const outer = (gap) => loop(DIM.w / 2, DIM.d / 2, CORNER, gap);
const inner = (gap) => loop(DIM.w / 2 - DIM.wall, DIM.d / 2 - DIM.wall, CORNER - DIM.wall, gap);

// A wall band; with a gap the plug side is opened into a slot.
function band(y0, y1, gap) {
    return gap ? prism([...outer(gap), ...inner(gap).reverse()], null, y0, y1) : prism(outer(0), inner(0), y0, y1);
}

function buildRibs() {
    const geo = new THREE.CylinderGeometry(RIB_RADIUS, RIB_RADIUS, DIM.rib, 20);
    const x = DIM.pcbW / 2 - RIB_INSET;
    const z = DIM.pcbD / 2 - RIB_INSET;
    return [[-x, -z], [x, -z], [-x, z], [x, z]].map(([px, pz]) => {
        const mesh = new THREE.Mesh(geo, mats.tray);
        mesh.position.set(px, DIM.floor + DIM.rib / 2, pz);
        return mesh;
    });
}

function buildTray() {
    const slot = slotBounds();
    const group = new THREE.Group();
    const parts = [
        prism(outer(0), null, 0, DIM.floor),
        band(DIM.floor, slot.low, 0),
        band(slot.low, slot.high, slot.half),
        band(slot.high, DIM.wallTop, 0),
    ];
    group.add(...parts.map((geo) => new THREE.Mesh(geo, mats.tray)), ...buildRibs());
    return group;
}

function buildLid() {
    const plate = prism(loop(DIM.w / 2 - LID_BEVEL, DIM.d / 2 - LID_BEVEL, CORNER - LID_BEVEL), null, 0, DIM.wall, LID_BEVEL);
    const edge = DIM.wall + LIP.fit;
    const lipOuter = loop(DIM.w / 2 - edge, DIM.d / 2 - edge, CORNER - edge);
    const lipInner = loop(DIM.w / 2 - edge - LIP.thickness, DIM.d / 2 - edge - LIP.thickness, CORNER - edge - LIP.thickness);
    const lip = prism(lipOuter, lipInner, -LIP.height, 0);
    const group = new THREE.Group();
    [plate, lip].forEach((geo) => {
        const mesh = new THREE.Mesh(geo, mats.lid);
        mesh.userData.ghost = true;
        group.add(mesh);
    });
    return { group };
}


app.scene.enclosure = { buildTray, buildLid };
})();
