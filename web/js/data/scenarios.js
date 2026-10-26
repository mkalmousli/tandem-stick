// Everyday situations for the "How it works" page. Each one says who it is for, what the screens show,
// and which actions the visitor can send. Action kinds: text (type), step (next item), run (a timed job).
(() => {
    const SCENARIOS = [
        {
            id: "present", name: "Present on every screen", who: "Teachers, speakers, meeting rooms",
            pitch: "Click through your slides once and every classroom or lobby screen follows, without cables or a casting app.",
            app: "slides", device: "monitor",
            targets: ["Classroom A", "Classroom B", "Lobby wall"],
            hostDoes: "Your laptop shows the speaker notes and presses the next-slide key.",
            slides: [["Welcome", "Today's plan", "Questions at the end"], ["Safety first", "Exits and meeting point", "Who to call"], ["The schedule", "09:00 Start", "12:00 Lunch", "14:00 Demo"], ["Thank you", "Slides are on the shared drive"]],
            actions: [{ label: "Next slide", kind: "step", key: "slide", mod: 4 }],
            demo: { kind: "step", key: "slide", mod: 4 },
            result: "Every screen moved to the next slide at the same moment.",
        },
        {
            id: "admin", name: "Fix many computers", who: "IT admins, workshops, labs",
            pitch: "Run the same command on a row of machines that have no remote tools installed, or are locked out of the network.",
            app: "terminal", device: "laptop",
            targets: ["Lab PC 1", "Lab PC 2", "Lab PC 3"],
            hostDoes: "Type the command once on your keyboard.",
            actions: [
                { label: "Type: update --all", kind: "text", text: "update --all" },
                { label: "Run it", kind: "run", seconds: 4 },
            ],
            demo: { kind: "text", text: "update --all" },
            result: "All three machines ran the command, and you never touched them.",
        },
        {
            id: "kiosk", name: "Shop and sign displays", who: "Shops, cafés, event stands",
            pitch: "Change the offer on every screen from the back office. The screens are plain browsers; nothing to install on them.",
            app: "browser", device: "kiosk",
            targets: ["Window display", "Counter screen", "Menu board"],
            hostDoes: "Pick the page once, from your own computer.",
            pages: [["shop.example/today", "Today: fresh bread", "2 for 1 until noon"], ["shop.example/sale", "Weekend sale", "Up to 30% off"], ["shop.example/menu", "New menu", "Soup of the day"]],
            actions: [{ label: "Show next page", kind: "step", key: "page", mod: 3 }],
            demo: { kind: "step", key: "page", mod: 3 },
            result: "All displays switched to the new page.",
        },
        {
            id: "qa", name: "Test on every system", who: "Developers, testers, support teams",
            pitch: "Type or click once and see how it behaves on Windows, macOS and Linux side by side, on real machines.",
            app: "editor", device: "laptop",
            targets: ["Windows", "macOS", "Linux"],
            hostDoes: "Write the test input once.",
            actions: [
                { label: "Type a line", kind: "text", text: "Grüße, 你好, café ☕" },
                { label: "New line", kind: "text", text: "\n" },
            ],
            demo: { kind: "text", text: "Grüße, 你好, café ☕" },
            result: "Same input on three systems, so differences are easy to spot.",
        },
        {
            id: "office", name: "Fill in spreadsheets", who: "Offices, shared desks, data entry",
            pitch: "Enter figures once and have them appear in the same cells on several PCs at once.",
            app: "sheet", device: "monitor",
            targets: ["Desk 1", "Desk 2", "Desk 3"],
            hostDoes: "Type the numbers; the sticks press the keys on each PC.",
            actions: [
                { label: "Enter 120", kind: "text", text: "120\t" },
                { label: "Enter 80", kind: "text", text: "80\t" },
                { label: "Enter 45", kind: "text", text: "45\t" },
            ],
            demo: { kind: "text", text: "120\t" },
            result: "The same cells are filled on every desk.",
        },
    ];

    const DEFAULT_SCENARIO = "present";
    const findScenario = (id) => SCENARIOS.find((item) => item.id === id) || SCENARIOS.find((item) => item.id === DEFAULT_SCENARIO);

    app.data.SCENARIOS = SCENARIOS;
    app.data.findScenario = findScenario;
})();
