// The live demo as a scroll story: one sticky 3D stage, and scrolling through the section moves it from step to step.
(() => {
    const { el, add, on, paint, themed, region, watchViewport, track } = app.dom;
    const { SPACE, RADIUS, SIZE, FONT, px } = app.styles;
    const { label, para, heading } = app.ui.text;
    const { button } = app.ui.button;
    const { row } = app.ui.layout;
    const { isPhone } = app.ui.layout;
    const { STEPS } = app.story.steps;
    const { SCENARIOS, findScenario } = app.data;

    const STEP_VH = 0.45;          // scroll distance per step, as a share of the viewport height
    const MIN_STAGE = 360;
    const MAX_STAGE = 640;
    const CARD_W = 360;
    const DOT = 8;
    const DOT_LONG = 22;
    const GLASS = "d8";
    const BLUR = "blur(12px)";
    const FIRST_SENTENCE = /^(.+?[.!?])(\s|$)/;

    const short = (text) => (FIRST_SENTENCE.exec(text) || [, text])[1];

    function caption(player, scenario) {
        const box = el("div", {
            position: "absolute", boxSizing: "border-box", padding: px(SPACE.lg), borderRadius: px(RADIUS.md), borderWidth: "1px", borderStyle: "solid",
            display: "flex", flexDirection: "column", gap: px(SPACE.sm), backdropFilter: BLUR, pointerEvents: "auto",
        });
        paint(box, (node, palette) => { node.style.background = `${palette.surface}${GLASS}`; node.style.borderColor = palette.line; });
        const view = region(box);
        const draw = () => view.render(() => {
            const step = STEPS[player.state.idx];
            const dots = row(SPACE.xs);
            STEPS.forEach((_, at) => {
                const dot = el("div", { width: px(at === player.state.idx ? DOT_LONG : DOT), height: px(DOT), borderRadius: px(DOT / 2) });
                themed(dot, { background: (palette) => (at <= player.state.idx ? palette.accent : palette.line) });
                add(dots, dot);
            });
            add(box, dots, label(`${player.state.idx + 1} / ${STEPS.length}`, { size: FONT.xs, tone: "muted" }), heading(2, step.title), para(short(step.text(scenario)), { size: FONT.md }));
            if (step.interact) {
                const buttons = row(SPACE.xs, { flexWrap: "wrap" });
                scenario.actions.forEach((action) => add(buttons, button({ label: action.label, kind: "solid", onClick: () => player.send(action) })));
                add(box, label("TRY IT", { size: FONT.xs, weight: FONT.bold, tone: "accent" }), buttons);
            }
        });
        draw();
        player.subscribe(draw);
        return box;
    }

    // `host` receives the whole section. Returns nothing; everything is released with the page scope.
    function scrollDemo(host, scenario) {
        const track_ = el("div", { position: "relative" });
        const sticky = el("div", { position: "sticky", top: px(SIZE.header + SPACE.sm), overflow: "hidden", borderRadius: px(RADIUS.md) });
        add(track_, sticky);
        add(host, track_);
        const player = app.story.createPlayer(sticky, scenario);
        player.setPlaying(false);
        const stageEl = player.stage.el;
        stageEl.style.borderRadius = "0px";
        stageEl.tabIndex = 0;
        stageEl.setAttribute("aria-label", `Interactive demo: ${scenario.name}. Scroll to move through the steps; type to send input.`);
        on(stageEl, "keydown", (evt) => { if (player.typeKey(evt)) evt.preventDefault(); });
        const card = caption(player, scenario);
        add(sticky, card);

        const view = { h: 1, w: 1 };
        let frame = 0;
        function sync() {
            frame = 0;
            const box = track_.getBoundingClientRect();
            const travel = Math.max(1, box.height - view.h);
            const progress = Math.min(1, Math.max(0, (SIZE.header + SPACE.sm - box.top) / travel));
            const idx = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));
            if (idx !== player.state.idx) player.go(idx);
        }
        const queue = () => { if (!frame) frame = requestAnimationFrame(sync); };
        on(window, "scroll", queue, { passive: true });
        track(() => cancelAnimationFrame(frame));

        watchViewport((viewport) => {
            const phone = isPhone(viewport);
            const gutter = phone ? SPACE.lg : SPACE.xl;
            const w = Math.min(SIZE.content, viewport.w) - 2 * gutter;
            const h = Math.round(Math.min(MAX_STAGE, Math.max(MIN_STAGE, viewport.h - SIZE.header - SIZE.notice - 2 * SPACE.lg)));
            Object.assign(view, { w, h });
            Object.assign(sticky.style, { width: px(w), height: px(h) });
            track_.style.height = px(h + Math.round(viewport.h * STEP_VH * STEPS.length));
            player.stage.resize(w, h);
            Object.assign(card.style, phone
                ? { left: px(SPACE.sm), right: px(SPACE.sm), bottom: px(SPACE.sm), top: "auto", width: "auto" }
                : { left: px(SPACE.lg), bottom: px(SPACE.lg), top: "auto", right: "auto", width: px(CARD_W) });
            queue();
        });
        return player;
    }

    function scenarioChips(current, onPick) {
        const box = row(SPACE.xs, { flexWrap: "wrap" });
        SCENARIOS.forEach((item) => add(box, button({ label: item.name, kind: "tab", pressed: item.id === current, onClick: () => onPick(item.id) })));
        return box;
    }

    app.pages.scrollDemo = { scrollDemo, scenarioChips };
})();
