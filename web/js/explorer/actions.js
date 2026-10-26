// Commands that touch several explorer parts: choosing a part, stepping the tour, stepping the part list.
(() => {
    const { state, setState, emit } = app.ex;
    const { findItem, TOUR, PART_ORDER } = app.data;

    const OPEN_THRESHOLD = 0.6;

    // Chips live under the lid, so open the case before showing one.
    function selectItem(id, { fly = false, quiet = false } = {}) {
        const item = findItem(id);
        if (!item) return;
        if (item.type === "chip" && state.explode < OPEN_THRESHOLD) setState({ explode: 1 });
        setState(quiet ? { selected: id } : { selected: id, tab: "parts" });
        if (fly) emit("focus", id);
    }

    function goTour(idx) {
        const at = Math.max(0, Math.min(TOUR.length - 1, idx));
        const step = TOUR[at];
        const patch = { tour: at, explode: step.explode ?? state.explode, selected: null };
        if (step.mode) patch.mode = step.mode;
        setState(patch);
        if (step.focus) selectItem(step.focus, { fly: true, quiet: true });
        else emit("preset", step.view || "iso");
        setState({ tab: "tour" });
    }

    function stepPart(delta) {
        const at = PART_ORDER.indexOf(state.selected);
        const next = PART_ORDER[(at + delta + PART_ORDER.length) % PART_ORDER.length];
        selectItem(next, { fly: true });
    }

    app.ex.actions = { selectItem, goTour, stepPart };
})();
