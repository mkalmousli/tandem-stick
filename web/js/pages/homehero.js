// Home: the hero with the live 3D stick, and the "inside" band of live views of its parts.
(() => {
    const { el, add, themed, watchViewport } = app.dom;
    const { SPACE, FONT, px } = app.styles;
    const { label, para, heading } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row, column, grid, isNarrow, isPhone } = app.ui.layout;
    const { HOME } = app.content;
    const { live3d } = app.ui.live3d;
    const { sizeCompare } = app.pages.sizeCompare;

    const HERO_TITLE = { phone: 34, wide: 56 };
    const HERO_ART = { phone: 320, wide: 620 };
    const BLOCK = SPACE.xxl;

    function hero() {
        const outer = el("section", { position: "relative", overflow: "hidden" });
        themed(outer, { background: (p) => `radial-gradient(ellipse at 70% 30%, ${p.raised}, ${p.bg} 65%)` });
        const copy = stack(SPACE.lg, { flexGrow: "1", flexBasis: "0" });
        const title = heading(1, HOME.title);
        const actions = row(SPACE.sm);
        add(actions, button({ label: "Explore it in 3D", kind: "solid", onClick: () => app.router.go("explore") }), button({ label: "Download the files", onClick: () => app.router.go("downloads") }));
        add(copy, label("DIY · OPEN HARDWARE · UNTESTED", { size: FONT.xs, weight: FONT.bold, tone: "accent" }), title, para(HOME.lead, { size: FONT.lg, tone: "muted" }), actions);
        const art = el("div", { position: "relative", flexShrink: "0" });
        add(art, el("img", { display: "block", width: "100%", opacity: "0.35" }, { src: "assets/logo.svg", alt: "" }));
        const wrap = el("div", { display: "flex", alignItems: "center", justifyContent: "center", gap: px(SPACE.xl), padding: `${px(BLOCK)} 0` });
        const size = add(stack(SPACE.sm), sizeCompare(isPhone(app.state.state.viewport) ? 1.3 : 1.9), label("Real proportions. Parts for one stick cost about €10.", { size: FONT.xs, tone: "muted" }));
        const right = add(stack(SPACE.md, { flexShrink: "0", alignItems: "center" }), art, size);
        add(wrap, copy, right);
        add(outer, column(wrap));
        watchViewport((viewport) => {
            const narrow = isNarrow(viewport);
            wrap.style.flexDirection = narrow ? "column-reverse" : "row";
            title.style.fontSize = px(isPhone(viewport) ? HERO_TITLE.phone : HERO_TITLE.wide);
            art.style.width = px(isPhone(viewport) ? HERO_ART.phone : HERO_ART.wide);
            copy.style.width = narrow ? "100%" : "auto";
        });
        const phone = isPhone(app.state.state.viewport);
        live3d(art, { ratio: 0.8, interactive: !phone, toggle: true, view: { theta: 0.7, phi: 1.05, radius: 135 }, label: "The Tandem Stick in 3D. Drag to turn it, click to take it apart." }).then(() => art.firstChild.remove());
        return outer;
    }

    app.pages.homeHero = { hero };
})();
