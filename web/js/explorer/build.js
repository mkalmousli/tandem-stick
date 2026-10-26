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

    const { SETS, CHOICES } = app.ex.buildSteps;

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
            extra.links ? add(stack(SPACE.xs), label("THE FILES", { size: FONT.xs, weight: FONT.bold, tone: "accent" }), app.ex.relatedFiles.relatedFiles(extra.links.map(([text, path]) => [text, `files/${path}`]))) : null,
            extra.show ? add(stack(SPACE.md), visual(extra.show)) : null,
            button({ label: "Show it on the model", onClick: () => show(step) }),
        ];
    }

    // Step zero: pick a path. Each choice is one big button with the effort it takes.
    function chooser() {
        const list = stack(SPACE.sm);
        CHOICES.forEach(([id, title, text, needs]) => {
            const pick = button({ label: title, kind: "solid", onClick: () => { setState({ buildMode: id, build: 0 }); show(SETS[id][0]); } });
            add(list, add(stack(SPACE.xs), pick, para(text, { size: FONT.sm }), label(needs, { size: FONT.xs, tone: "muted" })));
        });
        return { foot: stack(0), body: [heading(2, "How do you want to make it?"), para("Pick one. You can change your mind at any time.", { size: FONT.sm, tone: "muted" }), list] };
    }

    function buildView() {
        if (!state.buildMode) return chooser();
        const steps = SETS[state.buildMode];
        const at = Math.min(state.build, steps.length - 1);
        const kinds = row(SPACE.sm, { alignItems: "center" });
        add(kinds, button({ label: "← Change path", onClick: () => setState({ buildMode: null, build: 0 }) }), label(CHOICES.find(([id]) => id === state.buildMode)[1], { size: FONT.sm, weight: FONT.bold }));
        const dots = row(SPACE.xs, { flexWrap: "wrap" });
        steps.forEach((_, idx) => add(dots, button({ label: String(idx + 1), kind: "tab", pressed: idx === at, ariaLabel: `Step ${idx + 1}: ${steps[idx][0]}`, onClick: () => go(idx) })));
        const nav = row(SPACE.sm);
        add(nav, button({ label: at === 0 ? "Change path" : "Back", grow: true, onClick: () => (at === 0 ? setState({ buildMode: null, build: 0 }) : go(at - 1)) }), button({ label: at === steps.length - 1 ? "Done" : "Next", kind: "solid", grow: true, onClick: () => go(at + 1) }));
        const bench = state.buildMode === "bench";
        return {
            foot: add(stack(SPACE.sm), dots, nav),
            body: [kinds, stepBody(steps[at], at, steps.length), bench ? callout(para("One stick and any computer is enough to test power, USB and the LED. Untested design: expect to debug.", { size: FONT.sm })) : null],
        };
    }

    app.ex.build = { buildView, go };
})();
