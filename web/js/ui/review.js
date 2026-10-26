// Review dialog: look at a file properly (live 3D, tables, source), then download it.
(() => {
    const { el, add, on, themed, createScope, withScope } = app.dom;
    const { FONT, SPACE, RADIUS, px } = app.styles;
    const { label, para } = app.ui.text;
    const { stack, row } = app.ui.layout;
    const { button } = app.ui.button;

    const LAYER = "4000";
    const SHADE = "rgba(6,6,8,0.8)";
    const DIALOG_W = 0.9;
    const DIALOG_MAX = 780;
    const LINK = { display: "flex", alignItems: "center", justifyContent: "center", flexGrow: "1", padding: `${px(SPACE.sm)} ${px(SPACE.md)}`, borderRadius: px(RADIUS.sm), fontFamily: FONT.sans, fontSize: px(FONT.sm), fontWeight: String(FONT.bold), textDecoration: "none", borderWidth: "1px", borderStyle: "solid", boxSizing: "border-box" };

    function saveLink(title, target, primary, close) {
        const node = el("a", { ...LINK, flexGrow: primary ? "2" : "1" }, { href: target });
        node.setAttribute("download", "");
        node.textContent = title;
        themed(node, primary ? { background: "accent", color: "onAccent", borderColor: "accent" } : { background: "raised", color: "text", borderColor: "line" });
        on(node, "click", () => setTimeout(close, 0));
        return node;
    }

    // opts: { file, note, links: [[text, href]], size }. The preview scripts load on first use.
    function reviewFile(text, href, opts = {}) {
        const opener = document.activeElement;
        const scope = createScope();
        const root = el("div", { position: "fixed", left: "0px", top: "0px", width: "100%", height: "100%", background: SHADE, zIndex: LAYER, display: "flex", alignItems: "center", justifyContent: "center" });
        root.tabIndex = -1;
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-label", `Review ${text}`);
        const box = el("div", { display: "flex", flexDirection: "column", gap: px(SPACE.md), padding: px(SPACE.lg), borderRadius: px(RADIUS.md), borderWidth: "1px", borderStyle: "solid", boxSizing: "border-box", overflow: "hidden" });
        themed(box, { background: "surface", borderColor: "line" });
        const fit = () => { box.style.width = `${Math.min(DIALOG_MAX, window.innerWidth * DIALOG_W)}px`; box.style.maxHeight = `${window.innerHeight * DIALOG_W}px`; };
        const body = el("div", { overflow: "hidden", display: "flex", flexDirection: "column", gap: px(SPACE.sm), minHeight: "0" });
        document.documentElement.style.overflow = "hidden"; // nothing scrolls behind or inside the dialog
        const close = () => { scope.dispose(); root.remove(); document.documentElement.style.overflow = ""; if (opener && opener.focus) opener.focus(); };
        const sizeNote = opts.size ? ` · ${(opts.size / 1024).toFixed(opts.size > 102400 ? 0 : 1)} KB` : "";
        const actions = row(SPACE.sm, { flexWrap: "wrap" });
        if (href) add(actions, saveLink(`Download${sizeNote}`, href, true, close));
        (opts.links || []).forEach(([title, target]) => add(actions, saveLink(title, target, false, close)));
        add(actions, button({ label: "Close", grow: true, onClick: close }));
        withScope(scope, () => {
            fit();
            on(window, "resize", fit);
            const unlisten = app.router.onChange(close);
            app.dom.track(unlisten);
            on(root, "keydown", (evt) => { if (evt.key === "Escape") close(); });
            on(root, "pointerdown", (evt) => { if (evt.target === root) close(); });
            add(box, add(stack(2), label(text, { size: FONT.lg, weight: FONT.bold }), opts.note ? para(opts.note, { size: FONT.sm, tone: "muted" }) : null), body, actions);
            add(body, para("Loading preview…", { size: FONT.sm, tone: "muted" }));
        });
        add(root, box);
        add(document.body, root);
        root.focus();
        app.need("files").then(() => withScope(scope, () => {
            const file = opts.file || app.files.list.describe(href);
            body.replaceChildren(app.files.preview.preview(file));
        }));
    }

    app.ui.review = { reviewFile };
})();
