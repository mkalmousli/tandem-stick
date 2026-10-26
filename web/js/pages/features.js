// Home: what the stick does, one feature at a time next to a single 3D view (simple scenes for the device roles, the real model for the hardware).
(() => {
    const { live3d } = app.ui.live3d;

    // `scene` shows a simple looping scene; `ids` shows those parts of the real model (null = all).
    const FEATURES = [
        { name: "A keyboard", scene: "keyboard", text: "Each stick shows up as an ordinary USB keyboard. What you type on the host is typed on every paired computer, including in a BIOS or boot menu." },
        { name: "A mouse", scene: "mouse", text: "Move and click once. The pointer moves and clicks on every paired machine at the same time." },
        { name: "A microphone", scene: "microphone", text: "The stick can present itself as a USB microphone, so a machine can take sound from the host side without extra cables." },
        { name: "A speaker", scene: "speaker", text: "It can also present itself as a USB speaker, so sound from a machine can be played out on the host side." },
        { name: "All in one", ids: null, view: { theta: 0.7, phi: 1.05, radius: 95 }, text: "Lid, board and case in one small stick. The USB-A plug is the only connector. Nothing to install on the computer it is plugged into." },
        { name: "Radio, no cables", ids: ["pcb"], view: { theta: 0.3, phi: 0.5, radius: 95, y: 3 }, text: "The board carries an ESP32-S3 radio. One host stick talks to the others over encrypted radio, so a keystroke typed once reaches every paired stick." },
        { name: "Reliable delivery", scene: "pair", text: "The radio layer acknowledges what it receives and resends what was lost, so a keystroke is not silently dropped on the way to a stick." },
        { name: "Plain USB-A", ids: ["p-plug"], view: { theta: 1.1, phi: 1.15, radius: 70, x: 14, y: 6 }, text: "Each stick plugs into any machine with a USB port. There is nothing to install on it." },
        { name: "Printable case", ids: ["case-tray", "case-lid"], view: { theta: 0.8, phi: 0.95, radius: 110, y: 3 }, text: "A two-part snap-fit case you can print at home. The lid carries the Tandem mark and a small window for the status light." },
    ];

    function features() {
        return app.ui.sections.stickySections(FEATURES, (art, narrow) => {
            const ratio = narrow ? 0.55 : 0.8;
            let real = null, mini = null, at = 0;
            const apply = () => {
                if (!mini) return;
                const item = FEATURES[at];
                mini.wrap.style.display = item.scene ? "" : "none";
                if (real) real.style.display = item.scene ? "none" : "";
                if (item.scene) mini.show(app.scene.miniScenes.SCENES[item.scene]);
                else if (real) real.setParts(item.ids, item.view);
            };
            app.need("three").then(() => {
                mini = app.scene.mini.createMini(art, { ratio });
                apply();
                live3d(art, { ratio, spin: 0.5, view: FEATURES[4].view, interactive: false, label: "The Tandem Stick turning in 3D" }).then((wrap) => { real = wrap; apply(); });
            });
            const show = (idx) => { at = idx; apply(); };
            show.layout = (now) => { const r = String(now ? 1 / 0.55 : 1 / 0.8); if (mini) mini.wrap.style.aspectRatio = r; if (real) real.style.aspectRatio = r; };
            return show;
        });
    }

    app.pages.features = { features };
})();
