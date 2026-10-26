// Files tab: the files that make the product as cards with a live 3D thumbnail, grouped by what they are for.
(() => {
    const { add, region } = app.dom;
    const { state, setState } = app.ex;
    const { SPACE, FONT } = app.styles;
    const { para } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row, grid } = app.ui.layout;
    const { fileCard } = app.ex.fileCard;
    const { GROUPS, listFiles } = app.files.list;

    const CELL = 220;

    function filesView() {
        const holder = stack(SPACE.md);
        const view = region(holder);
        listFiles().then((all) => view.render(() => {
            const groups = GROUPS.map(([title, kinds]) => [title, all.filter((item) => (item.group ? item.group === title : kinds.includes(item.kind)))]).filter(([, items]) => items.length);
            const current = groups.find(([title]) => title === state.fileGroup) || groups[0];
            const cats = row(SPACE.xs, { flexWrap: "wrap" });
            groups.forEach(([title, items]) => add(cats, button({ label: `${title} ${items.length}`, kind: "tab", pressed: title === current[0], onClick: () => setState({ fileGroup: title }) })));
            const wrap = grid(CELL, SPACE.sm);
            current[1].forEach((item) => add(wrap, fileCard(item)));
            requestAnimationFrame(() => wrap.layout());
            add(holder, cats, wrap, para("Click a card to preview it and download. Everything comes from the same files the site publishes.", { size: FONT.xs, tone: "muted" }));
        })).catch(() => view.render(() => add(holder, para("The file list comes with the published site. Use the Downloads page.", { size: FONT.sm, tone: "muted" }))));
        return [holder];
    }

    app.ex.files = { filesView };
})();
