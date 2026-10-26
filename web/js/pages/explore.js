// Explore page: the 3D viewer with its panel, keyboard shortcuts and deep links.
(() => {
    const { el, add, on, themed, watchViewport, track } = app.dom;
    const { state, setState, emit } = app.ex;
    const { SPACE, RADIUS, SIZE, FONT, px } = app.styles;
    const { isNarrow, isPhone } = app.ui.layout;
    const { label } = app.ui.text;
    const { actions, createViewer, createPanel, link } = app.ex;
    const { TOUR } = app.data;

    const DEFAULTS = { tab: "tour", tour: 0, guide: "glance", file: "board", spin: true, selected: null, isolate: false, mode: "target", explode: 1, layers: { usb: true, ctrl: true, power: true, radio: true } };
    const PRESET_KEYS = { 1: "front", 2: "rear", 3: "top", 4: "iso" };
    const TOAST_MS = 2200;
    const MIN_STAGE_H = 420;
    const NARROW_STAGE = 0.62;
    const NARROW_MIN = 380;
    const NARROW_ASPECT = 1.2;
    const HELP = "1-4 views · E explode · S spin · T tour · [ ] part · F focus · C copy link";

    function toastBox(parent) {
        const box = el("div", { position: "absolute", right: px(SPACE.md), bottom: px(SPACE.md), padding: `${px(SPACE.sm)} ${px(SPACE.md)}`, borderRadius: px(RADIUS.sm), opacity: "0", transition: "opacity .15s", pointerEvents: "none" });
        themed(box, { background: "accent", color: "onAccent" });
        box.style.fontFamily = app.styles.FONT.sans;
        box.style.fontSize = px(FONT.sm);
        let timer = 0;
        track(() => clearTimeout(timer));
        add(parent, box);
        return (text) => {
            box.textContent = text;
            box.style.opacity = "1";
            clearTimeout(timer);
            timer = setTimeout(() => { box.style.opacity = "0"; }, TOAST_MS);
        };
    }

    function bindKeys(toast) {
        const commands = {
            e: () => setState({ explode: state.explode > 0.5 ? 0 : 1 }),
            s: () => setState({ spin: !state.spin }),
            t: () => actions.goTour(state.tour + 1 >= TOUR.length ? 0 : state.tour + 1),
            "[": () => actions.stepPart(-1),
            "]": () => actions.stepPart(1),
            f: () => state.selected && emit("focus", state.selected),
            c: () => emit("share", el("div")),
            "?": () => toast(HELP),
        };
        on(window, "keydown", (evt) => {
            if (evt.ctrlKey || evt.metaKey || evt.altKey || /input|textarea/i.test(evt.target.tagName)) return;
            if (PRESET_KEYS[evt.key]) return emit("preset", PRESET_KEYS[evt.key]);
            const run = commands[evt.key.toLowerCase()];
            if (run) run();
        });
    }

    function build(query) {
        setState({ ...DEFAULTS, layers: { ...DEFAULTS.layers } });
        const root = el("div", { display: "flex", boxSizing: "border-box", position: "relative" });
        const stage = el("div", { position: "relative", flexShrink: "0" });
        const viewer = createViewer(stage);
        const panel = createPanel();
        panel.style.flexShrink = "0";
        add(root, stage, panel);
        const toast = toastBox(stage);
        bindKeys(toast);

        const place = (viewport) => {
            const narrow = isNarrow(viewport);
            const pad = isPhone(viewport) ? SPACE.md : SPACE.lg;
            const top = root.getBoundingClientRect().top + window.scrollY;
            const free = Math.max(MIN_STAGE_H, viewport.h - top - 2 * pad);
            const inner = viewport.w - 2 * pad;
            const stageW = narrow ? inner : inner - SIZE.panel - pad;
            const stageH = narrow ? Math.round(Math.max(NARROW_MIN, Math.min(viewport.h * NARROW_STAGE, inner * NARROW_ASPECT))) : free;
            Object.assign(root.style, { flexDirection: narrow ? "column" : "row", gap: px(pad), padding: px(pad) });
            Object.assign(stage.style, { width: px(stageW), height: px(stageH) });
            Object.assign(panel.style, { width: px(narrow ? inner : SIZE.panel), height: narrow ? "auto" : px(free) });
            viewer.resize(stageW, stageH);
        };
        watchViewport(place);
        requestAnimationFrame(() => place(app.state.state.viewport)); // once attached, the top offset is known
        link.readLink(query);
        link.syncLink();
        return root;
    }

    app.pages.explore = { build };
})();
