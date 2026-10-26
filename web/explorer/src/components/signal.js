import { add } from "../dom.js";
import { state, setState } from "../state.js";
import { LAYER_INFO, MODES, PAIRING } from "../data.js";
import { FONT, SPACE } from "../theme.js";
import { button, card, kvList, label, section, wrapRow } from "../widgets.js";

function modeButtons() {
    const row = wrapRow(SPACE.sm);
    MODES.forEach(([key, name]) => {
        add(row, button({ label: name, kind: "tab", grow: true, pressed: key === state.mode, onClick: () => setState({ mode: key }) }));
    });
    return row;
}

function layerButtons() {
    const row = wrapRow(SPACE.sm);
    LAYER_INFO.forEach(([key, name]) => {
        add(row, button({
            label: name, kind: "tab", grow: true, pressed: state.layers[key], ariaLabel: `${name} traces`,
            onClick: () => setState({ layers: { ...state.layers, [key]: !state.layers[key] } }),
        }));
    });
    return row;
}

export function renderSignal(box) {
    const [, name, rows] = MODES.find(([key]) => key === state.mode);
    const notes = LAYER_INFO.map(([, title, note]) => label(`${title}: ${note}`, { size: FONT.sm, tone: "muted" }));
    add(box,
        section("Role of this stick", modeButtons()),
        card(label(name, { size: FONT.lg, weight: 600 }), kvList(rows)),
        section("Pairing", kvList(PAIRING)),
        section("Layers", layerButtons()),
        section("Legend", ...notes));
}
