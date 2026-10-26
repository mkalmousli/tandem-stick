(() => {
// Swaps the hand-built shapes for the Blender model (same part ids, same frames) when it has loaded.
const { mats } = app.scene.materials;
const { DIM } = app.data;
const SHARED = ["tray", "lid", "chip", "led", "cap", "metal", "flow"];
function useBlenderModel(nodes, { tray, board, lid }) {
    const baseOf = {
        "case-tray": [tray, new THREE.Matrix4()],
        "case-lid": [lid.group, new THREE.Matrix4().makeTranslation(0, DIM.wallTop, 0)],
        pcb: [board.group, new THREE.Matrix4().makeTranslation(0, DIM.pcbY, 0)],
    };
    const fill = (group, world, node) => {
        const inverse = world.clone().invert();
        const local = inverse.multiply(node.matrix);
        node.parts.forEach((part) => {
            const mat = SHARED.includes(part.name) ? mats[part.name] : part.material;
            const mesh = new THREE.Mesh(part.geometry, mat);
            mesh.applyMatrix4(local);
            if (group === lid.group) mesh.userData.ghost = true;
            group.add(mesh);
        });
    };
    const wipe = (group, keep) => group.children.slice().forEach((child) => { if (!keep || !keep(child)) group.remove(child); });
    wipe(tray);
    wipe(lid.group);
    wipe(board.group, (child) => board.byId.has(child.userData.id));
    ["case-tray", "case-lid", "pcb"].forEach((id) => fill(...baseOf[id].slice(0, 1), baseOf[id][1], nodes.get(id)));
    board.byId.forEach((group, id) => {
        wipe(group);
        const world = new THREE.Matrix4().makeTranslation(0, DIM.pcbY, 0).multiply(new THREE.Matrix4().compose(group.position, group.quaternion, group.scale));
        if (nodes.has(id)) fill(group, world, nodes.get(id));
    });
}

app.scene.blenderModel = { useBlenderModel };
})();
