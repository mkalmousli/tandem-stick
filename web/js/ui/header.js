// Site header: logo, page links, theme switch. Sticky; wraps to two rows on phones.
(() => {
    const { el, add, themed, interact, focusRing, watchViewport, paint } = app.dom;
    const { state, subscribe, setState } = app.state;
    const { FONT, SPACE, RADIUS, SIZE, px } = app.styles;
    const { label } = app.ui.text;
    const { button } = app.ui.button;
    const { isPhone } = app.ui.layout;

    const PAGES = [["home", "Home"], ["explore", "Explore"], ["downloads", "Downloads"]];
    const REPO_URL = "https://github.com/mkalmousli/tandem-stick";
    const LOGO_URL = "assets/logo.svg";

    function brand() {
        const node = el("a", { display: "flex", alignItems: "center", gap: px(SPACE.sm), textDecoration: "none", borderRadius: px(RADIUS.sm), flexShrink: "0" });
        node.href = "#/home";
        const logo = el("img", { width: px(SIZE.icon), height: px(SIZE.icon), display: "block" }, { alt: "", src: LOGO_URL });
        const name = app.ui.wordmark.wordmark("TANDEM STICK", 14);
        name.style.margin = "2px 0";
        const tag = label("DIY · untested", { size: FONT.xs, tone: "muted" });
        interact(node, { native: true, onActivate: () => {}, draw: (target, palette, flags) => { target.style.outline = focusRing(palette, flags.ring); } });
        return add(node, logo, add(el("div", { display: "flex", flexDirection: "column", lineHeight: "1.1" }), name, tag));
    }

    function drawNav(node, palette, flags) {
        const building = state.route === "explore" && state.exTab === "build"; // the Build tab of the explorer
        const active = node._build ? building : node._route === state.route && !(building && node._route === "explore");
        node.style.background = active ? palette.raised : "transparent";
        node.style.color = active || flags.hover ? palette.text : palette.muted;
        node.style.boxShadow = active ? `inset 0 -2px 0 ${palette.accent}` : "none";
        node.style.outline = focusRing(palette, flags.ring);
        if (active) node.setAttribute("aria-current", "page"); else node.removeAttribute("aria-current");
    }

    function navLink(route, text) {
        const node = el("a", { padding: `${px(SPACE.sm)} ${px(SPACE.md)}`, borderRadius: px(RADIUS.sm), fontFamily: FONT.sans, fontSize: px(FONT.sm), fontWeight: String(FONT.medium), textDecoration: "none", whiteSpace: "nowrap" });
        node._route = route;
        node.href = `#/${route}`;
        node.textContent = text;
        const repaint = interact(node, { native: true, onActivate: () => {}, draw: drawNav });
        subscribe((patch) => { if ("route" in patch || "exTab" in patch) repaint(); });
        return node;
    }

    function externalLink() {
        const node = navLink("github", "GitHub");
        node.href = REPO_URL;
        node.target = "_blank";
        node.rel = "noopener";
        node._route = "";
        return node;
    }

    // Jumps straight to the build guide in the explorer.
    function buildLink() {
        const node = navLink("explore", "Build");
        node.href = "#/explore?tab=build";
        node._route = "";
        node._build = true;
        // Already in the explorer: switch tab in place so the chosen path and step are kept.
        app.dom.on(node, "click", (evt) => { if (app.router.current().name === "explore" && app.ex.setState) { evt.preventDefault(); app.ex.setState({ tab: "build" }); } });
        return node;
    }

    function themeSwitch() {
        const node = button({ label: "", onClick: () => setState({ theme: state.theme === "dark" ? "light" : "dark" }), ariaLabel: "Switch between dark and light theme" });
        paint(node, () => { node.textContent = state.theme === "dark" ? "Dark" : "Light"; });
        return node;
    }

    function header() {
        const bar = el("header", {
            position: "sticky", top: "0px", zIndex: "20", display: "flex", alignItems: "center", flexWrap: "wrap", gap: px(SPACE.sm),
            padding: `${px(SPACE.sm)} ${px(SPACE.lg)}`, boxSizing: "border-box", borderBottomWidth: "1px", borderBottomStyle: "solid",
        });
        themed(bar, { background: "surface", borderBottomColor: "line" });
        const nav = el("nav", { display: "flex", alignItems: "center", gap: px(SPACE.xs), overflowX: "auto", flexGrow: "1" }, { "aria-label": "Pages" });
        PAGES.forEach(([route, text]) => { add(nav, navLink(route, text)); if (route === "explore") add(nav, buildLink()); });
        add(nav, externalLink());
        watchViewport((viewport) => {
            nav.style.order = isPhone(viewport) ? "3" : "0";
            nav.style.width = isPhone(viewport) ? "100%" : "auto";
            nav.style.flexGrow = isPhone(viewport) ? "0" : "1";
        });
        return add(bar, brand(), nav, themeSwitch());
    }

    app.ui.header = { header, PAGES };
})();
