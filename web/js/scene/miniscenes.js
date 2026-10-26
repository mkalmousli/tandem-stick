// Simple looping scenes for the home page: boxes only, each one a few seconds long.
(() => {
    const { box, stick, laptop, monitor, ball, COLOR } = app.scene.mini;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const smooth = (v) => { const k = clamp(v); return k * k * (3 - 2 * k); };
    const spin = (group, t) => { group.rotation.y = Math.sin(t * 0.5) * 0.35; };
    const ring = () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 8, 48), new THREE.MeshBasicMaterial({ color: COLOR.led, transparent: true })); m.rotation.x = Math.PI / 2; return m; };

    // Lid, board and case come together and fall apart again.
    function build() {
        const group = new THREE.Group();
        const tray = box(group, 9, 1.4, 4.4, COLOR.tray, 0, 0.7);
        const board = box(group, 7.6, 0.3, 3.4, COLOR.board);
        const lid = box(group, 9, 0.6, 4.4, COLOR.stick);
        box(board, 2.4, 0.5, 2, 0x222a33, 0.5, 0.35);
        box(group, 3, 0.7, 2.6, COLOR.plug, 5.8, 0.9);
        group.scale.setScalar(1.5);
        return { group, update(t) { const k = 0.5 + 0.5 * Math.cos(t * 1.5); board.position.y = 1.5 + 4 * k; lid.position.y = 2.1 + 9 * k; group.rotation.y = 0.5 + t * 0.4; tray.position.y = 0.7; } };
    }

    // A stick slides into a laptop and lights up.
    function host() {
        const group = new THREE.Group();
        const pc = laptop();
        pc.group.position.x = 12;
        const s = stick();
        group.add(pc.group, s.group);
        return { group, update(t) { const tm = t % 4, k = smooth(tm / 1.8); s.group.position.set(-16 + 12 * k, 1.8, 1); s.setLed(k >= 1 ? 0x4aa8ff : 0x222222); pc.screen.material.color.set(k >= 1 ? 0x2d6cdf : 0x1a2230); spin(group, t); } };
    }

    // The host stick pairs a new stick: a radio ring leaves the host and the new stick turns green.
    function pair() {
        const group = new THREE.Group();
        const a = stick(), b = stick();
        a.group.position.set(-11, 1, 0);
        b.group.position.set(11, 1, 0);
        a.setLed(0x4aa8ff);
        const rings = [ring(), ring()];
        rings.forEach((r) => { r.position.set(-11, 2.5, 0); group.add(r); });
        group.add(a.group, b.group);
        return { group, update(t) {
            const tm = t % 3.6;
            rings.forEach((r, i) => { const u = clamp((tm - 0.2 - i * 0.5) / 1.8); r.visible = u > 0 && u < 1; r.scale.setScalar(1 + u * 22); r.material.opacity = 1 - u; });
            b.setLed(tm > 2.2 ? COLOR.led : 0x222222);
        } };
    }

    // Host laptop and three targets. `look(target, count, fill, idx, tm)` says how each target shows what arrived.
    const fleet = (device, look) => () => {
        const group = new THREE.Group();
        const pc = laptop(0x1a2230);
        pc.group.position.x = -26;
        const typed = box(pc.screen, 8, 0.8, 0.1, 0xffffff, 0, 0, 0.25);
        group.add(pc.group);
        const hostStick = stick();
        hostStick.group.position.set(-26, 2.5, 6);
        hostStick.group.scale.setScalar(0.55);
        hostStick.setLed(0x4aa8ff);
        group.add(hostStick.group);
        const targets = [-8, 9, 26].map((x) => {
            const dev = device();
            dev.group.position.x = x;
            const bar = box(dev.screen, 6, 0.7, 0.1, 0xffffff, 0, 0, 0.3);
            return { dev, bar, ball: ball(group), x };
        });
        targets.forEach((tg) => group.add(tg.dev.group));
        targets.forEach((tg) => { const s = stick(); s.group.position.set(tg.x, 2.5, 6); s.group.scale.setScalar(0.55); s.setLed(COLOR.led); group.add(s.group); });
        group.scale.setScalar(0.62);
        return { group, update(t) {
            const tm = t % 3.4, round = Math.floor(t / 3.4);
            typed.scale.x = tm < 0.5 ? 0.3 + 0.7 * Math.abs(Math.sin(t * 9)) : 1;
            targets.forEach((tg, i) => {
                const u = clamp((tm - 0.5 - i * 0.2) / 0.8);
                tg.ball.visible = u > 0 && u < 1;
                tg.ball.position.set(-26 + (tg.x + 26) * u, 3 + Math.sin(u * Math.PI) * 3, 6);
                const got = u >= 1 ? 1 : 0;
                look(tg, round + got, clamp((tm - 1.5 - i * 0.2) / 1.2), i, tm - 1.5 - i * 0.2);
            });
            spin(group, t);
        } };
    };

    const PAL = [0x2d6cdf, 0xe85d2a, 0x2f8f5b, 0x8a4fd6];
    const set = (tg, color, fill, barColor = 0xffffff) => { tg.dev.screen.material.color.set(color); tg.bar.scale.x = fill; tg.bar.material.color.set(barColor); };
    const SCENES = {
        build, host, pair, fleet: fleet(monitor, (tg, n, k) => set(tg, PAL[n % 4], 0)),
        present: fleet(monitor, (tg, n) => set(tg, PAL[n % 4], 0.6)),
        admin: fleet(laptop, (tg, n, k) => set(tg, 0x10161c, n ? k : 0.01, COLOR.led)),
        kiosk: fleet(monitor, (tg, n) => set(tg, n % 2 ? 0xe85d2a : 0x2d6cdf, 0.01)),
        qa: fleet(laptop, (tg, n, k, i, since) => set(tg, since > 0 && since < 0.4 ? 0x66e0ff : 0x273244, n ? 1 : 0.01, COLOR.led)),
        home: fleet(monitor, (tg, n, k, i, since) => set(tg, since > 0 && since < 0.6 ? 0xffffff : [0x2d6cdf, 0x2f8f5b, 0x8a4fd6][i], 0.01)),
        install: fleet(monitor, (tg, n, k) => set(tg, n ? 0x1b4fb8 : 0x10161c, n ? k : 0.01, 0xffffff)),
        office: fleet(monitor, (tg, n, k) => set(tg, 0xfff1c4, n ? k : 0.01, 0x2d6cdf)),
    };

    app.scene.miniScenes = { SCENES };
})();
