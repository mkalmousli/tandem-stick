// Explore page: the 3D viewer with its panel, keyboard shortcuts and deep links.
(() => {
    const { el, add, on, themed, watchViewport, track } = app.dom;
    const { state, setState, emit, subscribe } = app.ex;
    const { SPACE, RADIUS, SIZE, FONT, px } = app.styles;
    const { isNarrow, isPhone } = app.ui.layout;
    const { label } = app.ui.text;
    const { actions, createViewer, createPanel, link } = app.ex;
    const { button } = app.ui.button;
    const PHONE_ZOOM = 1.18;
    const { TOUR } = app.data;

    const DEFAULTS = { tab: "tour", tour: 0, build: 0, buildMode: "full", guide: "glance", file: "board", spin: true, selected: null, isolate: false, mode: "target", explode: 1, layers: { usb: true, ctrl: true, power: true, radio: true } };
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

    // Panel width follows what it shows: reading text needs less room than a board render.
    const WIDTHS = { tour: 380, parts: 400, signal: 420, build: 420, guide: 520, files: 580 };

    function build(query) {
        setState({ ...DEFAULTS, layers: { ...DEFAULTS.layers } });
        const root = el("div", { display: "flex", flexDirection: "column", boxSizing: "border-box", position: "relative" });
        const stage = el("div", { position: "relative", flexShrink: "0" });
        const viewer = createViewer(stage);
        const panel = createPanel();
        const toggle = button({ label: "Hide panel", kind: "tab", pressed: false, onClick: () => { hidden = !hidden; place(app.state.state.viewport); } });
        add(root, stage);
        const toast = toastBox(stage);
        bindKeys(toast);
        link.readLink(query);
        link.syncLink();

        let hidden = false;
        let size = { stageW: 1, stageH: 1, pad: SPACE.lg, over: true };
        const placePanel = () => {
            const { stageW, stageH, pad, over } = size;
            toggle.setPressed(hidden);
            toggle.textContent = hidden ? "Show panel" : "Hide panel";
            if (!over) {
                Object.assign(panel.style, { position: "static", display: "flex", width: px(stageW), height: "auto", zoom: String(PHONE_ZOOM) });
                return;
            }
            const width = Math.min(WIDTHS[state.tab] || SIZE.panel, stageW - 2 * pad);
            Object.assign(panel.style, { position: "absolute", display: hidden ? "none" : "flex", right: px(pad), top: px(pad + SIZE.control + SPACE.sm), width: px(width), height: px(stageH - 2 * pad - SIZE.control - SPACE.sm), zoom: "1", overflowY: "hidden" });
            panel.lastChild.style.overflowY = "auto";
        };
        const place = (viewport) => {
            const narrow = isNarrow(viewport);
            const pad = isPhone(viewport) ? SPACE.md : SPACE.lg;
            const top = root.getBoundingClientRect().top + window.scrollY;
            const free = Math.max(MIN_STAGE_H, viewport.h - top - 2 * pad);
            const inner = viewport.w - 2 * pad;
            const stageH = narrow ? Math.round(Math.max(NARROW_MIN, Math.min(viewport.h * NARROW_STAGE, inner * NARROW_ASPECT))) : free;
            Object.assign(root.style, { gap: px(pad), padding: px(pad) });
            Object.assign(stage.style, { width: px(inner), height: px(stageH) });
            size = { stageW: inner, stageH, pad, over: !narrow };
            if (narrow) { if (panel.parentNode !== root) add(root, panel); if (toggle.parentNode) toggle.remove(); panel.lastChild.style.overflowY = "visible"; }
            else { if (panel.parentNode !== stage) add(stage, panel); if (toggle.parentNode !== stage) add(stage, toggle); }
            Object.assign(toggle.style, { position: "absolute", right: px(pad), top: px(pad) });
            placePanel();
            viewer.resize(inner, stageH);
        };
        subscribe((patch) => { if ("tab" in patch && size.over) placePanel(); });
        watchViewport(place);
        requestAnimationFrame(() => place(app.state.state.viewport)); // once attached, the top offset is known
        return root;
    }

    app.pages.explore = { build };
})();
