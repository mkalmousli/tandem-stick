// Home: a scroll presentation of the product, with live 3D, a walkthrough, use cases, host vs target, FAQ and calls to action.
(() => {
    const { el, add } = app.dom;
    const { SPACE, FONT } = app.styles;
    const { para } = app.ui.text;
    const { column } = app.ui.layout;
    const { band } = app.pages.homeUi;
    const { hero } = app.pages.homeHero;
    const { features } = app.pages.features;
    const { steps, useCases } = app.pages.stories;
    const { software } = app.pages.software;
    const { roleCards, faq, finalCta } = app.pages.homeFaq;

    function build() {
        const page = el("div");
        add(page,
            hero(),
            band("inside", "Features", "What it does", "The real model, turning live in your browser. It shows the part behind each feature as you read.", features()),
            band("how", "How it works", "Four steps, no software", null, steps()),
            band("software", "Software", "Script it. Automate it.", "Because it is just USB plus an API, anything you can write can drive it.", software()),
            band("cases", "Use cases", "Made for real situations", null, useCases()),
            band("roles", "Host and target", "Same stick, two jobs", null, roleCards()),
            band("faq", "Questions", "Good to know", null, faq()),
            band("start", "Start", "Build one this weekend", null, finalCta()));
        return page;
    }

    app.pages.home = { build };
})();
