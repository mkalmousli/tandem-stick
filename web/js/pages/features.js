// Home: what the stick does, one feature at a time next to a single 3D view (simple scenes for the device roles, the real model for the hardware).
(() => {
    const { live3d } = app.ui.live3d;

    // `scene` shows a simple looping scene; `ids` shows those parts of the real model (null = all).
    const FEATURES = [
        { name: "Works in the BIOS", scene: "keyboard", text: "Real USB hardware, like a KVM.", points: [["#2f9e6b", "BIOS and boot menus"], ["#4f86f7", "Installers and recovery"], ["#e0a01a", "Locked-down PCs"]] },
        { name: "Automate it", scene: "mouse", text: "Run it by hand, or let a script do the work.", points: [["#4f86f7", "Script keys and clicks from your PC"], ["#2f9e6b", "Automatic installs of Windows or Linux"], ["#a06cf0", "AI agents can drive it too"], ["#e0a01a", "Nothing to install on the other PC"]] },
        { name: "One, many or all", scene: "fleet", text: "Control one PC, a group, or all of them at once. Planned: the firmware is not written yet." },
        { name: "No cables", ids: ["pcb"], view: { theta: 0.3, phi: 0.5, radius: 95, y: 3 }, text: "The sticks talk by encrypted radio. No Wi-Fi or router. No wires across the room." },
        { name: "Never drops a key", scene: "pair", text: "Each key is confirmed and resent if lost. What you type is what arrives." },
        { name: "A USB forwarder", scene: "microphone", text: "It passes USB between PCs over radio, not just keys.", points: [["#2f9e6b", "Keyboard, mouse, drive"], ["#4f86f7", "Serial, network, audio"], ["#e0a01a", "Screen over HDMI: an idea, very slow"]] },
        { name: "Print the case", ids: ["case-tray", "case-lid"], view: { theta: 0.8, phi: 0.95, radius: 110, y: 3 }, text: "A snap-fit case you can print at home. Small and yellow, with one light for status." },
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
