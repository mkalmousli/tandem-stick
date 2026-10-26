// Side panel: Tour, Parts, Signal, Guide and Files tabs.
(() => {
    const { el, add, themed, region, scroller } = app.dom;
    const { state, setState, subscribe } = app.ex;
    const { selectItem, goTour, stepPart } = app.ex.actions;
    const { SPACE, RADIUS, FONT, px } = app.styles;
    const { label, para, heading } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row } = app.ui.layout;
    const { kvList, badge } = app.ui.card;
    const { table } = app.ui.table;
    const { fileLink } = app.ui.download;
    const { TOUR, ITEMS, PART_ORDER, findItem, MODES, PAIRING, LAYER_INFO, SIZE_FACTS, BOARD_FACTS } = app.data;
    const { ROLES } = app.content;

    const TABS = [["tour", "Tour"], ["parts", "Parts"], ["signal", "Signal"], ["build", "Build"], ["guide", "Guide"], ["files", "Files"]];
    // Which state keys make each view redraw, so a window is not rebuilt for changes it does not show.
    const KEYS = { tour: ["tour"], parts: ["selected", "isolate", "explode"], signal: ["mode", "layers"], build: ["build", "buildMode"], guide: ["guide"], files: ["file"] };
    const EXPLODE_ON = 1;

    const group = (title, ...children) => add(stack(SPACE.sm), label(title.toUpperCase(), { size: FONT.xs, weight: FONT.bold, tone: "muted" }), children);

    function tourView() {
        const step = TOUR[state.tour];
        const last = state.tour === TOUR.length - 1;
        const dots = row(SPACE.xs);
        TOUR.forEach((_, idx) => add(dots, button({ label: String(idx + 1), kind: "tab", pressed: idx === state.tour, ariaLabel: `Step ${idx + 1}`, onClick: () => goTour(idx) })));
        const nav = row(SPACE.sm);
        add(nav,
            button({ label: "Back", grow: true, onClick: () => goTour(state.tour - 1) }),
            button({ label: last ? "Restart" : "Next", kind: "solid", grow: true, onClick: () => goTour(last ? 0 : state.tour + 1) }));
        const target = step.focus ? findItem(step.focus) : null;
        return {
            body: [
                label(`Step ${state.tour + 1} of ${TOUR.length}`, { size: FONT.xs, tone: "muted" }),
                heading(2, step.title),
                para(step.text, { size: FONT.md }),
                target ? button({ label: `Open ${target.name} in Parts`, onClick: () => selectItem(target.id, { fly: true }) }) : null,
                group("Size", kvList(SIZE_FACTS)),
            ],
            foot: add(stack(SPACE.sm), dots, nav),
        };
    }

    function itemCard(item) {
        const has = item.files && item.files.length;
        const preview = has
            ? button({ label: "Preview the files", kind: "solid", onClick: () => setState({ tab: "files", file: item.files.some(([, href]) => /stl/.test(href)) ? (/lid/i.test(item.id) ? "lid" : "tray") : "board" }) })
            : null;
        const files = has ? group("Download the real files", ...item.files.map(([text, href]) => fileLink(text, href))) : null;
        return [
            add(row(SPACE.sm), heading(2, item.name), badge(item.section || item.type, "muted")),
            item.part ? label(item.part, { size: FONT.sm, tone: "muted", mono: true }) : null,
            para(item.blurb, { size: FONT.md }),
            kvList(item.specs || []),
            preview, files,
        ];
    }

    const pager = () => add(row(SPACE.sm),
        button({ label: "Prev part", grow: true, onClick: () => stepPart(-1), ariaLabel: "Previous part" }),
        button({ label: "Next part", kind: "solid", grow: true, onClick: () => stepPart(1), ariaLabel: "Next part" }));

    function partsView() {
        const picker = row(SPACE.xs);
        PART_ORDER.forEach((id) => {
            const item = findItem(id);
            add(picker, button({ label: item.name, kind: "tab", pressed: id === state.selected, onClick: () => selectItem(id, { fly: true }) }));
        });
        const item = state.selected ? findItem(state.selected) : null;
        const hint = para("Pick a part here, or click it in the 3D view. Each part has its real files to download.", { size: FONT.sm, tone: "muted" });
        return { body: [picker, item ? itemCard(item) : [hint, group("Board", kvList(BOARD_FACTS))]], foot: pager() };
    }

    function modeCards() {
        const picker = row(SPACE.sm);
        MODES.forEach(([id, name]) => add(picker, button({ label: name, kind: "tab", pressed: state.mode === id, grow: true, onClick: () => setState({ mode: id }) })));
        const active = MODES.find(([id]) => id === state.mode);
        return [picker, kvList(active[2])];
    }

    function layerToggles() {
        const box = row(SPACE.xs);
        LAYER_INFO.forEach(([id, name, note]) => {
            add(box, button({ label: name, kind: "tab", pressed: state.layers[id], ariaLabel: `${name}: ${note}`, onClick: () => setState({ layers: { ...state.layers, [id]: !state.layers[id] } }) }));
        });
        return [box, para(LAYER_INFO.map(([, name, note]) => `${name}: ${note}`).join(" · "), { size: FONT.xs, tone: "muted" })];
    }

    function signalView() {
        const pairing = stack(SPACE.sm);
        PAIRING.forEach(([head, text]) => add(pairing, add(stack(2), label(head, { size: FONT.sm, weight: FONT.bold }), para(text, { size: FONT.sm, tone: "muted" }))));
        return [
            para("One host stick talks to many target sticks. The pulses are radio traffic.", { size: FONT.md }),
            group("Role", ...modeCards()),
            group("Host or target?", para(ROLES.lead, { size: FONT.sm }), table({ head: ROLES.head, rows: ROLES.rows, boldFirst: true })),
            group("Layers", ...layerToggles()),
            group("Pairing", pairing),
        ];
    }

    function guideView() {
        const picker = row(SPACE.xs);
        app.ex.guide.SECTIONS.forEach(({ id, title }) => add(picker, button({ label: title, kind: "tab", pressed: id === state.guide, onClick: () => setState({ guide: id }) })));
        const section = app.ex.guide.SECTIONS.find(({ id }) => id === state.guide) || app.ex.guide.SECTIONS[0];
        const sections = app.ex.guide.SECTIONS;
        const at = sections.indexOf(section);
        const go = (to) => setState({ guide: sections[(to + sections.length) % sections.length].id });
        const foot = add(row(SPACE.sm), button({ label: "Back", grow: true, onClick: () => go(at - 1) }), button({ label: "Next", kind: "solid", grow: true, onClick: () => go(at + 1) }));
        return { body: [picker, heading(2, section.title), ...section.build()], foot };
    }

    const VIEWS = { tour: tourView, parts: partsView, signal: signalView, build: () => app.ex.build.buildView(), guide: guideView, files: () => app.ex.files.filesView() };

    // One panel with a tab bar. The tab follows what you do: picking a part opens Parts, the tour opens Tour.
    function createPanel() {
        const panel = el("div", { display: "flex", flexDirection: "column", gap: px(SPACE.md), padding: px(SPACE.lg), boxSizing: "border-box", borderRadius: px(RADIUS.md), borderWidth: "1px", borderStyle: "solid" });
        themed(panel, { background: (palette) => `${palette.surface}f2`, borderColor: "line" });
        const tabs = row(SPACE.xs, { flexWrap: "wrap", flexShrink: "0" });
        const body = scroller(el("div", { flexGrow: "1", minHeight: "0px", display: "flex", flexDirection: "column", gap: px(SPACE.md) }));
        const foot = el("div", { flexShrink: "0", display: "flex", flexDirection: "column", gap: px(SPACE.sm) });
        const view = region(body);
        const footView = region(foot);
        TABS.forEach(([id, text]) => {
            const btn = button({ label: text, kind: "tab", pressed: state.tab === id, grow: true, onClick: () => setState({ tab: id }) });
            subscribe(() => btn.setPressed(state.tab === id));
            add(tabs, btn);
        });
        const draw = () => {
            const out = VIEWS[state.tab]();
            const parts = Array.isArray(out) ? { body: out } : out;
            view.render(() => { body.scrollTop = 0; add(body, parts.body); });
            footView.render(() => { foot.style.display = parts.foot ? "flex" : "none"; if (parts.foot) add(foot, parts.foot); });
        };
        draw();
        subscribe((patch) => { if ("tab" in patch || KEYS[state.tab].some((key) => key in patch)) draw(); });
        panel.bodyNode = body;
        return add(panel, tabs, body, foot);
    }

    app.ex.createPanel = createPanel;
    app.ex.TABS = TABS;
})();
