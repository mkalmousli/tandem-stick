// Puts a live 3D view of the product into `parent` once the 3D scripts have arrived; cleans up with the page that asked for it.
(() => {
    const { createScope, withScope, track } = app.dom;

    function live3d(parent, opts) {
        const scope = createScope();
        track(() => scope.dispose());
        const done = app.need("three").then(() => withScope(scope, () => app.scene.showcase.mount(parent, opts)));
        return done;
    }

    app.ui.live3d = { live3d };
})();
