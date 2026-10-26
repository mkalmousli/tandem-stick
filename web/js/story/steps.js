// The seven steps of the walkthrough. Each one says what is visible, where the camera goes and how things move at time t.
(() => {
    const { COLOR, PLUG_TIP, HOST_X } = app.story.stage;

    const clamp01 = (value) => Math.min(1, Math.max(0, value));
    const ease = (t, from, to) => { const k = clamp01((t - from) / (to - from)); return k * k * (3 - 2 * k); };
    const SLIDE_IN = 7;
    const HERO_SCALE = 2;
    const STAGGER = 0.7;
    const BLINK_HZ = 2;
    const UPDATE_SECONDS = 6;

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
                s.hero.group.position.set(0, 0.5, 0);
                s.hero.group.rotation.y = 0.7 + t * 0.4;
                s.hero.setLidLift(ease(t, 1, 3) * 1.4);
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
                const away = SLIDE_IN * (1 - ease(t, 0.3, 2.2));
                plug(s.host.stick, s.host.device, s, away);
                s.host.stick.setLed(t > 2.2 ? COLOR.led.blue : COLOR.led.off);
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
                plugRight(s.host.blank, s.host.device, s, SLIDE_IN * (1 - ease(t, 0.3, 2)));
                const stage = t < 2.4 ? COLOR.led.red : t < 4 ? (Math.floor(now * 6) % 2 ? COLOR.led.blue : COLOR.led.off) : COLOR.led.green;
                s.host.blank.setLed(stage);
                s.rings[0].userData.at = t > 2.4 && t < 4 ? (t - 2.4) / 1.6 : -1;
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
                    const k = ease(t, 0.4 + idx * STAGGER, 2.2 + idx * STAGGER);
                    plug(slot.stick, slot.device, s, SLIDE_IN * (1 - k));
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
            pose(s) { steady(s); },
            tags: (s) => [["You type here", above(s.host.device.group, 6.6)], [s.targets[0].name, above(s.targets[0].device.group, 6.4)]],
        },
        {
            id: "many", title: "Many machines at once", interact: true,
            text: (scn) => `Send to all of them at once. ${scn.result} Up to about 20 targets per host, and you can still aim at just one.`,
            camera: { pos: [HOST_X + 15, 11, 27], look: [HOST_X + 15, 1.5, 0] },
            show: { host: true, targets: true },
            live: [0, 1, 2],
            demoAt: 1.6, demoTargets: "all",
            pose(s) { steady(s); },
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
                    const done = clamp01((t - 0.5 - idx * 0.8) / (UPDATE_SECONDS / 2));
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
