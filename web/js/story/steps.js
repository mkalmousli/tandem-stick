// The seven steps of the walkthrough. Each one says what is visible, where the camera goes and how things move at time t.
(() => {
    const { COLOR, PLUG_TIP, HOST_X } = app.story.stage;

    const clamp01 = (value) => Math.min(1, Math.max(0, value));
    const ease = (t, from, to) => { const k = clamp01((t - from) / (to - from)); return k * k * (3 - 2 * k); };
    const back = (t, from, to) => { const k = clamp01((t - from) / (to - from)); const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
    const SLIDE_IN = 5;
    const LIFT = 4;
    const STAGGER_FAST = 0.45;
    const HERO_SCALE = 2;
        const BLINK_HZ = 2;
    const UPDATE_SECONDS = 4;

    const portOf = (s, device) => s.portWorld(device);

    // Rest the stick's plug tip on a device's port; `away` pulls it back along the stick for slide-in motion.
    function plug(stick, device, s, away = 0) {
        const tip = portOf(s, device);
        stick.group.position.set(tip.x - PLUG_TIP - away, tip.y, tip.z);
        stick.group.rotation.y = 0;
    }

    function plugRight(stick, device, s, away = 0) {
        const tip = portOf(s, device);
        stick.group.position.set(device.group.position.x + device.width / 2 + PLUG_TIP + away, tip.y, tip.z);
        stick.group.rotation.y = Math.PI;
    }

    // Approach in two beats so a stick never passes through a machine: come down first (arc height `lift`, depth `swing`),
    // then slide straight into the port, with a small bounce at the end. `k` runs 0 to 1.
    function dock(stick, place, k, { lift = LIFT, swing = 2, roll = 0 } = {}) {
        const down = clamp01(k / 0.55);
        const slide = clamp01((k - 0.45) / 0.55);
        const fall = 1 - down * down * (3 - 2 * down);
        const glide = 1 - (1 + 2.2 * Math.pow(slide - 1, 3) + 1.2 * Math.pow(slide - 1, 2));
        stick.group.position.y += fall * lift;
        stick.group.position.z += fall * swing;
        stick.group.position.x -= glide * SLIDE_IN * (place === plug ? 1 : -1);
        stick.group.rotation.z = fall * roll;
    }

    function show(s, { hero = false, host = false, blank = false, targets = false }) {
        s.hero.group.visible = hero;
        s.host.device.group.visible = host;
        s.host.stick.group.visible = host;
        s.host.blank.group.visible = blank;
        s.targets.forEach((slot) => {
            slot.device.group.visible = targets;
            slot.stick.group.visible = targets;
        });
        s.links.forEach((link) => { link.visible = targets && host; });
    }

    const blink = (now) => (Math.floor(now * BLINK_HZ) % 2 ? COLOR.led.white : COLOR.led.off);
    const above = (obj, dy) => (out) => obj.getWorldPosition(out).setY(dy);

    // ---- one object per step -------------------------------------------------
    const STEPS = [
        {
            id: "meet", title: "Meet the stick",
            text: () => "A USB-A plug on a tiny board in a printed case. No buttons, no screen: one LED tells you what it is doing. The same stick works for you and for every machine you want to control.",
            camera: { pos: [0, 7, 18], look: [0, 0.5, 0] },
            show: { hero: true },
            pose(s, t, now) {
                s.hero.group.scale.setScalar(HERO_SCALE);
                s.hero.group.position.set(0, 0.5 + Math.sin(now * 1.4) * 0.18, 0);
                s.hero.group.rotation.z = Math.sin(now * 0.9) * 0.05;
                s.hero.group.rotation.y = 0.7 + t * 0.4;
                s.hero.setLidLift(back(t, 0.6, 2) * 1.4);
                s.hero.setLed(blink(now));
            },
            tags: (s) => [
                ["USB-A plug", (out) => s.hero.group.localToWorld(out.set(3.4, 0.3, 0))],
                ["Radio and brain", (out) => s.hero.group.localToWorld(out.set(-0.3, 1.1, 0))],
                ["One LED", (out) => s.hero.group.localToWorld(out.set(-1.3, 1.9, 0.4))],
            ],
        },
        {
            id: "host", title: "Plug one into your computer",
            text: (scn) => `This stick becomes the host. Plug it into the computer you sit at. ${scn.hostDoes} No driver, no app: the computer sees a normal USB device.`,
            camera: { pos: [HOST_X - 2, 7, 17], look: [HOST_X - 2, 1.8, 0] },
            show: { host: true },
            pose(s, t) {
                plug(s.host.stick, s.host.device, s);
                dock(s.host.stick, plug, clamp01((t - 0.2) / 1.6), { roll: 0.5 });
                const boot = t - 1.8;
                s.host.stick.setLed(boot < 0 ? COLOR.led.off : boot < 0.3 ? COLOR.led.white : COLOR.led.blue);
            },
            tags: (s) => [["Your computer", above(s.host.device.group, 6.6)], ["Host stick (blue)", above(s.host.stick.group, 2.2)]],
        },
        {
            id: "pair", title: "Pair a blank stick",
            text: () => "A new stick is blank (red). Plug it into your computer next to the host for a moment: the host gives it the fleet key over USB, and it turns green. Pairing never happens over the air.",
            camera: { pos: [HOST_X, 7, 18], look: [HOST_X, 1.8, 0] },
            show: { host: true, blank: true },
            pose(s, t, now) {
                plug(s.host.stick, s.host.device, s);
                s.host.stick.setLed(COLOR.led.blue);
                plugRight(s.host.blank, s.host.device, s);
                dock(s.host.blank, plugRight, clamp01((t - 0.2) / 1.4), { lift: 2.5, swing: -2.5, roll: -0.6 });
                const stage = t < 1.8 ? COLOR.led.red : t < 3.2 ? (Math.floor(now * 8) % 2 ? COLOR.led.blue : COLOR.led.off) : COLOR.led.green;
                s.host.blank.setLed(stage);
                s.rings[0].userData.at = t > 1.8 && t < 3.2 ? (t - 1.8) / 1.4 : -1;
                s.rings[0].userData.from = s.host.stick.group;
            },
            tags: (s) => [["Host stick", above(s.host.stick.group, 2.2)], ["New stick: gets the key", above(s.host.blank.group, 2.2)]],
        },
        {
            id: "targets", title: "Plug one into each target",
            text: (scn) => `Put a paired stick into every machine you want to control (${scn.targets.join(", ")}). Each one lights green and joins by radio within a second or two. Nothing is installed on those machines.`,
            camera: { pos: [HOST_X + 15, 11, 27], look: [HOST_X + 15, 1.5, 0] },
            show: { host: true, targets: true },
            live: [],
            pose(s, t) {
                plug(s.host.stick, s.host.device, s);
                s.host.stick.setLed(COLOR.led.blue);
                s.targets.forEach((slot, idx) => {
                    const k = clamp01((t - 0.2 - idx * STAGGER_FAST) / 1.2);
                    plug(slot.stick, slot.device, s);
                    dock(slot.stick, plug, k, { lift: 6, swing: 0, roll: 0 });
                    slot.stick.setLed(k >= 1 ? COLOR.led.green : COLOR.led.off);
                });
            },
            tags: (s) => s.targets.map((slot) => [slot.name, above(slot.device.group, 6.4)]),
        },
        {
            id: "type", title: "Type once", interact: true,
            text: (scn) => `${scn.hostDoes} The host stick sends it by radio, encrypted. The target's stick turns it into real USB input, so the machine behaves as if someone typed on it.`,
            camera: { pos: [HOST_X + 12, 9, 24], look: [HOST_X + 12, 1.8, 0] },
            show: { host: true, targets: true },
            live: [0],
            demoAt: 1.6, demoTargets: "first",
            pose(s, t, now) {
                steady(s);
                s.host.stick.group.position.y += Math.max(0, Math.sin(now * 5)) * 0.12;
            },
            tags: (s) => [["You type here", above(s.host.device.group, 6.6)], [s.targets[0].name, above(s.targets[0].device.group, 6.4)]],
        },
        {
            id: "many", title: "Many machines at once", interact: true,
            text: (scn) => `Send to all of them at once. ${scn.result} Up to about 20 targets per host, and you can still aim at just one.`,
            camera: { pos: [HOST_X + 15, 11, 27], look: [HOST_X + 15, 1.5, 0] },
            show: { host: true, targets: true },
            live: [0, 1, 2],
            demoAt: 1.6, demoTargets: "all",
            pose(s, t, now) {
                steady(s);
                s.targets.forEach((slot, idx) => { slot.stick.group.position.y += Math.max(0, Math.sin(now * 4 - idx * 1.1)) * 0.18; });
            },
            tags: (s) => s.targets.map((slot) => [slot.name, above(slot.device.group, 6.4)]),
        },
        {
            id: "update", title: "Updates over the air",
            text: () => "New firmware goes out over the radio from the host stick, one stick after another. No walking round with a laptop. Updates are signed, so a stick only accepts firmware from you.",
            camera: { pos: [HOST_X + 15, 11, 27], look: [HOST_X + 15, 1.5, 0] },
            show: { host: true, targets: true },
            live: [0, 1, 2],
            pose(s, t, now) {
                steady(s);
                const violet = Math.floor(now * 3) % 2 ? COLOR.led.violet : COLOR.led.off;
                s.targets.forEach((slot, idx) => {
                    const done = clamp01((t - 0.3 - idx * 0.5) / (UPDATE_SECONDS / 2));
                    slot.stick.setLed(done >= 1 ? COLOR.led.green : violet);
                    slot.progress = done;
                });
            },
            tags: (s) => s.targets.map((slot) => [slot.name, above(slot.device.group, 6.4)]),
            tagText: (s, idx) => (s.targets[idx].progress >= 1 ? `${s.targets[idx].name}: v1.1 ✓` : `${s.targets[idx].name}: updating ${Math.round((s.targets[idx].progress || 0) * 100)}%`),
        },
    ];

    // Everything plugged in and green: the resting state for the last three steps.
    function steady(s) {
        plug(s.host.stick, s.host.device, s);
        s.host.stick.setLed(COLOR.led.blue);
        s.targets.forEach((slot) => {
            plug(slot.stick, slot.device, s);
            slot.stick.setLed(COLOR.led.green);
        });
    }

    app.story.steps = { STEPS, show };
})();
