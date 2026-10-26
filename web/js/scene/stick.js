// The real stick for the story stage: the same tray, board and lid as the explorer (Blender model), scaled to the stage.
(() => {
    const { DIM } = app.data;
    const { mats } = app.scene.materials;
    const { buildTray, buildLid } = app.scene.enclosure;
    const { buildBoard } = app.scene.board;
    const { useBlenderModel } = app.scene.blenderModel;

    // `tipReach` is where the plug tip must end up, measured from the stick's centre in stage units.
    const templates = new Map();

    // The first stick is built from the model; every other one is a copy that shares its geometry and only owns its LED lens.
    function buildRealStick(tipReach) {
        const model = app.assets && app.assets.model;
        if (!model) return null;
        if (!templates.has(tipReach)) templates.set(tipReach, buildFresh(model, tipReach));
        return copyStick(templates.get(tipReach));
    }

    function copyStick(source) {
        const group = source.group.clone(true);
        const lens = [];
        let lid = null;
        group.traverse((obj) => {
            if (obj.userData.stickLid) lid = obj;
            if (obj.isMesh && obj.material.userData.lens) { obj.material = obj.material.clone(); lens.push(obj.material); }
        });
        const { scale } = source;
        return { group, led: source.led, scale, setLed: (color) => lens.forEach((mat) => mat.color.set(color)), setLidLift: (amount) => { lid.position.y = DIM.wallTop + amount / scale; } };
    }

    function buildFresh(model, tipReach) {
        const tray = buildTray(), board = buildBoard(), lid = buildLid();
        useBlenderModel(model, { tray, board, lid });
        board.group.position.y = DIM.pcbY;
        lid.group.position.y = DIM.wallTop;
        const inner = new THREE.Group();
        inner.add(tray, board.group, lid.group);
        const scale = tipReach / new THREE.Box3().setFromObject(inner).max.x;
        inner.scale.setScalar(scale);
        inner.position.y = -DIM.plugY * scale;
        // Own copies, so the explorer's see-through lid and LED colours never leak into the stage.
        lid.group.traverse((obj) => { if (obj.isMesh) { obj.material = obj.material.clone(); obj.material.opacity = 1; obj.userData.ghost = false; } });
        const lens = [];
        board.byId.get("led").traverse((obj) => { if (obj.isMesh && obj.material === mats.flow) { obj.material = mats.flow.clone(); obj.material.userData.lens = true; lens.push(obj.material); } });
        lid.group.userData.stickLid = true;
        inner.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
        const group = new THREE.Group().add(inner);
        const led = board.anchors.get("led").clone().setY(DIM.pcbTop + 1).multiplyScalar(scale).add(inner.position);
        return {
            group, led, scale,
            setLed: (color) => lens.forEach((mat) => mat.color.set(color)),
            setLidLift: (amount) => { lid.group.position.y = DIM.wallTop + amount / scale; },
        };
    }

    app.scene.stick = { buildRealStick };
})();
