// Cross-component commands.
import { state, setState, emit } from "./state.js";
import { findItem } from "./data.js";

const OPEN_THRESHOLD = 0.6;

// Select a port or chip; chips live under the lid, so open the case first.
export function selectItem(id, { fly = false } = {}) {
    const item = findItem(id);
    if (!item) return;
    if (item.type === "chip" && state.explode < OPEN_THRESHOLD) setState({ explode: 1 });
    setState({ selected: id, tab: item.type === "port" ? "ports" : "board" });
    if (fly) emit("focus", id);
}
