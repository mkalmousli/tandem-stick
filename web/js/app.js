// Wires everything together: page shell, routing, theme, viewport.
(() => {
    const { el, add, on, region, applyTheme, themed } = app.dom;
    const { state, subscribe, setState } = app.state;
    const { FONT, MOTION } = app.styles;
    const { header } = app.ui.header;
    const { untestedNotice } = app.ui.notice;
    const { saveTheme } = app.theme;
    const { register, current, onChange } = app.router;

    const FAVICON = "assets/logo.svg";
    const ROUTES = ["home", "explore", "downloads"];
    const TITLE = "Tandem Stick: DIY wireless USB control sticks";

    function resetPage() {
        const body = document.body;
        Object.assign(body.style, { margin: "0px", fontFamily: FONT.sans, minHeight: "100vh" });
        themed(body, { background: "bg", color: "text" });
        document.documentElement.style.scrollBehavior = "auto";
        document.title = TITLE;
        const icon = el("link", {}, { rel: "icon", href: FAVICON });
        document.head.appendChild(icon);
    }

    // The usable width excludes the scrollbar, which can appear after the first layout, so re-measure once the page is in.
    function syncViewport() {
        const { w, h } = state.viewport;
        const next = { w: document.documentElement.clientWidth, h: window.innerHeight };
        if (next.w !== w || next.h !== h) setState({ viewport: next });
    }

    function watchViewport() {
        on(window, "resize", syncViewport);
    }

    function mount(main) {
        const view = region(main);
        const show = ({ name, query }) => {
            setState({ route: name });
            view.render(() => {
                main.style.opacity = "0";
                add(main, app.pages[name].build(query));
                requestAnimationFrame(() => { main.style.opacity = "1"; syncViewport(); });
            });
            window.scrollTo(0, 0);
        };
        onChange(show);
        show(current());
    }

    function start() {
        ROUTES.forEach((name) => register(name, app.pages[name]));
        resetPage();
        watchViewport();
        subscribe((patch) => { if ("theme" in patch) { saveTheme(state.theme); applyTheme(); } });
        const main = el("main", { transition: `opacity ${MOTION.fadeMs}ms`, width: "100%" });
        add(document.body, untestedNotice(), header(), main);
        mount(main);
        applyTheme();
    }

    app.start = start;
})();
