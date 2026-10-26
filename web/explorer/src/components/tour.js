import { add, el } from "../dom.js";
import { state, setState, emit } from "../state.js";
import { TOUR, findItem } from "../data.js";
import { selectItem } from "../actions.js";
import { FONT, SPACE } from "../theme.js";
import { button, card, label, section, wrapRow, px } from "../widgets.js";

export function goTour(index) {
    const i = Math.max(0, Math.min(TOUR.length - 1, index));
    const step = TOUR[i];
    const patch = { tour: i, explode: step.explode ?? state.explode, selected: null };
    if (step.mode) patch.mode = step.mode;
    setState(patch);
    if (step.focus) selectItem(step.focus, { fly: true });
    else emit("preset", step.view || "iso");
    // Keep the tour tab open; the step names the tab its idea lives in.
    setState({ tab: "tour" });
}

export function renderTour(box) {
    const step = TOUR[state.tour];
    const dots = wrapRow(SPACE.xs);
    TOUR.forEach((_, i) => add(dots, button({ label: String(i + 1), pressed: i === state.tour, ariaLabel: `Step ${i + 1}`, onClick: () => goTour(i) })));
    const nav = wrapRow(SPACE.sm);
    add(nav,
        button({ label: "Back", grow: true, onClick: () => goTour(state.tour - 1) }),
        button({ label: state.tour === TOUR.length - 1 ? "Restart" : "Next", kind: "tab", pressed: true, grow: true, onClick: () => goTour(state.tour === TOUR.length - 1 ? 0 : state.tour + 1) }));
    const target = step.focus ? findItem(step.focus) : null;
    add(box,
        card(label(`Step ${state.tour + 1} of ${TOUR.length}`, { size: FONT.xs, tone: "muted", weight: 600 }),
            label(step.title, { size: FONT.lg, weight: 600 }), label(step.text, { size: FONT.sm, tone: "muted" }),
            ...(target ? [label(`${target.name}: ${target.part || target.section}`, { size: FONT.sm })] : []), nav),
        section("Jump to a step", dots),
        label("Or explore freely: use the other tabs, or click any part on the model.", { size: FONT.xs, tone: "muted" }));
}
