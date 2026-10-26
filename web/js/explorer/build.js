// Build tab: a follow-along for making a stick, written for a first-timer, plus a bench test that needs only one stick.
(() => {
    const { add, el } = app.dom;
    const { state, setState, emit } = app.ex;
    const { SPACE, FONT, RADIUS, px } = app.styles;
    const { para, heading, label, list } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row } = app.ui.layout;
    const { callout } = app.ui.card;
    const { table } = app.ui.table;
    const { zoomable } = app.ui.zoom;
    const { DOCS } = app.content;
    const { HUE, board, wiring, solder, joints } = app.ex.buildArt;

    const DOT = 12;
    const KIT = [
        ["Soldering iron with a fine tip", "Set it to 330 °C (350 °C for lead-free solder)."],
        ["Solder wire, 0.5 mm", "Leaded 63/37 is easiest to start with. Ventilate the room."],
        ["Flux pen or paste", "Makes solder flow. The single biggest help for a beginner."],
        ["Tweezers", "To hold tiny parts still."],
        ["Magnifier or phone camera", "Most parts are smaller than a grain of rice."],
        ["Multimeter", "To check for shorts before you power anything."],
    ];
    const NETS = [
        ["VBUS", "5 V from the computer", "USB plug → regulator U2 input", HUE.vbus],
        ["3V3", "3.3 V made by U2", "U2 output → module pin 3, R1, LED", HUE.v33],
        ["D−", "USB data minus", "USB plug → module pin 23", HUE.minus],
        ["D+", "USB data plus", "USB plug → module pin 24", HUE.plus],
        ["GND", "Ground, the 0 V return", "Everything shares it", HUE.gnd],
        ["LED_DIN", "LED control line", "Module pin 25 → LED D1", HUE.data],
    ];

    const frame = (node, caption) => zoomable(node, caption);

    const tools = () => add(stack(SPACE.xs), KIT.map(([name, why]) => add(stack(2), label(name, { size: FONT.sm, weight: FONT.bold }), label(why, { size: FONT.sm, tone: "muted" }))));
    const netTable = () => {
        const rows = NETS.map(([name, what, where, hue]) => {
            const chip = add(row(SPACE.sm), dot(hue), label(name, { size: FONT.sm, weight: FONT.bold, mono: true }));
            return [chip, what, where];
        });
        return table({ head: ["Wire", "What it is", "Goes from → to"], rows });
    };
    function dot(hue) {
        const node = el("div", { width: px(DOT), height: px(DOT), borderRadius: px(RADIUS.pill), flexShrink: "0", background: hue });
        return node;
    }
    const bomRows = () => app.data.BOM.map(([name, qty, unit]) => [name, String(qty), `€${unit.toFixed(2)}`]);

    // [title, plain-words text, part to show, exploded?, tint, extras: { todo, watch, show }]
    const FULL = [
        ["Check the files", "Before spending money, look at what you are about to make.", "pcb", 1, HUE.module, { todo: ["Open the board in KiCad, or look at the Gerbers in the Files tab.", "Turn the 3D model here and compare."], watch: "Nothing has been built or tested yet. Treat every step as a first try." }],
        ["Order the board", "A PCB fab makes the green board for you from the Gerber files.", "pcb", 1, HUE.module, { todo: ["Upload tandem-gerbers.zip from the Files tab.", "Choose 4 layers, 1.6 mm thick, ENIG (gold) finish.", "Order the smallest quantity first (usually 5)."], watch: "ENIG matters: the gold pads on the USB tab wear well. Cheaper finishes wear out." }],
        ["Order the parts", "Everything that goes on the board comes from an electronics supplier.", "esp", 1, HUE.passive, { todo: ["Order each line below. Buy a few extra tiny parts: they are easy to lose.", "Check the part number matches before you pay."], show: "bom" }],
        ["Print the case", "A 3D printer makes the two-piece case.", "case-tray", 1, HUE.plug, { todo: ["Print the tray and the lid in PETG, no supports.", "Test-fit the lid before you solder anything."], show: "print" }],
        ["Learn the soldering routine", "Soldering is melting metal to join two pads. Four moves cover every part on this board.", "pcb", 1, HUE.led, { todo: ["Heat the pad and the part together for about 2 to 3 seconds, then feed solder to the joint, not to the iron.", "Remove the solder first, then the iron.", "Do not move the part until the solder turns from liquid to shiny."], watch: "Practise on a spare board or scrap first. Too hot or too long lifts pads off the board.", show: "solder" }],
        ["Solder the small parts", "Go in this order: regulator, capacitors and resistor, then the LED. The colours match the board map.", "pwr", 1, HUE.reg, { todo: ["Regulator U2 first: it has five tiny legs. Tin one pad, tack one leg, then do the rest.", "Capacitors and R1 next. They have no direction, so either way round is fine.", "LED D1 last. Match the small corner mark on the LED to the mark on the board.", "C3 goes on the bottom side."], watch: "A part that is crooked but connected still works. A bridge between legs does not: wick it away with braid and flux.", show: "board" }],
        ["Solder the ESP32 module", "The biggest part, and the one with a hidden ground pad underneath.", "esp", 1, HUE.module, { todo: ["Easiest is a hot plate or hot air with solder paste. With an iron only: tin every pad on the board first.", "Line up the module with the pad outline on the board. Tack one corner and check the alignment.", "Solder the side pads, then press the centre down while you heat from the board edge."], watch: "If you are unsure, order the board with the module already assembled by the fab.", show: "board" }],
        ["Check every connection", "Use the multimeter in continuity mode. It beeps when two points are joined.", "pcb", 1, HUE.data, { todo: ["Beep test: each coloured wire below should connect where the table says.", "No beep allowed between 3V3 and GND, or between 5 V and GND.", "A beep where there should be none means a bridge: find it under the magnifier."], show: "wiring" }],
        ["First power-up", "Plug the board into a powered USB hub, not your main computer port.", "led", 0, HUE.led, { todo: ["Plug in. Unplug at once if anything smells hot.", "The LED should light or blink within a second or two."], show: "checklist" }],
        ["Close the case", "Board into the tray on its ribs, plug through the slot, lid snaps on.", "case-lid", 0, HUE.plug, { todo: ["Slide the board into the tray.", "Snap the lid on. If it is tight, print the lid at 99% size."] }],
    ];
    const BENCH = [
        ["Plug in", "No target machine needed. Plug one finished stick into a powered USB hub or a spare port.", "p-plug", 0, HUE.plug, {}],
        ["Look at the LED", "The status LED should light or blink within a second or two. If nothing happens, unplug at once and re-check 5 V and 3V3 for shorts.", "led", 0, HUE.led, {}],
        ["See it on your computer", "A new USB serial device should appear (Linux: ls /dev/ttyACM*, Windows: Device Manager, macOS: ls /dev/cu.usb*). That proves power, USB data lines and the module all work.", "esp", 1, HUE.module, {}],
        ["Flash the firmware", "Firmware is not released yet. When it is, you will flash it over this same USB connection with esptool, no target needed.", "esp", 1, HUE.module, {}],
        ["Pair two sticks", "Plug a second stick into another port of the same computer. Make one the host and one the target, and watch the target's LED react to commands from the host.", "led", 0, HUE.led, {}],
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

    const caption = (text) => label(text, { size: FONT.xs, tone: "muted" });
    function visual(kind) {
        const maps = {
            board: () => [heading(3, "Where each part goes"), frame(board(), "Board map"), caption("Solid = top side, dashed = bottom side. Colours match the legend.")],
            wiring: () => [heading(3, "Which wire goes where"), frame(wiring(), "Wiring"), netTable()],
            solder: () => [heading(3, "The four moves"), frame(solder(), "Soldering routine"), heading(3, "What a good joint looks like"), frame(joints(), "Solder joints"), heading(3, "Your kit"), tools()],
            bom: () => [heading(3, "Shopping list"), table({ head: ["Part", "Qty", "Each"], rows: bomRows(), numeric: [1] })],
            print: () => [heading(3, "Printer settings"), table({ rows: DOCS.print, boldFirst: true })],
            checklist: () => [heading(3, "Before first power"), list(DOCS.checklist)],
        };
        return maps[kind] ? maps[kind]() : null;
    }

    function stepBody(step, at, total) {
        const [title, text, , , hue, extra] = step;
        const head = add(row(SPACE.sm, { alignItems: "center" }), dot(hue), label(`Step ${at + 1} of ${total}`, { size: FONT.xs, tone: "muted" }));
        return [
            head,
            heading(2, title),
            para(text, { size: FONT.md }),
            extra.todo ? add(stack(SPACE.xs), label("DO THIS", { size: FONT.xs, weight: FONT.bold, tone: "accent" }), list(extra.todo, { ordered: true })) : null,
            extra.watch ? callout(para(extra.watch, { size: FONT.sm })) : null,
            extra.show ? add(stack(SPACE.md), visual(extra.show)) : null,
            button({ label: "Show it on the model", onClick: () => show(step) }),
        ];
    }

    function buildView() {
        const steps = SETS[state.buildMode];
        const at = Math.min(state.build, steps.length - 1);
        const kinds = row(SPACE.sm);
        KINDS.forEach(([id, name]) => add(kinds, button({ label: name, kind: "tab", pressed: state.buildMode === id, grow: true, onClick: () => { setState({ buildMode: id, build: 0 }); show(SETS[id][0]); } })));
        const dots = row(SPACE.xs, { flexWrap: "wrap" });
        steps.forEach((_, idx) => add(dots, button({ label: String(idx + 1), kind: "tab", pressed: idx === at, ariaLabel: `Step ${idx + 1}: ${steps[idx][0]}`, onClick: () => go(idx) })));
        const nav = row(SPACE.sm);
        add(nav, button({ label: "Back", grow: true, onClick: () => go(at - 1) }), button({ label: at === steps.length - 1 ? "Done" : "Next", kind: "solid", grow: true, onClick: () => go(at + 1) }));
        const bench = state.buildMode === "bench";
        return {
            foot: add(stack(SPACE.sm), dots, nav),
            body: [kinds, stepBody(steps[at], at, steps.length), bench ? callout(para("One stick and any computer is enough to test power, USB and the LED. Untested design: expect to debug.", { size: FONT.sm })) : null],
        };
    }

    app.ex.build = { buildView, go };
})();
