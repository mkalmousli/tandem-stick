(() => {
// Connector geometry: the USB-A plug is the board's own edge, narrowed to plug width, with four contacts.
const { mats } = app.scene.materials;
const { DIM, FACE } = app.data;

const SLOT_CLEARANCE = 0.2;
const SHELL = { wall: 0.3 };
const TONGUE = { width: 10.4, height: 1.9, length: 8.5, recess: 1, drop: 0.5 };
const CONTACT = { count: 4, width: 1.2, pitch: 2.4, lift: 0.04, length: 6.5, tipGap: 1.8 };

// Wall cut-out the plug shell passes through, centred on the board.
const slotBounds = () => ({
    half: DIM.plugW / 2 + SLOT_CLEARANCE,
    low: DIM.plugY - DIM.plugH / 2 - SLOT_CLEARANCE,
    high: DIM.plugY + DIM.plugH / 2 + SLOT_CLEARANCE,
});

// World-space point on the outer wall plane for a port. u runs along the face.
function facePoint(face, u, y) {
    if (face === "front") return new THREE.Vector3(u, y, DIM.d / 2);
    if (face === "rear") return new THREE.Vector3(u, y, -DIM.d / 2);
    return new THREE.Vector3(DIM.w / 2, y, u);
}

const boxAt = (size, pos, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...pos);
    return mesh;
};

// Hollow rectangular metal shell, open at the tip. Extruded along +z from z = 0.
function buildShell(length) {
    const shape = new THREE.Shape();
    const rect = (path, w, h) => {
        path.moveTo(-w / 2, -h / 2);
        path.lineTo(w / 2, -h / 2);
        path.lineTo(w / 2, h / 2);
        path.lineTo(-w / 2, h / 2);
        path.closePath();
        return path;
    };
    rect(shape, DIM.plugW, DIM.plugH);
    shape.holes.push(rect(new THREE.Path(), DIM.plugW - 2 * SHELL.wall, DIM.plugH - 2 * SHELL.wall));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
    return new THREE.Mesh(geo, mats.metal);
}

// Plastic tongue inside the shell with four contacts on its top face.
function buildTongue(z) {
    const y = -DIM.plugH / 2 + SHELL.wall + TONGUE.drop + TONGUE.height / 2;
    const tongue = boxAt([TONGUE.width, TONGUE.height, TONGUE.length], [0, y, z], mats.chip);
    const contacts = Array.from({ length: CONTACT.count }, (_, idx) => boxAt(
        [CONTACT.width, CONTACT.lift, CONTACT.length],
        [(idx - (CONTACT.count - 1) / 2) * CONTACT.pitch, y + TONGUE.height / 2 + CONTACT.lift / 2, z + (TONGUE.length - CONTACT.length) / 2 - CONTACT.tipGap + TONGUE.recess],
        mats.metal,
    ));
    return [tongue, ...contacts];
}

// Group origin = centre of the plug on the wall plane, +z points out of the device.
function buildPort(item) {
    const stem = DIM.w / 2 - DIM.pcbW / 2;
    const shell = buildShell(stem + DIM.plugOut);
    shell.position.z = -stem;
    const group = new THREE.Group();
    group.add(shell, ...buildTongue(DIM.plugOut - TONGUE.recess - TONGUE.length / 2));
    group.userData.id = item.id;
    group.rotation.y = FACE[item.face].rot;
    return group;
}


app.scene.ports = { slotBounds, facePoint, buildPort };
})();
