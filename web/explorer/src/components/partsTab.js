// One place for everything physical: exploded-view control, every part of the stick, previews and the real files.
import { add, el, paint } from "../dom.js";
import { state, setState, subscribe } from "../state.js";
import { selectItem } from "../actions.js";
import { PART_ORDER, BOARD_FACTS, SIZE_FACTS, findItem } from "../data.js";
import { FONT, SPACE, RADIUS } from "../theme.js";
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

function step(delta) {
    const at = PART_ORDER.indexOf(state.selected);
    const next = PART_ORDER[(at + delta + PART_ORDER.length) % PART_ORDER.length];
    selectItem(next, { fly: true });
}

function previewBar() {
    const row = wrapRow(SPACE.sm);
    const iso = button({ label: "Isolate", pressed: state.isolate, ariaLabel: "Show only this part", onClick: () => setState({ isolate: !state.isolate }) });
    add(row, button({ label: "◀ Prev", onClick: () => step(-1), grow: true }), button({ label: "Next ▶", onClick: () => step(1), grow: true }), iso);
    return row;
}

function download(name, href) {
    const a = el("a", {
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: px(SPACE.sm), textDecoration: "none",
        padding: `${px(SPACE.sm)} ${px(SPACE.md)}`, borderRadius: px(RADIUS.sm), borderWidth: "1px", borderStyle: "solid",
        fontSize: px(FONT.md), fontFamily: FONT.family,
    }, { href, download: href.split("/").pop(), text: name });
    add(a, label("↓ " + href.split("/").pop().split(".").pop().toUpperCase(), { size: FONT.xs, tone: "muted", mono: true }));
    paint(a, (p) => { a.style.background = p.raised; a.style.color = p.text; a.style.borderColor = p.line; });
    return a;
}

function downloads(item) {
    if (!item.files) return null;
    return section("Download the real files", ...item.files.map(([name, href]) => download(name, href)));
}

export function renderParts(box) {
    const picked = findItem(state.selected);
    const rows = PART_ORDER.map((id) => {
        const item = findItem(id);
        return button({ label: item.name, kind: "row", pressed: id === state.selected, onClick: () => selectItem(id, { fly: true }) });
    });
    add(box, section("Parts (or click one on the model)", ...rows, previewBar()),
        picked ? itemCard(picked) : hintCard("Pick a part to zoom to it, read what it does and download its files."));
    if (picked) { const dl = downloads(picked); if (dl) add(box, dl); }
    add(box, explodeControls(), section("Size and board", kvList([...SIZE_FACTS, ...BOARD_FACTS])));
}
