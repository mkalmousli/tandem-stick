// Home: a scroll presentation of the product, with a live walkthrough, use cases, host vs target, FAQ and calls to action.
(() => {
    const { el, add, on, themed, region, watchViewport, interact, focusRing } = app.dom;
    const { SPACE, RADIUS, SIZE, FONT, px } = app.styles;
    const { label, para, heading, link } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row, column, grid, isNarrow, isPhone } = app.ui.layout;
    const { card } = app.ui.card;
    const { table } = app.ui.table;
    const { STEPS } = app.story.steps;
    const { SCENARIOS, findScenario } = app.data;
    const { ROLES, HOME } = app.content;
    const { section } = app.ui.page;

    const STAGE_RATIO = 0.52;
    const PHONE_STAGE_RATIO = 0.95;
    const PANEL_W = 340;
    const GUTTER = { phone: SPACE.lg, wide: SPACE.xl };
    const REVEAL = { shift: 24, ms: 500, threshold: 0.12 };
    const HERO_FLOAT = { amp: 10, speed: 0.0012, tilt: 2.5 };
    const HERO_TITLE = { phone: 34, wide: 56 };
    const HERO_ART = { phone: 200, wide: 380 };
    const WIDE_BLOCK = SPACE.xxl * 2;

    const innerWidth_ = (viewport) => Math.min(SIZE.content, viewport.w) - 2 * (isPhone(viewport) ? GUTTER.phone : GUTTER.wide);

    function scenarioPicker(current, onPick) {
        const box = row(SPACE.xs);
        SCENARIOS.forEach((item) => add(box, button({ label: item.name, kind: "tab", pressed: item.id === current, onClick: () => onPick(item.id) })));
        return box;
    }

    // Everything that depends on the chosen scenario: the 3D stage, the step list and the try-it buttons.
    function walkthrough(host, scenario) {
        const frame = el("div", { display: "flex", gap: px(SPACE.lg), alignItems: "flex-start" });
        const stageHost = el("div", { flexShrink: "0" });
        const side = stack(SPACE.md, { flexShrink: "0" });
        add(frame, stageHost, side);
        add(host, frame);
        const player = app.story.createPlayer(stageHost, scenario);
        const stageEl = player.stage.el;
        stageEl.tabIndex = 0;
        stageEl.setAttribute("aria-label", `Interactive demo: ${scenario.name}. Type to send input to the target screens.`);
        on(stageEl, "keydown", (evt) => { if (player.typeKey(evt)) evt.preventDefault(); });

        const body = stack(SPACE.md);
        const view = region(body);
        const draw = () => view.render(() => add(body, stepPanel(player, scenario)));
        draw();
        player.subscribe(draw);
        add(side, body);

        watchViewport((viewport) => {
            const narrow = isNarrow(viewport);
            const inner = innerWidth_(viewport);
            const stageW = narrow ? inner : inner - PANEL_W - SPACE.lg;
            const stageH = Math.round(stageW * (isPhone(viewport) ? PHONE_STAGE_RATIO : STAGE_RATIO));
            frame.style.flexDirection = narrow ? "column" : "row";
            side.style.width = px(narrow ? inner : PANEL_W);
            player.stage.resize(stageW, stageH);
        });
        return player;
    }

    function stepPanel(player, scenario) {
        const { idx, playing } = player.state;
        const step = STEPS[idx];
        const dots = row(SPACE.xs);
        STEPS.forEach((item, at) => add(dots, button({ label: String(at + 1), kind: "tab", pressed: at === idx, ariaLabel: `Step ${at + 1}: ${item.title}`, onClick: () => player.go(at) })));
        const nav = row(SPACE.sm);
        add(nav,
            button({ label: "Back", onClick: player.prev, grow: true }),
            button({ label: idx === STEPS.length - 1 ? "Start over" : "Next", kind: "solid", onClick: idx === STEPS.length - 1 ? () => player.go(0) : player.next, grow: true }),
            button({ label: playing ? "Pause" : "Auto-play", kind: "tab", pressed: playing, onClick: () => player.setPlaying(!playing) }));
        return [
            label(`Step ${idx + 1} of ${STEPS.length}`, { size: FONT.xs, tone: "muted" }),
            heading(2, step.title),
            para(step.text(scenario), { size: FONT.md }),
            dots, nav, tryIt(player, scenario, step),
        ];
    }

    function tryIt(player, scenario, step) {
        const box = card();
        add(box, label("TRY IT", { size: FONT.xs, weight: FONT.bold, tone: "accent" }));
        if (!step.interact) return add(box, para("Reach step 5 or 6 to send input yourself.", { size: FONT.sm, tone: "muted" }), button({ label: "Jump to step 5", onClick: () => player.go(4) }));
        const buttons = row(SPACE.xs);
        scenario.actions.forEach((action) => add(buttons, button({ label: action.label, kind: "solid", onClick: () => { player.setPlaying(false); player.send(action); } })));
        return add(box, para(`Press a button, or click the 3D view and use your keyboard. ${scenario.hostDoes}`, { size: FONT.sm, tone: "muted" }), buttons);
    }

    // Fade and slide a block in the first time it scrolls into view.
    function reveal(node) {
        if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return node;
        Object.assign(node.style, { opacity: "0", transform: `translateY(${REVEAL.shift}px)`, transition: `opacity ${REVEAL.ms}ms ease, transform ${REVEAL.ms}ms ease` });
        const seen = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            node.style.opacity = "1";
            node.style.transform = "none";
            seen.disconnect();
        }, { threshold: REVEAL.threshold });
        seen.observe(node);
        app.dom.track(() => seen.disconnect());
        return node;
    }

    // A full-width band with an eyebrow, a title, a lead and content, laid out in the shared column.
    function band(id, eyebrow, title, lead, ...children) {
        const box = stack(SPACE.lg);
        box.id = id;
        add(box, label(eyebrow.toUpperCase(), { size: FONT.xs, weight: FONT.bold, tone: "accent" }), heading(2, title), lead ? para(lead, { size: FONT.lg, tone: "muted" }) : null, children);
        const outer = el("section", { paddingTop: px(WIDE_BLOCK / 2), paddingBottom: px(WIDE_BLOCK / 2) });
        add(outer, column(reveal(box)));
        return outer;
    }

    function cells(items, cell, build) {
        const wrap = grid(cell, SPACE.md);
        items.forEach((item, idx) => add(wrap, build(item, idx)));
        requestAnimationFrame(() => wrap.layout());
        return wrap;
    }

    function hero() {
        const outer = el("section", { position: "relative", overflow: "hidden" });
        themed(outer, { background: (p) => `radial-gradient(ellipse at 70% 30%, ${p.raised}, ${p.bg} 65%)` });
        const copy = stack(SPACE.lg, { flexGrow: "1", flexBasis: "0" });
        const title = heading(1, HOME.title);
        const actions = row(SPACE.sm);
        add(actions, button({ label: "Explore it in 3D", kind: "solid", onClick: () => app.router.go("explore") }), button({ label: "Download the files", onClick: () => app.router.go("downloads") }));
        const facts = grid(150, SPACE.md);
        HOME.facts.forEach(([big, small]) => add(facts, add(stack(2), label(big, { size: FONT.xl, weight: FONT.bold }), label(small, { size: FONT.xs, tone: "muted" }))));
        requestAnimationFrame(() => facts.layout());
        add(copy, label("DIY · OPEN HARDWARE · UNTESTED", { size: FONT.xs, weight: FONT.bold, tone: "accent" }), title, para(HOME.lead, { size: FONT.lg, tone: "muted" }), actions, facts);
        const art = el("img", { display: "block", flexShrink: "0" }, { src: "assets/logo.svg", alt: "A 3D rendering of one Tandem Stick" });
        const wrap = el("div", { display: "flex", alignItems: "center", justifyContent: "center", gap: px(SPACE.xl), paddingTop: px(WIDE_BLOCK / 2), paddingBottom: px(WIDE_BLOCK / 2) });
        add(wrap, copy, art);
        add(outer, column(wrap));
        let frame = 0;
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const tick = (now) => {
                art.style.transform = `translateY(${Math.sin(now * HERO_FLOAT.speed) * HERO_FLOAT.amp}px) rotate(${Math.sin(now * HERO_FLOAT.speed * 0.5) * HERO_FLOAT.tilt}deg)`;
                frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
            app.dom.track(() => cancelAnimationFrame(frame));
        }
        watchViewport((viewport) => {
            const narrow = isNarrow(viewport);
            wrap.style.flexDirection = narrow ? "column-reverse" : "row";
            title.style.fontSize = px(isPhone(viewport) ? HERO_TITLE.phone : HERO_TITLE.wide);
            const size = isPhone(viewport) ? HERO_ART.phone : HERO_ART.wide;
            art.style.width = px(size);
            art.style.height = px(size);
            copy.style.width = narrow ? "100%" : "auto";
        });
        return outer;
    }

    function stepCards() {
        return cells(HOME.steps, 220, ([title, text], idx) => card(label(String(idx + 1), { size: FONT.xl, weight: FONT.bold, tone: "accent" }), heading(3, title), para(text, { size: FONT.sm, tone: "muted" })));
    }

    function whyCards() {
        return cells(HOME.why, 260, ([title, text]) => card(heading(3, title), para(text, { size: FONT.sm, tone: "muted" })));
    }

    function caseCards(pick) {
        return cells(HOME.cases, 250, ([title, who, text, id]) => {
            const node = card(label(who.toUpperCase(), { size: FONT.xs, tone: "accent", weight: FONT.bold }), heading(3, title), para(text, { size: FONT.sm, tone: "muted" }));
            if (!id) return node;
            add(node, label("See it live →", { size: FONT.sm, tone: "accent", weight: FONT.medium }));
            node.style.cursor = "pointer";
            interact(node, {
                role: "button", label: `Show the live demo: ${title}`, onActivate: () => pick(id),
                draw: (target, palette, flags) => { target.style.borderColor = flags.hover ? palette.accent : palette.line; target.style.outline = focusRing(palette, flags.ring); },
            });
            return node;
        });
    }

    function roleCards() {
        const duo = grid(280, SPACE.md);
        add(duo,
            card(label("HOST STICK", { size: FONT.xs, weight: FONT.bold, tone: "accent" }), heading(3, "In your computer"), para("Your keyboard and mouse are read here and sent over the radio. One host per group.", { size: FONT.sm, tone: "muted" })),
            card(label("TARGET STICK", { size: FONT.xs, weight: FONT.bold, tone: "accent" }), heading(3, "In each machine you control"), para("It receives the radio data and acts like a normal USB keyboard and mouse. As many as you need.", { size: FONT.sm, tone: "muted" })));
        requestAnimationFrame(() => duo.layout());
        return [duo, table({ head: ROLES.head, rows: ROLES.rows, boldFirst: true }), para(ROLES.why, { size: FONT.sm, tone: "muted" })];
    }

    // One question per row; activating it shows or hides the answer.
    function faq() {
        const box = stack(SPACE.sm);
        HOME.faq.forEach(([question, answer]) => {
            const item = card();
            const head = el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", gap: px(SPACE.md), cursor: "pointer" });
            const plus = label("+", { size: FONT.lg, tone: "accent", weight: FONT.bold });
            add(head, label(question, { size: FONT.md, weight: FONT.medium }), plus);
            const body = para(answer, { size: FONT.sm, tone: "muted" });
            body.style.display = "none";
            let open = false;
            interact(head, {
                role: "button", label: question, onActivate: () => {
                    open = !open;
                    body.style.display = open ? "block" : "none";
                    plus.textContent = open ? "−" : "+";
                    head.setAttribute("aria-expanded", String(open));
                },
                draw: (target, palette, flags) => { target.style.outline = focusRing(palette, flags.ring); },
            });
            head.setAttribute("aria-expanded", "false");
            add(item, head, body);
            add(box, item);
        });
        return box;
    }

    function finalCta() {
        const actions = row(SPACE.sm);
        add(actions,
            button({ label: "Explore it in 3D", kind: "solid", onClick: () => app.router.go("explore") }),
            button({ label: "Downloads", onClick: () => app.router.go("downloads") }),
            button({ label: "GitHub", onClick: () => window.open("https://github.com/mkalmousli/tandem-stick", "_blank", "noopener") }));
        return actions;
    }

    function build(query) {
        let scenario = findScenario(query.get("s"));
        const picker = el("div");
        const lead = para("", { tone: "muted", size: FONT.md });
        const stageBox = el("div");
        const stageView = region(stageBox);
        const pickerView = region(picker);
        const demo = band("demo", "Live demo", "See it work", "Pick a situation, step through it in 3D, then press the buttons or type on your own keyboard.", picker, lead, stageBox);

        function show(id) {
            scenario = findScenario(id);
            app.router.replaceQuery(new URLSearchParams({ s: scenario.id }));
            lead.textContent = `${scenario.who}. ${scenario.pitch}`;
            pickerView.render(() => add(picker, scenarioPicker(scenario.id, show)));
            stageView.render(() => walkthrough(stageBox, scenario));
        }
        const pick = (id) => { demo.scrollIntoView({ behavior: "smooth" }); show(id); };

        const page = el("div");
        add(page,
            hero(),
            band("how", "How it works", "Four steps, no software", null, stepCards()),
            demo,
            band("why", "Why it is different", "Made to just work", null, whyCards()),
            band("cases", "Use cases", "Made for real situations", "From a single desk to a whole building. Tap a card marked live to see it in 3D.", caseCards(pick)),
            band("roles", "Host and target", "Same stick, two jobs", null, roleCards()),
            band("faq", "Questions", "Good to know", null, faq()),
            band("start", "Start", "Build one this weekend", "Everything is open: the board, the case and the plan. Explore the parts in 3D, then grab the files.", finalCta()));
        show(scenario.id);
        return page;
    }

    app.pages.home = { build };
})();
