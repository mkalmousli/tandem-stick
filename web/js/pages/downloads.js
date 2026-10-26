// Downloads page: untested warning, firmware placeholder, bundles, checksummed file table, ordering steps.
(() => {
    const { add, el, on, themed, interact, focusRing, region } = app.dom;
    const { SPACE, FONT } = app.styles;
    const { para, list, label } = app.ui.text;
    const { grid, stack } = app.ui.layout;
    const { downloadCard, comingCard, fileLink } = app.ui.download;
    const { button } = app.ui.button;
    const { table } = app.ui.table;
    const { pageColumn, section, untestedCallout } = app.ui.page;
    const { DOWNLOADS } = app.content;

    const MANIFEST_URL = "files/manifest.json";
    const KIB = 1024;

    const size = (bytes) => (bytes < KIB * KIB ? `${(bytes / KIB).toFixed(1)} KB` : `${(bytes / KIB / KIB).toFixed(1)} MB`);

    async function sha256(url) {
        const buf = await (await fetch(url)).arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    function bundleCards(files) {
        const wrap = grid(240, SPACE.md);
        Object.keys(DOWNLOADS.bundles).forEach((path) => {
            const [title, note] = DOWNLOADS.bundles[path];
            const info = files.find((file) => file.path === path);
            add(wrap, downloadCard({ title, note, href: `files/${path}`, meta: info ? size(info.bytes) : "" }));
        });
        requestAnimationFrame(() => wrap.layout());
        return wrap;
    }

    // One row per file, with a button that downloads it and compares its SHA-256 with the manifest.
    function fileTable(files) {
        const box = stack(SPACE.sm);
        const status = label("", { size: FONT.sm, tone: "muted" });
        files.forEach((file) => {
            const row = el("div", { display: "flex", alignItems: "center", justifyContent: "space-between", gap: `${SPACE.md}px`, flexWrap: "wrap" });
            const verify = button({ label: "Verify", onClick: async () => {
                status.textContent = `Checking ${file.path}…`;
                try {
                    const same = (await sha256(`files/${file.path}`)) === file.sha256;
                    status.textContent = same ? `${file.path}: checksum matches` : `${file.path}: checksum DOES NOT match`;
                } catch (err) {
                    status.textContent = `${file.path}: could not check (${err.message})`;
                }
            } });
            add(row, add(el("div", { flexGrow: "1" }), fileLink(`${file.path} · ${size(file.bytes)}`, `files/${file.path}`)), verify);
            add(box, row);
        });
        return add(box, status);
    }

    function filesSection() {
        const holder = stack(SPACE.md);
        const view = region(holder);
        view.render(() => add(holder, para("Loading the file list…", { tone: "muted" })));
        fetch(MANIFEST_URL).then((res) => res.json()).then(({ files }) => {
            view.render(() => add(holder, bundleCards(files), fileTable(files)));
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
