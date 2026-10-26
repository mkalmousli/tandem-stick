// Explore page: the 3D viewer with its panel, keyboard shortcuts and deep links.
(() => {
    const { el, add, on, themed, watchViewport, track } = app.dom;
    const { state, setState, emit, subscribe, onCommand } = app.ex;
    const { SPACE, RADIUS, SIZE, FONT, px } = app.styles;
    const { isNarrow, isPhone } = app.ui.layout;
    const { label } = app.ui.text;
    const { actions, createViewer, createPanel, link } = app.ex;
    const { button } = app.ui.button;
    const { TOUR } = app.data;

    const DEFAULTS = { tab: "tour", tour: 0, build: 0, buildMode: null, guide: "glance", file: "board", spin: true, selected: null, isolate: false, mode: "target", explode: 1, layers: { usb: true, ctrl: true, power: true, radio: true } };
    const PRESET_KEYS = { 1: "front", 2: "rear", 3: "top", 4: "iso" };
    const TOAST_MS = 2200;
    const MIN_STAGE_H = 420;
    const NARROW_MIN = 380;
    const HELP = "1-4 views · E explode · I isolate · S spin · T tour · [ ] part · F focus · C copy link";

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
            i: () => (state.selected ? setState({ isolate: !state.isolate }) : toast("Pick a part first")),
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

    // One panel width for every tab, so nothing jumps; drag the left edge to change it.
    const PANEL_KEY = "tandem-panel";
    const PANEL_DEFAULT = 460;
    const PANEL_MIN = 340;
    const PANEL_SHARE = 0.65;
    const GRIP = 12;

    function savedWidth() {
        try { return Number(localStorage.getItem(PANEL_KEY)) || PANEL_DEFAULT; } catch (err) { return PANEL_DEFAULT; }
    }
    function saveWidth(value) {
        try { localStorage.setItem(PANEL_KEY, String(Math.round(value))); } catch (err) { /* width just will not persist */ }
    }

    // A thin handle on the panel's left edge. Reports the wanted width while dragging.
    function buildGrip(getWidth, onWidth) {
        const grip = el("div", { position: "absolute", top: "0px", bottom: "0px", width: px(GRIP), cursor: "col-resize", touchAction: "none", zIndex: "2" }, { role: "separator", "aria-orientation": "vertical", "aria-label": "Resize panel", tabindex: "0" });
        const bar = el("div", { position: "absolute", top: "50%", left: "50%", width: "4px", height: "40px", marginLeft: "-2px", marginTop: "-20px", borderRadius: "2px" });
        themed(bar, { background: "muted" });
        bar.style.opacity = "0.5";
        add(grip, bar);
        let from = null;
        on(grip, "pointerdown", (evt) => { from = { x: evt.clientX, w: getWidth() }; grip.setPointerCapture(evt.pointerId); bar.style.opacity = "1"; });
        on(grip, "pointermove", (evt) => { if (from) onWidth(from.w + from.x - evt.clientX, false); });
        const end = () => { if (from) onWidth(getWidth(), true); from = null; bar.style.opacity = "0.5"; };
        on(grip, "pointerup", end);
        on(grip, "pointercancel", end);
        on(grip, "keydown", (evt) => {
            const step = { ArrowLeft: 24, ArrowRight: -24 }[evt.key];
            if (step) { evt.preventDefault(); onWidth(getWidth() + step, true); }
        });
        return grip;
    }

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
        onCommand("toast", toast);
        link.readLink(query);
        link.syncLink();

        // On phones the 3D view only gets the part the sheet leaves free.
        const sheet = app.ex.sheet.createSheet(panel, (visible) => viewer.resize(size.stageW, Math.round(Math.max(size.stageH - visible, size.stageH * 0.3))));
        subscribe((patch) => { if ("tab" in patch || patch.selected) sheet.open(); }); // picking a tab or a part shows its content
        let hidden = false;
        let wanted = savedWidth();
        let size = { stageW: 1, stageH: 1, pad: SPACE.lg, over: true, panelW: PANEL_DEFAULT };
        const grip = buildGrip(() => size.panelW, (value, done) => { wanted = value; placePanel(); if (done) saveWidth(size.panelW); });
        const placePanel = () => {
            const { stageW, stageH, pad, over } = size;
            toggle.setPressed(hidden);
            toggle.textContent = hidden ? "Show panel" : "Hide panel";
            if (!over) {
                viewer.setInset(0);
                grip.style.display = "none";
                Object.assign(panel.style, { position: "absolute", display: "flex", right: "0px", top: "auto", width: "auto", zoom: "1" });
                return;
            }
            const width = Math.round(Math.max(PANEL_MIN, Math.min(wanted, stageW * PANEL_SHARE)));
            size.panelW = width;
            viewer.setInset(hidden ? 0 : width + pad);
            Object.assign(grip.style, { left: "0px", display: hidden ? "none" : "block" });
            Object.assign(panel.style, { position: "absolute", display: hidden ? "none" : "flex", right: px(pad), top: px(pad + SIZE.control + SPACE.sm), width: px(width), height: px(stageH - 2 * pad - SIZE.control - SPACE.sm), zoom: "1", overflowY: "hidden" });
            panel.bodyNode.style.overflowY = "auto";
        };
        const place = (viewport) => {
            const narrow = isNarrow(viewport);
            const pad = isPhone(viewport) ? SPACE.md : SPACE.lg;
            const top = root.getBoundingClientRect().top + window.scrollY;
            const free = Math.max(MIN_STAGE_H, viewport.h - top - 2 * pad);
            const inner = viewport.w - 2 * pad;
            const stageH = narrow ? Math.round(Math.max(NARROW_MIN, viewport.h - top - 2 * pad)) : free;
            Object.assign(root.style, { gap: px(pad), padding: px(pad) });
            Object.assign(stage.style, { width: px(inner), height: px(stageH) });
            Object.assign(size, { stageW: inner, stageH, pad, over: !narrow });
            if (panel.parentNode !== stage) add(stage, panel);
            if (narrow) { if (toggle.parentNode) toggle.remove(); panel.bodyNode.style.overflowY = "auto"; sheet.attach(); sheet.layout(stageH); }
            else { sheet.detach(); if (grip.parentNode !== panel) add(panel, grip); if (toggle.parentNode !== stage) add(stage, toggle); }
            Object.assign(toggle.style, { position: "absolute", right: px(pad), top: px(pad) });
            placePanel();
            if (!narrow) viewer.resize(inner, stageH);
        };
        watchViewport(place);
        requestAnimationFrame(() => place(app.state.state.viewport)); // once attached, the top offset is known
        return root;
    }

    app.pages.explore = { build };
})();
