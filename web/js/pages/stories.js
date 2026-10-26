// Home: "How it works" and "Use cases" as sections down the page, each with a short looping 3D scene made of simple boxes.
(() => {
    const { add } = app.dom;
    const { SPACE, FONT } = app.styles;
    const { label, para, heading } = app.ui.text;
    const { card } = app.ui.card;
    const { stack } = app.ui.layout;
    const { stickySections } = app.ui.sections;
    const { HOME } = app.content;
    const { cells } = app.pages.homeUi;

    const STEP_SCENES = ["build", "host", "pair", "fleet"];

    // The scene view shows scene `names[idx]` as soon as the 3D scripts have arrived.
    const sceneView = (names) => (art, narrow) => {
        let mini = null, want = 0;
        const apply = () => { if (mini) mini.show(app.scene.miniScenes.SCENES[names[want]]); };
        app.need("three").then(() => { mini = app.scene.mini.createMini(art, { ratio: narrow ? 0.6 : 0.72 }); apply(); });
        const show = (idx) => { want = idx; apply(); };
        show.layout = (now) => { if (mini) mini.wrap.style.aspectRatio = String(1 / (now ? 0.6 : 0.72)); };
        return show;
    };

    function steps() {
        return stickySections(HOME.steps.map(([name, text]) => ({ name, text })), sceneView(STEP_SCENES));
    }

    function useCases() {
        const withScene = HOME.cases.filter((item) => item[3]);
        const rest = HOME.cases.filter((item) => !item[3]);
        const list = stickySections(withScene.map(([name, who, text]) => ({ name, text: `${text} (${who})` })), sceneView(withScene.map((item) => item[3])));
        const more = cells(rest, 230, ([title, who, text]) => card(label(who.toUpperCase(), { size: FONT.xs, tone: "accent", weight: FONT.bold }), heading(3, title), para(text, { size: FONT.sm, tone: "muted" })));
        return add(stack(SPACE.xl), list, more);
    }

    app.pages.stories = { steps, useCases };
})();
