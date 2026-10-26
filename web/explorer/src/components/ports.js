import { add } from "../dom.js";
import { state } from "../state.js";
import { selectItem } from "../actions.js";
import { PORTS, findItem } from "../data.js";
import { button, section } from "../widgets.js";
import { itemCard, hintCard } from "./itemCard.js";

const select = (id) => selectItem(id, { fly: true });

function sectionsOf(items) {
    const order = [];
    items.forEach((item) => { if (!order.includes(item.section)) order.push(item.section); });
    return order.map((name) => [name, items.filter((item) => item.section === name)]);
}

export function renderPorts(box) {
    const picked = findItem(state.selected);
    const isPort = picked && picked.type === "port";
    add(box, isPort ? itemCard(picked) : hintCard("Pick a port in the list or click it on the model."));
    sectionsOf(PORTS).forEach(([name, items]) => {
        const rows = items.map((item) => button({
            label: item.name, kind: "row", pressed: item.id === state.selected, onClick: () => select(item.id),
        }));
        add(box, section(name, ...rows));
    });
}
