// Home: what software can do with the sticks. Honest label: the app and API are planned, so every idea is "possible", not shipped.
(() => {
    const { add, el } = app.dom;
    const { SPACE, FONT, RADIUS, px } = app.styles;
    const { label, para, heading } = app.ui.text;
    const { stack } = app.ui.layout;
    const { card } = app.ui.card;
    const { cells } = app.pages.homeUi;

    const SAMPLE = [
        "// One, some or all. Illustrative: the API is planned.",
        "tandem.all().type(\"hello\");",
        "tandem.group(\"lab\").press(\"Win+R\");",
        "tandem.pc(\"desk\").click(640, 360);",
    ].join("\n");

    // Colours that read on both themes: comment, string, method name.
    const TOKENS = [[/^\/\/.*/, "#8a8f98"], [/^"[^"]*"/, "#2f9e6b"], [/^\b(tandem)\b/, "#e0a01a"], [/^\.(\w+)(?=\()/, "#4f86f7"], [/^\d+/, "#d9730d"]];
    function highlight(node, text) {
        for (let rest = text; rest;) {
            const hit = TOKENS.map(([re, color]) => [re.exec(rest), color]).find(([m]) => m);
            const part = hit ? hit[0][0] : rest[0];
            const span = el("span", hit ? { color: hit[1] } : {});
            span.textContent = part;
            node.appendChild(span);
            rest = rest.slice(part.length);
        }
    }

    const IDEAS = [
        ["Scripts and macros", "Type text, press shortcuts, move and click from a script. Record once, replay on any machine."],
        ["Mass installs", "Walk Windows or Linux setup on a whole shelf of bare machines with the same keystrokes."],
        ["One, a group or everyone", "Name your machines and send to one, a chosen group, or all at once."],
        ["More than keys", "A stick can act as a keyboard, mouse, drive, serial port, network card or audio device, so even slow jobs can be automated."],
        ["Schedules and triggers", "Run a script at a set time, from a hotkey, a webhook or a CI job."],
        ["Test benches", "Drive PCs, kiosks and boards from your test code and check what happened."],
        ["Signage and demo fleets", "Restart or reset every screen from one desk. No visits, no remote desktop."],
        ["Accessibility", "Map a switch, joystick or voice command to keys and clicks on every machine."],
        ["Bring your own tools", "Any language that can call the API: Python, Node, shell, or a button on a web page."],
    ];

    function software() {
        const code = el("pre", { margin: "0", padding: px(SPACE.md), borderRadius: px(RADIUS.sm), fontFamily: FONT.mono, fontSize: px(FONT.sm), overflowX: "auto", lineHeight: "1.6" });
        highlight(code, SAMPLE);
        app.dom.themed(code, { background: "raised", color: "text" });
        const head = add(stack(SPACE.xs), heading(3, "Your code, many machines"), para("Our app is the easy way in. The API is for everything else.", { size: FONT.sm, tone: "muted" }));
        const grid = cells(IDEAS, 260, ([title, text]) => card(heading(3, title), para(text, { size: FONT.sm, tone: "muted" })));
        return add(stack(SPACE.lg), add(stack(SPACE.sm), head, code, label("Planned: firmware, app and API are not released yet.", { size: FONT.xs, tone: "muted" })), grid);
    }

    app.pages.software = { software };
})();
