(() => {
// Assembles the product and drives the exploded view.
const { mats } = app.scene.materials;
const { DIM } = app.data;
const { buildTray, buildLid } = app.scene.enclosure;
const { buildBoard } = app.scene.board;
const { buildFlow } = app.scene.flow;
const { buildFleet } = app.scene.fleet;

const EXPLODE = { board: 8, lid: 20 };
const GHOST_OPACITY = 0.3;
const GHOST_START = 0.15;
const GHOST_SPAN = 0.6;
const BASE_FOCUS_Y = 3.6;
const FOCUS_RISE = 7;

const smooth = (k) => Math.min(1, Math.max(0, k));

const focusY = (explode) => BASE_FOCUS_Y + FOCUS_RISE * explode;

function buildModel() {
    const root = new THREE.Group();
    const tray = buildTray();
    const board = buildBoard();
    const lid = buildLid();
    const flow = buildFlow();
    board.group.add(flow.group);
    tray.userData.id = "case-tray";
    board.group.userData.id = "pcb";
    lid.group.userData.id = "case-lid";
    root.add(tray, board.group, lid.group);

    // A closed copy of the stick: shell, lid and plug, no board.
    const makeStick = () => {
        const copy = new THREE.Group();
        const cover = lid.group.clone(true);
        cover.position.y = DIM.wallTop;
        const plug = board.byId.get("p-plug").clone(true);
        plug.position.copy(board.anchors.get("p-plug")).y += DIM.pcbY;
        copy.add(tray.clone(true), cover, plug);
        return copy;
    };
    const fleet = buildFleet(makeStick);
    root.add(fleet.group);

    const byId = new Map(board.byId);
    byId.set("case-tray", tray);
    byId.set("pcb", board.group);
    byId.set("case-lid", lid.group);
    const pickables = [...byId.values()];

    function setExplode(amount) {
        board.group.position.y = DIM.pcbY + EXPLODE.board * amount;
        lid.group.position.y = DIM.wallTop + EXPLODE.lid * amount;
        const opacity = 1 - (1 - GHOST_OPACITY) * smooth((amount - GHOST_START) / GHOST_SPAN);
        mats.lid.opacity = opacity;
    }

    // World position of an item's centre when the model is exploded by `amount`.
    function anchor(id, amount) {
        if (id === "case-lid") return new THREE.Vector3(0, DIM.wallTop + EXPLODE.lid * amount, 0);
        if (id === "pcb") return new THREE.Vector3(0, DIM.pcbY + EXPLODE.board * amount, 0);
        if (id === "case-tray") return new THREE.Vector3(0, 3, 0);
        const local = board.anchors.get(id);
        if (!local) return new THREE.Vector3(0, focusY(amount), 0);
        return local.clone().add(new THREE.Vector3(0, DIM.pcbY + EXPLODE.board * amount, 0));
    }

    // Show only the selected part (and what belongs to it) while isolating.
    const within = (obj, id) => { for (; obj; obj = obj.parent) if (obj.userData.id === id) return true; return false; };
    function isolate(id) {
        root.traverse((obj) => {
            if (!obj.isMesh || fleet.group.getObjectById(obj.id)) return;
            obj.visible = !id || within(obj, id);
        });
        flow.refresh();
    }

    function refresh() {
        flow.refresh();
        fleet.refresh();
    }

    root.traverse((obj) => {
        if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
        }
    });
    return { root, byId, pickables, isolate, setExplode, anchor, refresh, update: (seconds) => { flow.update(seconds); fleet.update(seconds); } };
}


app.scene.model = { focusY, buildModel };
})();
