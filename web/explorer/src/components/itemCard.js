import { label, card, kvList } from "../widgets.js";
import { add } from "../dom.js";
import { FONT } from "../theme.js";

export function itemCard(item) {
    const box = card(label(item.name, { size: FONT.lg, weight: 600 }));
    if (item.part) add(box, label(item.part, { size: FONT.sm, tone: "muted", mono: true }));
    add(box, label(item.blurb, { size: FONT.md }), kvList(item.specs));
    return box;
}

export function hintCard(text) {
    return card(label(text, { size: FONT.md, tone: "muted" }));
}
