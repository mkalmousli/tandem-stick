// Downloads page: untested warning, firmware placeholder, bundles, file cards, ordering steps.
(() => {
    const { add, region } = app.dom;
    const { SPACE, FONT } = app.styles;
    const { para, list, heading } = app.ui.text;
    const { grid, stack } = app.ui.layout;
    const { comingCard } = app.ui.download;
    const { pageColumn, section, untestedCallout } = app.ui.page;
    const { DOWNLOADS } = app.content;

    // Every file as a card, in sections: what you print, what you order, what you assemble, what you read.
    function filesSection() {
        const holder = stack(SPACE.lg);
        const view = region(holder);
        view.render(() => add(holder, para("Loading the file list…", { tone: "muted" })));
        app.need("explore").then(async () => {
            const { GROUPS, listFiles } = app.files.list;
            const all = await listFiles();
            view.render(() => {
                GROUPS.forEach(([title, kinds]) => {
                    const items = all.filter((item) => (item.group ? item.group === title : kinds.includes(item.kind)));
                    if (!items.length) return;
                    const wrap = grid(230, SPACE.md);
                    items.forEach((item) => add(wrap, app.ex.fileCard.fileCard(item)));
                    requestAnimationFrame(() => wrap.layout());
                    add(holder, add(stack(SPACE.sm), heading(3, `${title} · ${items.length}`), wrap));
                });
            });
        }).catch(() => {
            view.render(() => add(holder, para("The file list is not available. Open this page from the published site.", { tone: "muted" })));
        });
        return holder;
    }

    function build() {
        return pageColumn("Downloads", DOWNLOADS.lead,
            untestedCallout(DOWNLOADS.warning),
            section("firmware", "Firmware", comingCard("Firmware", DOWNLOADS.firmware)),
            section("files", "Files", filesSection()),
            section("order", "Order a board", list(DOWNLOADS.order, { ordered: true }), para(DOWNLOADS.flash, { size: FONT.sm, tone: "muted" })));
    }

    app.pages.downloads = { build };
})();
