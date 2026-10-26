// Right-hand (or lower) panel: product header, tab bar, and the active tab's content.
import { el, add, clear, themed } from "../dom.js";
import { state, setState, subscribe } from "../state.js";
import { PRODUCT } from "../data.js";
import { FONT, RADIUS, SPACE } from "../theme.js";
import { button, label, stack, wrapRow, px } from "../widgets.js";
import { renderTour } from "./tour.js";
import { renderParts } from "./partsTab.js";
import { renderSignal } from "./signal.js";

const TABS = [
    ["tour", "Tour", renderTour],
    ["parts", "Parts", renderParts],
    ["signal", "Signal", renderSignal],
];

// Which state changes force the active tab to rebuild. Slider-driven fields are excluded on purpose.
const REBUILD = {
    tour: ["tab", "tour"],
    parts: ["tab", "selected", "isolate"],
    signal: ["tab", "mode", "layers"],
};

function buildHeader() {
    return add(stack(SPACE.xs), label(PRODUCT.name, { size: FONT.xl, weight: 600 }), label("Guided tour, every part, and the signal paths. Each part lists its real design files. The roadmap is on the Plan page.", { size: FONT.sm, tone: "muted" }));
}

function buildTabs() {
    const row = el("div", { display: "flex", gap: px(SPACE.xs) });
    const buttons = TABS.map(([key, text]) => {
        const btn = button({ label: text, kind: "tab", grow: true, pressed: key === state.tab, onClick: () => setState({ tab: key }) });
        add(row, btn);
        return [key, btn];
    });
    subscribe((patch) => {
        if ("tab" in patch) buttons.forEach(([key, btn]) => btn.setPressed(key === state.tab));
    });
    return row;
}

export function createPanel(parent) {
    const panel = el("div", {
        position: "absolute", overflowY: "auto", overflowX: "hidden", padding: px(SPACE.lg),
        display: "flex", flexDirection: "column", gap: px(SPACE.lg), borderLeftWidth: "1px", borderLeftStyle: "solid",
    });
    themed(panel, { background: "bg", borderLeftColor: "line", borderTopColor: "line" });
    const content = stack(SPACE.lg);

    function renderContent() {
        clear(content);
        TABS.find(([key]) => key === state.tab)[2](content);
    }

    subscribe((patch) => {
        if (REBUILD[state.tab].some((key) => key in patch)) renderContent();
    });
    add(panel, buildHeader(), buildTabs(), content);
    add(parent, panel);
    renderContent();
    return {
        el: panel,
        place(left, top, w, h) {
            Object.assign(panel.style, { left: px(left), top: px(top), width: px(w), height: px(h) });
            panel.style.borderLeftWidth = left > 0 ? "1px" : "0px";
            panel.style.borderTopWidth = left > 0 ? "0px" : "1px";
            panel.style.borderTopStyle = "solid";
        },
    };
}
