// Home: who each stick is for, the questions people ask, and the closing calls to action.
(() => {
    const { el, add, interact, focusRing } = app.dom;
    const { SPACE, FONT, px } = app.styles;
    const { label, para, heading } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row, grid } = app.ui.layout;
    const { card } = app.ui.card;
    const { HOME } = app.content;

    function roleCards() {
        const duo = grid(280, SPACE.md);
        add(duo,
            card(label("HOST STICK", { size: FONT.xs, weight: FONT.bold, tone: "accent" }), heading(3, "In your computer"), para("Your keyboard and mouse are read here and sent over the radio. One host per group.", { size: FONT.sm, tone: "muted" })),
            card(label("TARGET STICK", { size: FONT.xs, weight: FONT.bold, tone: "accent" }), heading(3, "In each machine you control"), para("It receives the radio data and acts like a normal USB keyboard and mouse. As many as you need.", { size: FONT.sm, tone: "muted" })));
        requestAnimationFrame(() => duo.layout());
        return duo;
    }

    // One question per row; activating it shows or hides the answer.
    function faq() {
        const box = stack(SPACE.sm);
        HOME.faq.forEach(([question, answer]) => {
            const item = card();
            const head = el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", gap: px(SPACE.md), cursor: "pointer" });
            const plus = label("+", { size: FONT.lg, tone: "accent", weight: FONT.bold });
            add(head, label(question, { size: FONT.md, weight: FONT.medium }), plus);
            const body = para(answer, { size: FONT.sm, tone: "muted" });
            body.style.display = "none";
            let open = false;
            interact(head, {
                role: "button", label: question, onActivate: () => {
                    open = !open;
                    body.style.display = open ? "block" : "none";
                    plus.textContent = open ? "−" : "+";
                    head.setAttribute("aria-expanded", String(open));
                },
                draw: (target, palette, flags) => { target.style.outline = focusRing(palette, flags.ring); },
            });
            head.setAttribute("aria-expanded", "false");
            add(item, head, body);
            add(box, item);
        });
        return box;
    }

    function finalCta() {
        const actions = row(SPACE.sm);
        add(actions,
            button({ label: "Explore it in 3D", kind: "solid", onClick: () => app.router.go("explore") }),
            button({ label: "Downloads", onClick: () => app.router.go("downloads") }),
            button({ label: "GitHub", onClick: () => window.open("https://github.com/mkalmousli/tandem-stick", "_blank", "noopener") }));
        return actions;
    }

    app.pages.homeFaq = { roleCards, faq, finalCta };
})();
