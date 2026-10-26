// A file card: preview of the file itself, name, note, size and download; clicking it opens the review dialog.
(() => {
    const { el, add, on, interact, focusRing, themed } = app.dom;
    const { SPACE, RADIUS, FONT, px } = app.styles;
    const { label, para } = app.ui.text;
    const { stack, row } = app.ui.layout;
    const { badge } = app.ui.card;
    const { reviewFile } = app.ui.review;
    const { thumbOf } = app.files.preview;
    const { sizeText } = app.files.common;
    const { sizes, downloadsOf, shortName } = app.files.list;

    function open(file) {
        const links = downloadsOf(file);
        reviewFile(file.name, links[0] ? links[0][1] : null, { file, note: file.note, links: links.slice(1), size: file.path && sizes.get(file.path) });
    }

    // Every card shows its file's own preview, small and not clickable (the card itself opens the dialog).
    function thumb(file) {
        const box = el("div", { width: "100%", height: "150px", borderRadius: px(RADIUS.sm), overflow: "hidden", position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "center", pointerEvents: "none" });
        themed(box, { background: "raised" });
        const ext = file.path ? file.path.split(".").pop() : "bin";
        const fallback = () => { box.textContent = ""; add(box, label(`.${ext}`, { size: FONT.xl, weight: FONT.bold, tone: "muted", mono: true })); box.style.alignItems = "center"; };
        if (file.kind === "later") { fallback(); return box; }
        thumbOf(file).then((nodes) => { box.textContent = ""; add(box, nodes); box.querySelectorAll("button, [aria-label^=Zoom]").forEach((b) => b.remove()); box.querySelectorAll("canvas, img, svg").forEach((pic) => Object.assign(pic.style, { width: "100%", height: "100%", objectFit: "contain" })); }).catch(fallback);
        return box;
    }

    function fileCard(file) {
        const node = stack(SPACE.sm, { padding: px(SPACE.sm), borderRadius: px(RADIUS.md), borderWidth: "1px", borderStyle: "solid", boxSizing: "border-box" });
        const links = downloadsOf(file);
        const meta = [file.kind === "layer" ? "Gerber" : file.kind === "drill" ? "Drill" : null, file.path && sizes.has(file.path) ? sizeText(sizes.get(file.path)) : null].filter(Boolean).join(" · ");
        const text = stack(2, { padding: `0 ${px(SPACE.xs)}` });
        add(text, label(shortName(file), { size: FONT.md, weight: FONT.bold }), para(file.note || "", { size: FONT.xs, tone: "muted" }), meta ? label(meta, { size: FONT.xs, tone: "muted", mono: true }) : null);
        const foot = row(SPACE.sm, { padding: `0 ${px(SPACE.xs)} ${px(SPACE.xs)}`, alignItems: "center", justifyContent: "space-between", marginTop: "auto" });
        add(foot, label("Preview", { size: FONT.xs, tone: "muted" }));
        if (file.kind === "later") add(foot, badge("coming later"));
        else if (links[0]) {
            const get = el("a", { fontFamily: FONT.sans, fontSize: px(FONT.xs), fontWeight: String(FONT.bold), textDecoration: "none", padding: `2px ${px(SPACE.sm)}`, borderRadius: px(RADIUS.pill), borderWidth: "1px", borderStyle: "solid" }, { href: links[0][1], "aria-label": `Download ${file.name}` });
            get.setAttribute("download", "");
            get.textContent = "Download";
            app.dom.themed(get, { color: "accent", borderColor: "accent" });
            on(get, "click", (evt) => evt.stopPropagation());
            add(foot, get);
        }
        add(node, thumb(file), text, foot);
        interact(node, {
            role: "button", label: `Preview ${file.name}`, onActivate: () => open(file),
            draw: (target, palette, flags) => { target.style.background = flags.hover ? palette.raised : palette.surface; target.style.borderColor = flags.hover ? palette.accent : palette.line; target.style.outline = focusRing(palette, flags.ring); },
        });
        return node;
    }

    app.ex.fileCard = { fileCard };
})();
