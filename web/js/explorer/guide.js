// Guide tab: drawings, pinout, parts, build steps, print settings, security and roadmap, as short sections.
(() => {
    const { add } = app.dom;
    const { SPACE, FONT } = app.styles;
    const { para, list, heading } = app.ui.text;
    const { stack } = app.ui.layout;
    const { card, kvList, badge } = app.ui.card;
    const { table } = app.ui.table;
    const { untestedCallout } = app.ui.page;
    const svg = app.ui.svg;
    const { DIM, CHIPS, PASSIVES, BOM, SETUP, BOARD_FACTS, SIZE_FACTS } = app.data;
    const { DOCS, ROLES, PLAN, ARCHITECTURE } = app.content;

    const SCALE = 17;
    const MARGIN = 44;
    const PLUG_DEPTH = 8;
    const KEEP_OUT = 6;
    const euro = (value) => `€${value.toFixed(2)}`;
    const mm = (value) => Math.round(value * SCALE);

    // Board drawing: outline, antenna keep-out, module, passives and plug, all from the explorer's data.
    function boardDrawing() {
        const w = mm(DIM.pcbW) + 2 * MARGIN;
        const h = mm(DIM.pcbD) + 2 * MARGIN + 10;
        const canvas = svg.canvas(w, h, "Board drawing, top view, 33 by 17.4 millimetres");
        const left = MARGIN;
        const top = MARGIN;
        const cx = left + mm(DIM.pcbW) / 2;
        const cy = top + mm(DIM.pcbD) / 2;
        add(canvas, svg.rect(left, top, mm(DIM.pcbW), mm(DIM.pcbD), "surface", "text", 1.5, 3));
        add(canvas, svg.rect(left, top, mm(KEEP_OUT), mm(DIM.pcbD), "raised", "muted", 1));
        add(canvas, svg.text("antenna keep-out", left + mm(KEEP_OUT) / 2, cy, { anchor: "middle", size: FONT.xs, tone: "muted", rotate: -90 }));
        CHIPS.forEach((chip) => {
            const [bw, bh] = chip.size;
            add(canvas, svg.rect(cx + mm(chip.pos[0] - bw / 2), cy + mm(chip.pos[1] - bh / 2), mm(bw), mm(bh), "raised", "accent", 1.5, 2));
            add(canvas, svg.text(chip.part, cx + mm(chip.pos[0]), cy + mm(chip.pos[1]) + 4, { anchor: "middle", size: FONT.xs }));
        });
        PASSIVES.forEach((part) => add(canvas, svg.rect(cx + mm(part.pos[0] - part.size[0] / 2), cy + mm(part.pos[1] - part.size[1] / 2), mm(part.size[0]), mm(part.size[1]), "muted", "none", 0)));
        add(canvas, svg.rect(left + mm(DIM.pcbW) - mm(PLUG_DEPTH), cy - mm(DIM.plugW / 2), mm(PLUG_DEPTH), mm(DIM.plugW), "none", "text", 1.5, 1));
        add(canvas, svg.text("USB-A tab", left + mm(DIM.pcbW) - mm(PLUG_DEPTH) / 2, cy + 4, { anchor: "middle", size: FONT.xs }));
        svg.dimension(canvas, [left, top - 16], [left + mm(DIM.pcbW), top - 16], `${DIM.pcbW} mm`);
        svg.dimension(canvas, [left - 16, top], [left - 16, top + mm(DIM.pcbD)], `${DIM.pcbD} mm`, true);
        return canvas;
    }

    // Case drawing: top outline and side profile with the stack of parts.
    function caseDrawing() {
        const gap = 40;
        const w = mm(DIM.w) + 2 * MARGIN;
        const h = mm(DIM.d) + mm(DIM.h) + 2 * MARGIN + gap;
        const canvas = svg.canvas(w, h, "Case drawing, top and side views, 36 by 20.4 by 9.2 millimetres");
        const x0 = MARGIN;
        add(canvas, svg.rect(x0, MARGIN, mm(DIM.w), mm(DIM.d), "surface", "text", 1.5, 6));
        add(canvas, svg.rect(x0 + mm(DIM.wall), MARGIN + mm(DIM.wall), mm(DIM.w - 2 * DIM.wall), mm(DIM.d - 2 * DIM.wall), "none", "muted", 1, 4));
        add(canvas, svg.text("top view", x0 + mm(DIM.w) / 2, MARGIN + mm(DIM.d) / 2 + 4, { anchor: "middle", tone: "muted", size: FONT.xs }));
        svg.dimension(canvas, [x0, MARGIN - 16], [x0 + mm(DIM.w), MARGIN - 16], `${DIM.w} mm`);
        svg.dimension(canvas, [x0 - 16, MARGIN], [x0 - 16, MARGIN + mm(DIM.d)], `${DIM.d} mm`, true);
        const sideTop = MARGIN + mm(DIM.d) + gap;
        add(canvas, svg.rect(x0, sideTop, mm(DIM.w), mm(DIM.h), "surface", "text", 1.5, 3));
        add(canvas, svg.rect(x0 + mm(DIM.wall), sideTop + mm(DIM.h - DIM.pcbY - DIM.pcbT), mm(DIM.pcbW), mm(DIM.pcbT), "raised", "accent", 1.5));
        add(canvas, svg.text("board", x0 + mm(DIM.w) / 2, sideTop + mm(DIM.h - DIM.pcbY - DIM.pcbT) + 24, { anchor: "middle", size: FONT.xs, tone: "muted" }));
        svg.dimension(canvas, [x0 + mm(DIM.w) + 16, sideTop], [x0 + mm(DIM.w) + 16, sideTop + mm(DIM.h)], `${DIM.h} mm`, true);
        return canvas;
    }

    function drawingCard(title, drawing, facts) {
        const box = card(heading(3, title), app.ui.zoom.zoomable(drawing, `${title} drawing`));
        if (facts) add(box, kvList(facts));
        return box;
    }

    function drawings() {
        const wrap = stack(SPACE.lg);
        add(wrap, drawingCard("Board", boardDrawing(), BOARD_FACTS), drawingCard("Case", caseDrawing(), SIZE_FACTS));
        return [wrap];
    }

    const partsTotal = () => BOM.reduce((sum, [, qty, unit]) => sum + qty * unit, 0);

    function parts() {
        const rows = BOM.map(([name, qty, unit]) => [name, String(qty), euro(unit), euro(qty * unit)]);
        return [table({ head: ["Part", "Qty", "Each", "Total"], rows, numeric: [1, 2, 3], foot: ["Parts for one stick", "", "", euro(partsTotal())] }), para("Estimates at hobby quantities, about ±30%. Prices change; check stock before ordering.", { size: FONT.sm, tone: "muted" })];
    }

    function roles() {
        return [para(ROLES.lead), table({ head: ROLES.head, rows: ROLES.rows, boldFirst: true }), para(ROLES.why, { size: FONT.sm, tone: "muted" })];
    }

    function tools() {
        const wrap = stack(SPACE.sm);
        DOCS.tools.forEach(([title, text]) => add(wrap, card(heading(3, title), para(text, { size: FONT.sm, tone: "muted" }))));
        return [wrap];
    }

    function files() {
        const box = stack(SPACE.sm);
        DOCS.files.forEach(([title, note, href]) => add(box, fileLink(`${title} · ${note}`, href)));
        return [box];
    }

    const BOX = { w: 150, h: 64, gap: 70 };
    const PAD = 20;

    function architecture() {
        const count = ARCHITECTURE.boxes.length;
        const width = count * BOX.w + (count - 1) * BOX.gap + 2 * PAD;
        const height = BOX.h + 2 * PAD + 14;
        const canvas = svg.canvas(width, height, ARCHITECTURE.title);
        svg.arrowHead(canvas, "arrow");
        ARCHITECTURE.boxes.forEach(([name, note], idx) => {
            const x = PAD + idx * (BOX.w + BOX.gap);
            const hot = idx === 1 || idx === 2;
            add(canvas, svg.rect(x, PAD, BOX.w, BOX.h, "surface", hot ? "accent" : "line", hot ? 2 : 1, 6));
            add(canvas, svg.text(name, x + BOX.w / 2, PAD + 28, { anchor: "middle", weight: FONT.bold }));
            add(canvas, svg.text(note, x + BOX.w / 2, PAD + 48, { anchor: "middle", size: FONT.xs, tone: "muted" }));
            if (idx === count - 1) return;
            const mid = PAD + BOX.h / 2;
            const line = svg.line(x + BOX.w, mid, x + BOX.w + BOX.gap - 2, mid, "muted", idx === 1 ? 1.5 : 2, idx === 1 ? "5 4" : undefined);
            line.setAttribute("marker-end", "url(#arrow)");
            add(canvas, line, svg.text(ARCHITECTURE.links[idx], x + BOX.w + BOX.gap / 2, mid - 8, { anchor: "middle", size: FONT.xs, tone: "muted" }));
        });
        return canvas;
    }

    const stage = (item) => add(stack(SPACE.xs), add(stack(2), item.done ? badge("done") : badge("planned", "muted")), heading(3, item.title), para(item.text, { size: FONT.sm, tone: "muted" }));

    function roadmap() {
        return PLAN.roadmap.map((item) => card(stage(item)));
    }

    function cost() {
        const parts = BOM.reduce((sum, [, qty, unit]) => sum + qty * unit, 0);
        const setup = SETUP.reduce((sum, [, lo, hi]) => sum + (lo + hi) / 2, 0);
        const rows = PLAN.buildQuantities.map((qty) => [String(qty), euro((parts * qty + setup) / qty), euro(parts * qty + setup)]);
        return [
            table({ head: ["Sticks built", "Per stick", "Order total"], rows, numeric: [0, 1, 2] }),
            para(`Includes about ${euro(setup)} of one-off setup and sample fees. ${PLAN.costNote}`, { size: FONT.sm, tone: "muted" }),
        ];
    }

    function firmware() {
        return [table({ head: ["Part", "What it does (planned)"], rows: PLAN.firmware, boldFirst: true })];
    }

    function security() {
        return [para(PLAN.security.lead), list(PLAN.security.rules), para(PLAN.security.caveat, { size: FONT.sm, tone: "muted" })];
    }


    const SECTIONS = [
        { id: "glance", title: "At a glance", build: () => [untestedCallout(PLAN.status), para(app.data.PRODUCT.tagline), para(PLAN.vision, { size: FONT.sm, tone: "muted" })] },
        { id: "roles", title: "Host / target", build: roles },
        { id: "drawings", title: "Drawings", build: drawings },
        { id: "pinout", title: "Pinout", build: () => [table({ head: ["Signal", "Module pin", "Notes"], rows: DOCS.pinout, boldFirst: true }), para(DOCS.gaps, { size: FONT.sm, tone: "muted" })] },
        { id: "build", title: "Build", build: () => [list(DOCS.build, { ordered: true }), heading(3, "Tools"), ...tools()] },
        { id: "print", title: "Print", build: () => [table({ rows: DOCS.print, boldFirst: true })] },
        { id: "check", title: "Before power on", build: () => [list(DOCS.checklist)] },
        { id: "parts", title: "Parts and cost", build: () => [...parts(), ...cost()] },
        { id: "arch", title: "Architecture", build: () => [card(app.ui.zoom.zoomable(architecture(), "Architecture")), para(PLAN.architecture, { size: FONT.sm })] },
        { id: "firmware", title: "Firmware plan", build: () => [...firmware(), ...security()] },
        { id: "roadmap", title: "Roadmap and risks", build: () => [...roadmap(), table({ head: ["Risk", "Impact", "Response"], rows: PLAN.risks, boldFirst: true }), list(PLAN.open)] },
    ];

    app.ex.guide = { SECTIONS };
})();
