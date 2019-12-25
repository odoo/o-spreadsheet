import { Spreadsheet } from "./spreadsheet/spreadsheet.js";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;

class App extends Component {
    static template = xml`<Spreadsheet/>`;
    static style = css`
        html {
            height: 100%;
            body {
                height: 100%;
                margin: 0px;
            }
            .o-spreadsheet {
                width: 100%;
                height: 100%;
            }
        }`;
    static components = { Spreadsheet };
}

// Setup code
function setup() {
    const app = new App();
    app.mount(document.body);
}
whenReady(setup);

