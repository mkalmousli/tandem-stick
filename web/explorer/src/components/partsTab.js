// One place for everything physical: exploded-view control, every part of the stick, and the selected part's details.
import { add, el } from "../dom.js";
import { state, setState } from "../state.js";
import { selectItem } from "../actions.js";
import { ITEMS, BOARD_FACTS, SIZE_FACTS, findItem } from "../data.js";
import { FONT, SPACE } from "../theme.js";
import { button, kvList, label, section, slider, wrapRow, px } from "../widgets.js";
import { itemCard, hintCard } from "./itemCard.js";

const percent = (value) => `${Math.round(value * 100)}%`;

function explodeControls() {
    const readout = label(percent(state.explode), { size: FONT.sm, tone: "muted" });
    const input = slider({
        min: 0, max: 1, step: 0.01, value: state.explode, ariaLabel: "Explode amount",
        onInput: (value) => { setState({ explode: value }); readout.textContent = percent(value); },
    });
    const jump = (value) => () => { setState({ explode: value }); input.value = String(value); readout.textContent = percent(value); };
    const row = wrapRow(SPACE.sm);
    add(row, button({ label: "Assemble", onClick: jump(0), grow: true }), button({ label: "Explode", onClick: jump(1), grow: true }));
    const head = el("div", { display: "flex", justifyContent: "space-between" });
    add(head, label("Case open", { size: FONT.sm }), readout);
    return section("Exploded view", head, input, row);
}

export function renderParts(box) {
    const picked = findItem(state.selected);
    const rows = ITEMS.map((item) => button({
        label: item.name, kind: "row", pressed: item.id === state.selected, onClick: () => selectItem(item.id, { fly: true }),
    }));
    add(box, explodeControls(), section("Parts (or click one on the model)", ...rows),
        picked ? itemCard(picked) : hintCard("Pick a part to zoom to it and read what it does."),
        section("Size and board", kvList([...SIZE_FACTS, ...BOARD_FACTS])));
}
