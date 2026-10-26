// A button that copies text to the clipboard and says so. Falls back to selecting the text when the clipboard is blocked.
(() => {
    const { track } = app.dom;
    const { button } = app.ui.button;

    const DONE_MS = 1400;

    function copyButton(text, getText, { kind = "ghost", fallback } = {}) {
        const btn = button({ label: text, kind, ariaLabel: text });
        const flash = (msg) => {
            btn.textContent = msg;
            const timer = setTimeout(() => { btn.textContent = text; }, DONE_MS);
            track(() => clearTimeout(timer));
        };
        btn.addEventListener("click", () => {
            const value = getText();
            if (!navigator.clipboard) { if (fallback) fallback(); return flash("Select and copy"); }
            navigator.clipboard.writeText(value).then(() => flash("Copied"), () => { if (fallback) fallback(); flash("Select and copy"); });
        });
        return btn;
    }

    app.ui.copy = { copyButton };
})();
