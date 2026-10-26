// Text sections down the page with one sticky 3D view beside them (on top of them on a phone); the section nearest a reading line decides what the view shows.
(() => {
    const { el, add, on, themed } = app.dom;
    const { SPACE, FONT, px } = app.styles;
    const { label, para, heading } = app.ui.text;
    const { stack, row } = app.ui.layout;

    const PHONE = 720;
    const HEADER = 86;

    // Short colour-coded lines under a section's text: [[hex colour, text], ...].
    function points(list) {
        if (!list) return null;
        const box = stack(SPACE.xs);
        list.forEach(([hue, text]) => {
            const dot = el("span", { width: px(10), height: px(10), borderRadius: "50%", background: hue, flexShrink: "0" });
            add(box, add(row(SPACE.sm, { alignItems: "center" }), dot, label(text, { size: FONT.sm, weight: FONT.bold })));
        });
        return box;
    }

    // items: [{ name, text }]. `mount(art, narrow)` puts the view in the sticky box and returns showAt(idx); its optional `.layout(narrow)` runs when the window crosses the phone width.
    function stickySections(items, mount) {
        const holder = el("div", { display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "flex-start" });
        const art = el("div", { minWidth: "0", position: "sticky", zIndex: "2" });
        const list = stack(SPACE.xl);
        const narrowNow = () => window.innerWidth < PHONE;
        const sections = items.map((item, at) => {
            const section = stack(SPACE.sm);
            add(section, label(String(at + 1).padStart(2, "0"), { size: FONT.xs, weight: FONT.bold, tone: "accent" }), heading(3, item.name), para(item.text, { size: FONT.md }), points(item.points));
            add(list, section);
            return section;
        });
        let narrow = narrowNow();
        const showAt = mount(art, narrow);
        const layout = () => {
            narrow = narrowNow();
            Object.assign(art.style, { flex: narrow ? "1 1 100%" : "1 1 340px", top: `${narrow ? HEADER : 90}px`, paddingBottom: narrow ? "8px" : "0" });
            themed(art, { background: narrow ? "bg" : "transparent" });
            list.style.flex = narrow ? "1 1 100%" : "1 1 300px";
            sections.forEach((section) => { section.style.minHeight = narrow ? "max(170px, 26vh)" : "max(220px, 38vh)"; });
            if (showAt.layout) showAt.layout(narrow);
        };
        // The reading line sits in the middle of the screen, or just below the pinned view on a phone.
        let current = -1, queued = false;
        const pick = () => {
            queued = false;
            const line = narrow ? art.getBoundingClientRect().bottom + (window.innerHeight - art.getBoundingClientRect().bottom) * 0.3 : window.innerHeight * 0.5;
            let best = 0, gap = Infinity;
            sections.forEach((section, at) => {
                const box = section.getBoundingClientRect();
                const away = line < box.top ? box.top - line : line > box.bottom ? line - box.bottom : 0;
                if (away < gap || (away === gap && Math.abs(box.top + box.height / 2 - line) < Math.abs(sections[best].getBoundingClientRect().top - line))) { gap = away; best = at; }
            });
            if (best !== current) { current = best; showAt(best); }
        };
        const ask = () => { if (!queued) { queued = true; requestAnimationFrame(pick); } };
        on(window, "scroll", ask, { passive: true });
        on(window, "resize", () => { layout(); ask(); });
        layout();
        ask();
        add(holder, art, list);
        return holder;
    }

    app.ui.sections = { stickySections };
})();
