// Wires theme, layout and components together inside a host element (#app).
import { el, add, on, paint, themed } from "./dom.js";
import { state, setState, subscribe, saveTheme, onCommand, emit } from "./state.js";
import { applyTheme, FONT, LAYOUT } from "./theme.js";
import { px } from "./widgets.js";
import { createPanel } from "./components/panel.js";
import { goTour } from "./components/tour.js";
import { createViewer } from "./scene/viewer.js";
import { readLink, syncLink, writeLink } from "./link.js";

function computeLayout(host) {
    const { width, height } = host.getBoundingClientRect();
    const wide = width >= LAYOUT.breakpoint;
    const panelW = wide ? LAYOUT.panelWidth : width;
    const viewW = wide ? width - panelW : width;
    const viewH = wide ? height : Math.round(height * LAYOUT.narrowViewerShare);
    return { width, height, wide, panelW, viewW, viewH, panelH: wide ? height : height - viewH };
}

function applyLayout(host, parts) {
    const dims = computeLayout(host);
    if (dims.width < 2 || dims.height < 2) return;
    parts.viewer.resize(dims.viewW, dims.viewH);
    parts.panel.place(dims.wide ? dims.viewW : 0, dims.wide ? 0 : dims.viewH, dims.panelW, dims.panelH);
}

const HELP = "Shortcuts: 1-4 front/rear/top/iso · E explode · S spin · T tour · [ ] tour back/next · F fullscreen · C copy link";

function shortcuts(host) {
    on(window, "keydown", (evt) => {
        if (evt.metaKey || evt.ctrlKey || evt.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(evt.target.tagName)) return;
        const key = evt.key.toLowerCase();
        const views = { 1: "front", 2: "rear", 3: "top", 4: "iso" };
        if (views[key]) emit("preset", views[key]);
        else if (key === "e") setState({ explode: state.explode > 0.5 ? 0 : 1 });
        else if (key === "s") setState({ spin: !state.spin });
        else if (key === "t") { setState({ tab: "tour" }); goTour(state.tour); }
        else if (key === "[") goTour(state.tour - 1);
        else if (key === "]") goTour(state.tour + 1);
        else if (key === "f") { if (document.fullscreenElement) document.exitFullscreen(); else host.requestFullscreen && host.requestFullscreen(); }
        else if (key === "c") emit("share");
        else if (key === "?") emit("toast", HELP);
        else return;
        evt.preventDefault();
    });
}

function toaster(host) {
    const box = el("div", {
        position: "absolute", left: "50%", bottom: "48px", transform: "translateX(-50%)", padding: "8px 14px",
        borderRadius: "8px", borderWidth: "1px", borderStyle: "solid", fontSize: px(12), fontFamily: FONT.family,
        pointerEvents: "none", opacity: "0", transition: "opacity .2s", maxWidth: "80%", textAlign: "center", zIndex: "5",
    }, { role: "status" });
    themed(box, { background: "surface", borderColor: "line", color: "text" });
    add(host, box);
    let timer = 0;
    onCommand("toast", (msg) => {
        box.textContent = msg;
        box.style.opacity = "1";
        clearTimeout(timer);
        timer = setTimeout(() => { box.style.opacity = "0"; }, 4000);
    });
}

export function start(host) {
    Object.assign(host.style, { position: "relative", overflow: "hidden", fontFamily: FONT.family });
    themed(host, { background: "bg", color: "text" });
    const parts = { viewer: createViewer(host), panel: createPanel(host) };
    toaster(host);
    onCommand("share", async () => {
        const url = new URL(writeLink(), location.href).href;
        try { await navigator.clipboard.writeText(url); emit("toast", "Link to this view copied"); } catch (err) { emit("toast", url); }
    });
    paint(host, () => { document.documentElement.style.colorScheme = state.theme; });
    subscribe((patch) => { if ("theme" in patch) { saveTheme(); applyTheme(); } });
    // The site header owns the theme toggle and announces changes.
    on(window, "tandem:theme", (evt) => setState({ theme: evt.detail }));
    new ResizeObserver(() => applyLayout(host, parts)).observe(host);
    shortcuts(host);
    applyLayout(host, parts);
    readLink();
    if (!location.hash) goTour(0);
    syncLink();
}
