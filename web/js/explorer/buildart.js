// Drawings for the Build tab: where each part goes, which wire goes where, and how a good solder joint looks.
(() => {
    const { add } = app.dom;
    const { FONT } = app.styles;
    const svg = app.ui.svg;

    // One colour per kind of work, used in every drawing and legend so they read together.
    const HUE = {
        passive: "#4aa3ff", reg: "#b48cff", led: "#45e08a", module: "#ffb224", plug: "#d9b45a",
        vbus: "#ff5a5a", minus: "#f2f2f4", plus: "#45e08a", gnd: "#8a8f98", v33: "#ff8a3d", data: "#4aa3ff",
        good: "#45e08a", bad: "#ff5a5a", board: "#2a2415", solder: "#c9ccd3",
    };
    const WHAT = [
        ["passive", "Caps and resistor", "C1–C5, R1"], ["reg", "Regulator", "U2"], ["led", "LED", "D1"], ["module", "ESP32 module", "U1"], ["plug", "USB plug tab", "gold pads"],
    ];

    const S = 11;                 // pixels per mm on the board map
    const PAD = 14;
    const BOARD = { w: 33, h: 17.4, tab: 6, tabH: 12 };
    // [ref, kind, x, y (mm from the board's top-left), w, h, onBottom]
    const PARTS = [
        ["U1", "module", 13.3, 8.7, 20.5, 15.4], ["U2", "reg", 24.2, 4, 3.2, 3], ["D1", "led", 24.2, 12.8, 2.4, 2.4],
        ["C1", "passive", 26.9, 1.8, 1.8, 3], ["C2", "passive", 24.2, 6.4, 3, 1.8], ["C4", "passive", 26.3, 12.8, 1.8, 3],
        ["C5", "passive", 22.3, 1.4, 2.4, 1.6], ["R1", "passive", 24.2, 1.4, 2.4, 1.6], ["C3", "passive", 8.6, 14.6, 2.4, 1.6, true],
    ];

    function legend(canvas, y) {
        WHAT.forEach(([kind, name, note], idx) => {
            const x = PAD + idx * 92;
            add(canvas, svg.rect(x, y, 10, 10, HUE[kind], "none", 0, 2), svg.text(name, x + 14, y + 8, { size: 9, weight: FONT.bold }), svg.text(note, x + 14, y + 19, { size: 9, tone: "muted" }));
        });
    }

    // Top view of the board with every part in its real place, coloured by when you solder it.
    function board() {
        const width = (BOARD.w + BOARD.tab) * S + 2 * PAD;
        const height = BOARD.h * S + 2 * PAD + 34;
        const canvas = svg.canvas(width, height, "Board top view with parts colour coded by build step");
        add(canvas, svg.rect(PAD, PAD, BOARD.w * S, BOARD.h * S, HUE.board, "line", 1.5, 6));
        add(canvas, svg.rect(PAD + BOARD.w * S, PAD + (BOARD.h - BOARD.tabH) / 2 * S, BOARD.tab * S, BOARD.tabH * S, HUE.plug, "none", 0, 2));
        add(canvas, svg.text("USB-A tab", PAD + (BOARD.w + BOARD.tab / 2) * S, PAD + BOARD.h / 2 * S + 3, { anchor: "middle", size: 9, weight: FONT.bold }));
        PARTS.forEach(([ref, kind, x, y, w, h, bottom]) => {
            const left = PAD + (x - w / 2) * S;
            const top = PAD + (y - h / 2) * S;
            const node = svg.rect(left, top, w * S, h * S, bottom ? "none" : HUE[kind], bottom ? HUE[kind] : "none", bottom ? 1.5 : 0, 2);
            if (bottom) node.setAttribute("stroke-dasharray", "3 2");
            add(canvas, node);
            const big = kind === "module";
            add(canvas, svg.text(ref + (bottom ? " (bottom)" : ""), big ? left + w * S / 2 : left + w * S / 2, big ? top + h * S / 2 : top - 3, { anchor: "middle", size: big ? 12 : 8, weight: FONT.bold, tone: big ? "onAccent" : "text" }));
        });
        legend(canvas, BOARD.h * S + 2 * PAD + 2);
        return canvas;
    }

    const wire = (canvas, x1, y1, x2, y2, hue, note) => {
        add(canvas, svg.line(x1, y1, x2, y2, hue, 3));
        if (note) add(canvas, svg.text(note, (x1 + x2) / 2, y1 - 6, { anchor: "middle", size: 9, tone: "muted" }));
    };
    const box = (canvas, x, y, w, h, title, sub, hue) => {
        add(canvas, svg.rect(x, y, w, h, "surface", hue || "line", hue ? 2 : 1, 5), svg.text(title, x + w / 2, y + 16, { anchor: "middle", size: 10, weight: FONT.bold }));
        if (sub) add(canvas, svg.text(sub, x + w / 2, y + 29, { anchor: "middle", size: 8, tone: "muted" }));
    };
    const pin = (canvas, x, y, name, side) => add(canvas, svg.shape("circle", { cx: x, cy: y, r: 4 }, "text", "none"), svg.text(name, side === "left" ? x + 8 : x - 8, y + 3.5, { anchor: side === "left" ? "start" : "end", size: 9 }));

    // Every connection between the plug, the parts and the module, colour coded.
    function wiring() {
        const canvas = svg.canvas(470, 280, "Wiring: which signal goes from the USB plug to which pin");
        box(canvas, 6, 14, 82, 250, "USB plug", "gold pads", HUE.plug);
        box(canvas, 150, 20, 84, 50, "Regulator U2", "5 V to 3.3 V", HUE.reg);
        box(canvas, 150, 128, 84, 32, "LED D1", "data in", HUE.led);
        box(canvas, 150, 172, 94, 30, "R1 10k + C5 1µF", "EN reset", HUE.passive);
        box(canvas, 150, 210, 94, 26, "TP1 test pad", "boot mode", HUE.passive);
        box(canvas, 330, 14, 134, 250, "ESP32 module U1", "", HUE.module);
        wire(canvas, 88, 46, 150, 46, HUE.vbus, "5 V");
        wire(canvas, 234, 46, 330, 46, HUE.v33, "3.3 V");
        wire(canvas, 88, 100, 330, 100, HUE.minus, "D−");
        wire(canvas, 88, 124, 330, 124, HUE.plus, "D+");
        wire(canvas, 244, 144, 330, 144, HUE.data, "");
        wire(canvas, 244, 187, 330, 187, HUE.data, "");
        wire(canvas, 244, 223, 330, 223, HUE.data, "");
        wire(canvas, 88, 256, 330, 256, HUE.gnd, "GND (everything shares it)");
        wire(canvas, 192, 70, 192, 256, HUE.gnd, "");
        [["3V3  pin 3", 46], ["D−  pin 23", 100], ["D+  pin 24", 124], ["LED_DIN  pin 25", 144], ["EN  pin 45", 187], ["IO0  pin 4", 223], ["GND", 256]].forEach(([name, y]) => pin(canvas, 330, y, name, "right"));
        [["VBUS", 46, HUE.vbus], ["D−", 100, HUE.minus], ["D+", 124, HUE.plus], ["GND", 256, HUE.gnd]].forEach(([name, y]) => pin(canvas, 88, y, name, "left"));
        return canvas;
    }

    const FRAME = { w: 110, h: 104, gap: 8, top: 24 };
    function frame(canvas, idx, title) {
        const x = PAD / 2 + idx * (FRAME.w + FRAME.gap);
        add(canvas, svg.rect(x, FRAME.top, FRAME.w, FRAME.h, "surface", "line", 1, 5), svg.text(`${idx + 1}. ${title}`, x + FRAME.w / 2, 16, { anchor: "middle", size: 10, weight: FONT.bold }));
        const base = FRAME.top + FRAME.h - 22;
        add(canvas, svg.rect(x + 6, base + 8, FRAME.w - 12, 8, HUE.board, "none", 0, 2));
        [x + 22, x + 62].forEach((px) => add(canvas, svg.rect(px, base + 2, 26, 6, HUE.plug, "none", 0, 1)));
        return { x, base };
    }
    const iron = (canvas, x1, y1, x2, y2) => add(canvas, svg.line(x1, y1, x2, y2, "muted", 7), svg.line(x2, y2, x2 - (x2 - x1) * 0.08, y2 - (y2 - y1) * 0.08, "accent", 7));
    const solderWire = (canvas, x1, y1, x2, y2) => add(canvas, svg.line(x1, y1, x2, y2, HUE.solder, 2.5));
    const blob = (canvas, cx, cy, r) => add(canvas, svg.shape("ellipse", { cx, cy, rx: r, ry: r * 0.6 }, HUE.solder, "none"));

    // Four pictures of the same small routine: flux, tin one pad, tack, finish.
    function solder() {
        const canvas = svg.canvas(480, 150, "How to solder a small part in four steps");
        let at = frame(canvas, 0, "Flux");
        add(canvas, svg.shape("ellipse", { cx: at.x + 55, cy: at.base + 4, rx: 38, ry: 5 }, HUE.data, "none"));
        add(canvas, svg.text("a dab on the pads", at.x + 55, at.base - 18, { anchor: "middle", size: 9, tone: "muted" }));
        at = frame(canvas, 1, "Tin one pad");
        iron(canvas, at.x + 14, at.base - 52, at.x + 32, at.base);
        solderWire(canvas, at.x + 98, at.base - 40, at.x + 36, at.base);
        blob(canvas, at.x + 35, at.base + 1, 12);
        at = frame(canvas, 2, "Tack the part");
        add(canvas, svg.rect(at.x + 36, at.base - 6, 38, 8, HUE.passive, "none", 0, 2));
        iron(canvas, at.x + 12, at.base - 50, at.x + 30, at.base - 2);
        add(canvas, svg.line(at.x + 96, at.base - 44, at.x + 70, at.base - 8, "muted", 2));
        at = frame(canvas, 3, "Solder the rest");
        add(canvas, svg.rect(at.x + 36, at.base - 6, 38, 8, HUE.passive, "none", 0, 2));
        blob(canvas, at.x + 35, at.base + 1, 10);
        iron(canvas, at.x + 96, at.base - 50, at.x + 76, at.base - 2);
        solderWire(canvas, at.x + 30, at.base - 40, at.x + 72, at.base);
        return canvas;
    }

    const JOINTS = [
        ["Good", "shiny, concave, like a tiny volcano", HUE.good, "M0 0 Q12 -18 40 -20 Q68 -18 80 0 Z"],
        ["Too little", "gap or thin: it may not connect", HUE.bad, "M16 0 Q24 -6 40 -7 Q56 -6 64 0 Z"],
        ["Ball", "dull blob sitting on top: cold joint, reheat", HUE.bad, "M14 0 Q8 -34 40 -36 Q72 -34 66 0 Z"],
        ["Bridge", "solder joins two pads: wick it away", HUE.bad, "M-6 0 Q10 -22 40 -18 Q70 -22 86 0 Z"],
    ];

    // Cross-sections of a joint: what to aim for and what to redo.
    function joints() {
        const wide = 118;
        const canvas = svg.canvas(480, 128, "Good and bad solder joints");
        JOINTS.forEach(([name, note, hue, d], idx) => {
            const x = PAD / 2 + idx * wide + 14;
            const y = 86;
            add(canvas, svg.rect(x - 8, y, 96, 8, HUE.board, "none", 0, 2), svg.rect(x - 6, y - 3, 24, 3, HUE.plug, "none", 0, 1), svg.rect(x + 62, y - 3, 24, 3, HUE.plug, "none", 0, 1));
            const shapeNode = svg.path(d, HUE.solder, hue, 2);
            shapeNode.setAttribute("transform", `translate(${x} ${y - 3})`);
            add(canvas, shapeNode);
            add(canvas, svg.text(name, x + 40, 14, { anchor: "middle", size: 11, weight: FONT.bold }), svg.text(name === "Good" ? "✓" : "✗", x + 40, 36, { anchor: "middle", size: 14, weight: FONT.bold, tone: hue }));
            add(canvas, svg.text(note, x + 40, 114, { anchor: "middle", size: 8, tone: "muted" }));
        });
        return canvas;
    }

    app.ex.buildArt = { HUE, WHAT, board, wiring, solder, joints };
})();
