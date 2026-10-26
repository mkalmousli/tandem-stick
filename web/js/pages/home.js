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
    const { faq, finalCta } = app.pages.homeFaq;

    function build() {
        const page = el("div");
        add(page,
            hero(),
            band("inside", "Features", "Why a stick", "Software on your side, hardware on theirs. Scroll to see each benefit.", features()),
            band("how", "How it works", "Four steps to get going", null, steps()),
            band("software", "Software", "Script it", "Anything you can code can drive it.", software()),
            band("cases", "Use cases", "Made for real jobs", null, useCases()),
            band("faq", "Questions", "Quick answers", null, faq()),
            band("start", "Start", "Build one this weekend", null, finalCta()));
        return page;
    }

    app.pages.home = { build };
})();
