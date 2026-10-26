// Download cards and file links. A "coming later" card marks things that do not exist yet.
(() => {
    const { el, add, on, themed, interact, focusRing, createScope, withScope } = app.dom;
    const { FONT, SPACE, RADIUS, px } = app.styles;
    const { label, para, heading } = app.ui.text;
    const { card, badge } = app.ui.card;
    const { stack, row } = app.ui.layout;
    const { button } = app.ui.button;

    const LAYER = "4000";
    const SHADE = "rgba(6,6,8,0.8)";
    const DIALOG_W = 0.9;
    const DIALOG_MAX = 640;
    const PREVIEW_LINES = 40;
    const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

    const sizeText = (bytes) => (bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

    // Fills the dialog body with a look at the file: image, first lines of text, or a size note for binaries.
    async function fillPreview(body, href, name) {
        const note = (text) => para(text, { size: FONT.sm, tone: "muted" });
        if (IMAGE_EXT.test(name)) {
            const img = el("img", { display: "block", width: "100%", height: "auto", borderRadius: px(RADIUS.sm) });
            img.src = href;
            img.alt = name;
            return add(body, img);
        }
        try {
            const res = await fetch(href);
            const buf = await res.arrayBuffer();
            const head = new Uint8Array(buf, 0, Math.min(buf.byteLength, 2048));
            if (head.includes(0)) return add(body, note(`Binary file, ${sizeText(buf.byteLength)}. Download it to open it in the right program.`));
            const lines = new TextDecoder().decode(buf).split("\n");
            const pre = el("pre", { margin: "0", padding: px(SPACE.md), overflow: "auto", scrollbarWidth: "thin", fontFamily: FONT.mono, fontSize: px(FONT.xs), lineHeight: "1.5", borderRadius: px(RADIUS.sm), boxSizing: "border-box" });
            themed(pre, { color: "text", background: "raised" });
            pre.textContent = lines.slice(0, PREVIEW_LINES).join("\n");
            add(body, note(`${sizeText(buf.byteLength)} · ${lines.length} lines${lines.length > PREVIEW_LINES ? `, first ${PREVIEW_LINES} shown` : ""}`), pre);
        } catch (err) {
            add(body, note("No preview here. The file is added when the site is published."));
        }
    }

    // Review dialog: look at the file first, then choose to download it.
    function reviewFile(text, href) {
        const scope = createScope();
        const opener = document.activeElement;
        const root = el("div", { position: "fixed", left: "0px", top: "0px", width: "100%", height: "100%", background: SHADE, zIndex: LAYER, display: "flex", alignItems: "center", justifyContent: "center" });
        root.tabIndex = -1;
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-label", `Review ${text}`);
        const box = el("div", { display: "flex", flexDirection: "column", gap: px(SPACE.md), padding: px(SPACE.lg), borderRadius: px(RADIUS.md), borderWidth: "1px", borderStyle: "solid", boxSizing: "border-box", overflow: "hidden" });
        themed(box, { background: "surface", borderColor: "line" });
        const fit = () => { box.style.width = `${Math.min(DIALOG_MAX, window.innerWidth * DIALOG_W)}px`; box.style.maxHeight = `${window.innerHeight * DIALOG_W}px`; };
        const body = el("div", { overflowY: "auto", scrollbarWidth: "thin", display: "flex", flexDirection: "column", gap: px(SPACE.sm) });
        function close() { scope.dispose(); root.remove(); if (opener && opener.focus) opener.focus(); }
        const save = el("a", { display: "flex", alignItems: "center", justifyContent: "center", flexGrow: "1", padding: `${px(SPACE.sm)} ${px(SPACE.md)}`, borderRadius: px(RADIUS.sm), fontFamily: FONT.sans, fontSize: px(FONT.sm), fontWeight: String(FONT.bold), textDecoration: "none" });
        save.href = href;
        save.setAttribute("download", "");
        save.textContent = "Download";
        themed(save, { background: "accent", color: "onAccent" });
        on(save, "click", () => setTimeout(close, 0));
        withScope(scope, () => {
            fit();
            on(window, "resize", fit);
            on(root, "keydown", (evt) => { if (evt.key === "Escape") close(); });
            on(root, "pointerdown", (evt) => { if (evt.target === root) close(); });
            add(box, label(text, { size: FONT.lg, weight: FONT.bold }), body, add(row(SPACE.sm), save, button({ label: "Cancel", grow: true, onClick: close })));
        });
        add(root, box);
        add(document.body, root);
        fillPreview(body, href, text);
        root.focus();
    }

    function drawFile(node, palette, flags) {
        node.style.background = flags.hover ? palette.raised : palette.surface;
        node.style.borderColor = flags.hover ? palette.accent : palette.line;
        node.style.outline = focusRing(palette, flags.ring);
    }

    function fileLink(text, href) {
        const node = el("a", {
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: px(SPACE.md), padding: `${px(SPACE.sm)} ${px(SPACE.md)}`,
            borderRadius: px(RADIUS.sm), borderWidth: "1px", borderStyle: "solid", fontFamily: FONT.sans, fontSize: px(FONT.sm),
            textDecoration: "none", boxSizing: "border-box",
        });
        node.href = href;
        node.setAttribute("download", "");
        on(node, "click", (evt) => { evt.preventDefault(); reviewFile(text, href); });
        add(node, label(text, { size: FONT.sm }), label("Review", { size: FONT.xs, tone: "accent", weight: FONT.bold }));
        interact(node, { native: true, onActivate: () => {}, draw: drawFile });
        return node;
    }

    function downloadCard({ title, note, href, meta }) {
        const node = el("a", { display: "flex", flexDirection: "column", gap: px(SPACE.xs), padding: px(SPACE.lg), borderRadius: px(RADIUS.md), borderWidth: "1px", borderStyle: "solid", textDecoration: "none", boxSizing: "border-box" });
        node.href = href;
        node.setAttribute("download", "");
        on(node, "click", (evt) => { evt.preventDefault(); reviewFile(title, href); });
        add(node, heading(3, title), para(note, { size: FONT.sm, tone: "muted" }), meta ? label(meta, { size: FONT.xs, tone: "muted", mono: true }) : null);
        interact(node, { native: true, onActivate: () => {}, draw: drawFile });
        return node;
    }

    function comingCard(title, note) {
        const box = card(add(row(SPACE.sm), heading(3, title), badge("coming later")), para(note, { size: FONT.sm, tone: "muted" }));
        box.style.borderStyle = "dashed";
        return box;
    }

    app.ui.download = { fileLink, downloadCard, comingCard };
})();
