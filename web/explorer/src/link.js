// Deep links: #part=esp&explode=1&tab=board&mode=host&view=top keeps a view shareable.
import { state, setState, subscribe, emit } from "./state.js";
import { findItem } from "./data.js";
import { selectItem } from "./actions.js";
import { goTour } from "./components/tour.js";

const TABS = ["tour", "ports", "signal", "board", "costs"];
const VIEWS = ["front", "rear", "top", "iso"];

export function readLink() {
    const q = new URLSearchParams(location.hash.slice(1));
    const patch = {};
    if (TABS.includes(q.get("tab"))) patch.tab = q.get("tab");
    if (q.get("mode") === "host" || q.get("mode") === "target") patch.mode = q.get("mode");
    if (q.has("explode")) patch.explode = Math.min(1, Math.max(0, Number(q.get("explode")) || 0));
    if (q.get("spin") === "1") patch.spin = true;
    setState(patch);
    if (q.has("step")) goTour(Number(q.get("step")) || 0);
    else if (findItem(q.get("part"))) selectItem(q.get("part"), { fly: true });
    else if (VIEWS.includes(q.get("view"))) emit("preset", q.get("view"));
}

export function writeLink() {
    const q = new URLSearchParams();
    q.set("tab", state.tab);
    if (state.tab === "tour") q.set("step", String(state.tour));
    if (state.selected) q.set("part", state.selected);
    if (state.explode > 0.5) q.set("explode", "1");
    if (state.mode !== "target") q.set("mode", state.mode);
    if (state.spin) q.set("spin", "1");
    return `${location.pathname}${location.search}#${q}`;
}

export function syncLink() {
    subscribe(() => {
        try { history.replaceState(null, "", writeLink()); } catch (err) { /* sandboxed frame: skip */ }
    });
}
