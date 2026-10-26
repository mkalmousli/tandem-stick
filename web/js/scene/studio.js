// Shared studio for every 3D view: soft-box reflections, key light with shadow, and a ground that only shows shadows.
(() => {
    const MAX_RATIO = 1.5;
    const LIGHT = { hemi: 0.6, key: 2.2, keyPos: [30, 70, 45], shadow: 2048, shadowRange: 140 };

    function buildEnvironment(renderer) {
        const studio = new THREE.Scene();
        studio.background = new THREE.Color(0.16, 0.16, 0.18);
        const softbox = (w, h, pos, power) => {
            const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(power, power, power), side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            mesh.position.set(...pos);
            mesh.lookAt(0, 0, 0);
            studio.add(mesh);
        };
        softbox(10, 6, [0, 8, 6], 6);
        softbox(6, 10, [-9, 2, 0], 3);
        softbox(6, 10, [9, 2, -3], 2.5);
        softbox(14, 4, [0, -4, 8], 1.2);
        const pmrem = new THREE.PMREMGenerator(renderer);
        const texture = pmrem.fromScene(studio, 0.04).texture;
        return { texture, pmrem };
    }

    function buildLights(scene, range = LIGHT.shadowRange) {
        scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, LIGHT.hemi));
        const key = new THREE.DirectionalLight(0xffffff, LIGHT.key);
        key.position.set(...LIGHT.keyPos);
        key.castShadow = true;
        key.shadow.mapSize.set(LIGHT.shadow, LIGHT.shadow);
        Object.assign(key.shadow.camera, { left: -range, right: range, top: range, bottom: -range, near: 1, far: 600 });
        key.shadow.bias = -0.0005;
        scene.add(key);
    }

    function buildGround(scene) {
        const mat = new THREE.ShadowMaterial();
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.05;
        ground.receiveShadow = true;
        scene.add(ground);
        return mat;
    }

    app.scene.studio = { buildEnvironment, buildLights, buildGround, MAX_RATIO };
})();
