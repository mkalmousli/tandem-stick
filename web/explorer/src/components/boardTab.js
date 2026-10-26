import { add, el } from "../dom.js";
import { state, setState } from "../state.js";
import { selectItem } from "../actions.js";
import { CHIPS, BOARD_FACTS, SIZE_FACTS, findItem } from "../data.js";
import { FONT, SPACE } from "../theme.js";
import { button, kvList, label, section, slider, wrapRow, px } from "../widgets.js";
import { itemCard, hintCard } from "./itemCard.js";

const groupOf = (id) => {
    if (id === "esp") return "Compute and radio";
    return "Power and status";
};

const GROUP_ORDER = ["Compute and radio", "Power and status"];
const percent = (value) => `${Math.round(value * 100)}%`;

const select = (id) => selectItem(id, { fly: true });

function explodeControls() {
    const readout = label(percent(state.explode), { size: FONT.sm, tone: "muted" });
    const input = slider({
        min: 0, max: 1, step: 0.01, value: state.explode, ariaLabel: "Explode amount",
        onInput: (value) => { setState({ explode: value }); readout.textContent = percent(value); },
    });
    const jump = (value) => () => {
        setState({ explode: value });
        input.value = String(value);
        readout.textContent = percent(value);
    };
    const row = wrapRow(SPACE.sm);
    add(row, button({ label: "Assemble", onClick: jump(0), grow: true }), button({ label: "Explode", onClick: jump(1), grow: true }));
    const head = el("div", { display: "flex", justifyContent: "space-between" });
    add(head, label("Separation", { size: FONT.sm }), readout);
    return section("Exploded view", head, input, row);
}

function partGroups() {
    return GROUP_ORDER.map((name) => {
        const rows = CHIPS.filter((chip) => groupOf(chip.id) === name).map((chip) => button({
            label: chip.name, kind: "row", pressed: chip.id === state.selected, onClick: () => select(chip.id),
        }));
        return section(name, ...rows);
    });
}

export function renderBoard(box) {
    const picked = findItem(state.selected);
    const isChip = picked && picked.type === "chip";
    add(box, explodeControls(), isChip ? itemCard(picked) : hintCard("Pick a part to open the case and zoom to it."));
    add(box, ...partGroups(), section("Size budget", kvList(SIZE_FACTS)), section("Board and case", kvList(BOARD_FACTS)));
}
