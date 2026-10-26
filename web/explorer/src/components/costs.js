import { add, el } from "../dom.js";
import { state, setState } from "../state.js";
import { BOM, SETUP } from "../data.js";
import { FONT, SPACE } from "../theme.js";
import { card, kvList, label, section, slider, stack, px } from "../widgets.js";

const QTY_RANGE = { min: 2, max: 30, step: 1 };
const euro = (value) => `€${value.toFixed(2)}`;
const sum = (rows, pick) => rows.reduce((total, row) => total + pick(row), 0);

export const bomTotal = () => sum(BOM, ([, qty, unit]) => qty * unit);
const setupMid = () => (sum(SETUP, (row) => row[1]) + sum(SETUP, (row) => row[2])) / 2;

export function build(qty) {
    const total = bomTotal() * qty + setupMid();
    return { total, each: total / qty };
}

function bomRow([name, qty, unit]) {
    const row = el("div", { display: "flex", justifyContent: "space-between", gap: px(SPACE.md) });
    add(row, label(`${name}${qty > 1 ? ` × ${qty}` : ""}`, { size: FONT.sm }), label(euro(qty * unit), { size: FONT.sm, tone: "muted", mono: true }));
    return row;
}

function bomCard() {
    const total = el("div", { display: "flex", justifyContent: "space-between", paddingTop: px(SPACE.sm) });
    add(total, label("Parts per unit", { weight: 600 }), label(euro(bomTotal()), { weight: 600, mono: true }));
    return card(...BOM.map(bomRow), total);
}

function orderCard() {
    const readout = stack(SPACE.xs);
    const draw = (qty) => {
        const calc = build(qty);
        readout.replaceChildren();
        add(readout, kvList([["Order total", euro(calc.total)], ["Per stick", euro(calc.each)]]));
    };
    const title = label(`Build ${state.qty} sticks`, { size: FONT.lg, weight: 600 });
    const input = slider({
        ...QTY_RANGE, value: state.qty, ariaLabel: "Quantity",
        onInput: (value) => { setState({ qty: value }); title.textContent = `Build ${value} sticks`; draw(value); },
    });
    draw(state.qty);
    return card(title, input, readout);
}

export function renderCosts(box) {
    const setup = kvList(SETUP.map(([name, low, high]) => [name, `€${low} – €${high}`]));
    const note = label("Rough estimates at hobby quantities, ±30%, not quotes. Part families are candidates: check datasheets and stock before layout. One stick stays in your computer, the rest go in targets. For your own use only. Selling a radio product in the EU would need CE/RED compliance.", { size: FONT.xs, tone: "muted" });
    add(box, orderCard(), section("Parts", bomCard()), section("One-time setup", setup), note);
}
