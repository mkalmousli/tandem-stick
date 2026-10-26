// Simple looping scenes for what the stick does as a device: keyboard, mouse, microphone, speaker. Boxes only.
(() => {
    const { box, stick, COLOR } = app.scene.mini;
    const wave = () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 48), new THREE.MeshBasicMaterial({ color: COLOR.led, transparent: true })); m.rotation.y = Math.PI / 2; return m; };
    // Rings leaving `from` and growing; `count` of them chase each other every `period` seconds.
    const waves = (group, x, y, count = 3) => Array.from({ length: count }, () => { const w = wave(); w.position.set(x, y, 0); group.add(w); return w; });
    const pulse = (list, t, dir = 1, period = 2.4) => list.forEach((w, i) => { const u = ((t / period) + i / list.length) % 1; w.scale.setScalar(0.6 + u * 5); w.position.x = (w.userData.x0 ??= w.position.x) + dir * u * 7; w.material.opacity = 1 - u; });
    const hostStick = (group) => { const s = stick(); s.group.position.set(-14, 1, 0); s.setLed(COLOR.led); group.add(s.group); return s; };

    function keyboard() {
        const group = new THREE.Group();
        box(group, 25, 1, 11, 0x2b3340, 0, 0.5);
        const keys = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) keys.push(box(group, 2.2, 0.8, 2.2, 0xe8ecf2, -8.75 + c * 2.5 + (r % 2) * 0.6, 1.3, -3.6 + r * 2.6));
        box(group, 10, 0.8, 2.2, 0xe8ecf2, 0, 1.3, 3.6);
        const s = stick(); s.group.position.set(-19, 1, 0); s.setLed(COLOR.led); group.add(s.group);
        group.scale.setScalar(0.8);
        return { group, update(t) { const hit = Math.floor(t * 6) % keys.length; keys.forEach((k, i) => { k.position.y = i === hit ? 0.8 : 1.3; k.material.color.set(i === hit ? COLOR.stick : 0xe8ecf2); }); group.rotation.y = -0.35; } };
    }

    function mouse() {
        const group = new THREE.Group();
        box(group, 14, 0.3, 10, 0x2b3340, 6, 0.15);
        const body = box(group, 3, 1.4, 4.4, 0xe8ecf2, 6, 1);
        const button = box(body, 1.3, 0.3, 1.6, COLOR.stick, 0, 0.8, -1.2);
        const screen = box(group, 12, 7, 0.4, 0x1a2230, 6, 6, -7);
        const cursor = box(screen, 0.9, 0.9, 0.2, COLOR.stick, 0, 0, 0.3);
        hostStick(group);
        return { group, update(t) { const x = Math.cos(t * 1.8), z = Math.sin(t * 1.8); body.position.set(6 + x * 3.5, 1, z * 2.2); cursor.position.set(x * 4.5, z * 2.2, 0.3); button.position.y = Math.sin(t * 7) > 0.8 ? 0.55 : 0.8; screen.material.color.set(Math.sin(t * 7) > 0.8 ? 0x2d6cdf : 0x1a2230); group.rotation.y = -0.3; } };
    }

    function microphone() {
        const group = new THREE.Group();
        box(group, 2, 0.4, 2, 0x2b3340, -4, 0.2);
        box(group, 0.5, 5, 0.5, 0x2b3340, -4, 2.7);
        const head = box(group, 2, 2.6, 2, 0xe8ecf2, -4, 6.2);
        const rings = waves(group, -1, 6.2);
        const s = stick(); s.group.position.set(13, 1, 0); s.setLed(COLOR.led); group.add(s.group);
        return { group, update(t) { pulse(rings, t); head.scale.setScalar(1 + 0.05 * Math.sin(t * 14)); group.rotation.y = -0.3; } };
    }

    function speaker() {
        const group = new THREE.Group();
        const s = stick(); s.group.position.set(-13, 1, 0); s.setLed(COLOR.led); group.add(s.group);
        box(group, 7, 10, 6, 0x2b3340, 1, 5);
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.6, 24), new THREE.MeshStandardMaterial({ color: 0xe8ecf2 }));
        cone.rotation.z = Math.PI / 2; cone.position.set(4.7, 3.4, 0); group.add(cone);
        const rings = waves(group, 5.5, 3.4);
        return { group, update(t) { pulse(rings, t); cone.scale.set(1 + 0.15 * Math.sin(t * 16), 1, 1); group.rotation.y = -0.3; } };
    }

    Object.assign(app.scene.miniScenes.SCENES, { keyboard, mouse, microphone, speaker });
})();
