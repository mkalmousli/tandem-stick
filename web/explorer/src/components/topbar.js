import { el, add, themed } from "../dom.js";
import { state, setState, subscribe } from "../state.js";
import { FONT, LAYOUT, SPACE } from "../theme.js";
import { PRODUCT } from "../data.js";
import { button, label, px } from "../widgets.js";

const themeLabel = () => (state.theme === "dark" ? "Dark" : "Light");

export function createTopbar(parent) {
    const bar = el("div", {
        position: "absolute", left: "0px", top: "0px", height: px(LAYOUT.topbar), display: "flex",
        alignItems: "center", justifyContent: "space-between", padding: `0 ${px(SPACE.lg)}`,
        borderBottomWidth: "1px", borderBottomStyle: "solid",
    });
    themed(bar, { background: "surface", borderBottomColor: "line" });

    const left = el("div", { display: "flex", alignItems: "baseline", gap: px(SPACE.md) });
    add(left, label(PRODUCT.name, { size: FONT.lg, weight: 600 }), label(PRODUCT.status, { size: FONT.sm, tone: "muted" }));

    const toggle = button({
        label: themeLabel(), pressed: state.theme === "dark", ariaLabel: "Dark mode",
        onClick: () => setState({ theme: state.theme === "dark" ? "light" : "dark" }),
    });
    subscribe((patch) => {
        if (!("theme" in patch)) return;
        toggle.textContent = themeLabel();
        toggle.setPressed(state.theme === "dark");
    });

    add(bar, left, toggle);
    add(parent, bar);
    return { el: bar, resize: (w) => { bar.style.width = px(w); } };
}
