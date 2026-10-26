// Hash router: #/page?key=value. The page owns its query string (the explorer keeps its view there).
(() => {
    const DEFAULT_PAGE = "home";
    const pages = new Map();
    const listeners = new Set();

    function parse() {
        const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
        return { name: pages.has(path) ? path : DEFAULT_PAGE, query: new URLSearchParams(query) };
    }

    function format(name, query) {
        const text = query && query.toString();
        return `#/${name}${text ? `?${text}` : ""}`;
    }

    function register(name, page) {
        pages.set(name, page);
    }

    function current() {
        return parse();
    }

    function go(name, query) {
        location.hash = format(name, query);
    }

    // Update the query of the current page without adding a history entry or re-rendering.
    function replaceQuery(query) {
        try { history.replaceState(null, "", format(parse().name, query)); } catch (err) { /* sandboxed frame: skip */ }
    }

    function onChange(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    window.addEventListener("hashchange", () => listeners.forEach((fn) => fn(parse())));

    app.router = { register, current, go, replaceQuery, onChange, pages, format };
})();
