// Build tab: a follow-along for making a stick, plus a bench test that needs only one stick and a computer.
(() => {
    const { add } = app.dom;
    const { state, setState, emit } = app.ex;
    const { SPACE, FONT } = app.styles;
    const { para, heading, label, list } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row } = app.ui.layout;
    const { callout } = app.ui.card;
    const { DOCS } = app.content;

    // [title, what to do, part to show on the model, exploded?]
    const FULL = [
        ["Check the files", "Open the board in KiCad and look at the Gerbers in your fab's viewer. Compare with the 3D model here.", "pcb", 1],
        ["Order the board", "Upload tandem-gerbers.zip. Pick 4 layers, 1.6 mm, and order the minimum quantity first.", "pcb", 1],
        ["Order the parts", "Use the parts list in the Guide, plus a few spare passives.", "esp", 1],
        ["Print the case", "Tray and lid in PETG, no supports. Test-fit the lid before you solder anything.", "case-tray", 1],
        ["Solder the small parts", "Regulator, LED and passives first, then the ESP32 module.", "pwr", 1],
        ["Check the USB tab", "The plug is the bare end of the board. Make sure the gold pads are clean and the edge is not chipped.", "p-plug", 1],
        ["Look it over", "Under magnification check for bridges. With a multimeter confirm 3V3 and 5 V are not shorted to GND.", "pcb", 1],
        ["Close the case", "Board into the tray on its ribs, plug through the slot, lid snaps on.", "case-lid", 0],
    ];
    const BENCH = [
        ["Plug in", "No target machine needed. Plug one finished stick into a powered USB hub or a spare port on your computer.", "p-plug", 0],
        ["Look at the LED", "The status LED should light or blink within a second or two. If nothing happens, unplug at once and re-check 5 V and 3V3 for shorts.", "led", 0],
        ["See it on your computer", "A new USB serial device should appear (Linux: ls /dev/ttyACM*, Windows: Device Manager, macOS: ls /dev/cu.usb*). That proves power, USB data lines and the module all work.", "esp", 1],
        ["Flash the firmware", "Firmware is not released yet. When it is, you will flash it over this same USB connection with esptool, no target needed.", "esp", 1],
        ["Pair two sticks", "Plug a second stick into another port of the same computer. Make one the host and one the target, and watch the target's LED react to commands from the host.", "led", 0],
    ];
    const SETS = { full: FULL, bench: BENCH };
    const KINDS = [["full", "Full build"], ["bench", "Bench test, no machine"]];

    function show(step) {
        const [, , part, open] = step;
        setState({ explode: open, selected: part });
        emit("focus", part);
    }

    function go(idx) {
        const steps = SETS[state.buildMode];
        const at = Math.max(0, Math.min(steps.length - 1, idx));
        setState({ build: at });
        show(steps[at]);
    }

    function buildView() {
        const steps = SETS[state.buildMode];
        const at = Math.min(state.build, steps.length - 1);
        const [title, text] = steps[at];
        const kinds = row(SPACE.sm);
        KINDS.forEach(([id, name]) => add(kinds, button({ label: name, kind: "tab", pressed: state.buildMode === id, grow: true, onClick: () => { setState({ buildMode: id, build: 0 }); show(SETS[id][0]); } })));
        const dots = row(SPACE.xs, { flexWrap: "wrap" });
        steps.forEach((_, idx) => add(dots, button({ label: String(idx + 1), kind: "tab", pressed: idx === at, ariaLabel: `Step ${idx + 1}`, onClick: () => go(idx) })));
        const nav = row(SPACE.sm);
        add(nav, button({ label: "Back", grow: true, onClick: () => go(at - 1) }), button({ label: at === steps.length - 1 ? "Done" : "Next", kind: "solid", grow: true, onClick: () => go(at + 1) }));
        const bench = state.buildMode === "bench";
        return { foot: add(stack(SPACE.sm), dots, nav), body: [
            kinds,
            label(`Step ${at + 1} of ${steps.length}`, { size: FONT.xs, tone: "muted" }),
            heading(2, title),
            para(text, { size: FONT.md }),
            button({ label: "Show it on the model", onClick: () => show(steps[at]) }),
            bench ? callout(para("One stick and any computer is enough to test power, USB and the LED. Untested design: expect to debug.", { size: FONT.sm })) : null,
            at === steps.length - 1 && !bench ? add(stack(SPACE.sm), label("BEFORE FIRST POWER", { size: FONT.xs, weight: FONT.bold, tone: "muted" }), list(DOCS.checklist)) : null,
        ] };
    }

    app.ex.build = { buildView };
})();
