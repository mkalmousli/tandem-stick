// Home: a scroll presentation of the product, with a live walkthrough, use cases, host vs target, FAQ and calls to action.
(() => {
    const { el, add, on, themed, region, watchViewport, interact, focusRing } = app.dom;
    const { SPACE, RADIUS, SIZE, FONT, px } = app.styles;
    const { label, para, heading, link } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row, column, grid, isNarrow, isPhone } = app.ui.layout;
    const { card } = app.ui.card;
    const { scrollDemo, scenarioChips } = app.pages.scrollDemo;
    const { SCENARIOS, findScenario } = app.data;
    const { HOME } = app.content;
    const { section } = app.ui.page;

    const GUTTER = { phone: SPACE.lg, wide: SPACE.xl };
    const REVEAL = { shift: 24, ms: 500, threshold: 0.12 };
    const HERO_FLOAT = { amp: 10, speed: 0.0012, tilt: 2.5 };
    const HERO_TITLE = { phone: 34, wide: 56 };
    const HERO_ART = { phone: 200, wide: 380 };
    const WIDE_BLOCK = SPACE.xxl * 2;

    const innerWidth_ = (viewport) => Math.min(SIZE.content, viewport.w) - 2 * (isPhone(viewport) ? GUTTER.phone : GUTTER.wide);

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

    // Use cases as compact tiles: who it is for and what they do. Tiles with a demo open it.
    function caseCards(pick) {
        return cells(HOME.cases, 200, ([title, who, , id]) => {
            const node = card(label(who.toUpperCase(), { size: FONT.xs, tone: "accent", weight: FONT.bold }), heading(3, title));
            if (!id) return node;
            add(node, label("Watch it →", { size: FONT.sm, tone: "accent", weight: FONT.medium }));
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
        return duo;
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
        const stageBox = el("div");
        const stageView = region(stageBox);
        const pickerView = region(picker);
        const demo = band("demo", "Live demo", "Scroll to see it work", null, picker);
        const demoStage = column(stageBox);
        demo.appendChild(demoStage);

        function show(id) {
            scenario = findScenario(id);
            app.router.replaceQuery(new URLSearchParams({ s: scenario.id }));
            pickerView.render(() => add(picker, scenarioChips(scenario.id, show)));
            stageView.render(() => scrollDemo(stageBox, scenario));
        }
        const pick = (id) => { demo.scrollIntoView({ behavior: "smooth" }); show(id); };

        const page = el("div");
        add(page,
            hero(),
            band("how", "How it works", "Four steps, no software", null, stepCards()),
            demo,
            band("cases", "Use cases", "Made for real situations", null, caseCards(pick)),
            band("roles", "Host and target", "Same stick, two jobs", null, roleCards()),
            band("faq", "Questions", "Good to know", null, faq()),
            band("start", "Start", "Build one this weekend", null, finalCta())
        );
        show(scenario.id);
        return page;
    }

    app.pages.home = { build };
})();
