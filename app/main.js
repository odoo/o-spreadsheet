(function (window) {
    const { whenReady } = owl.utils;

    // Setup code
    function setup() {
        const app = new App();
        app.mount(document.body);
        console.log(app)
    }
    whenReady(setup);

})();
