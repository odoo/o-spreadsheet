import { Spreadsheet } from "./spreadsheet/spreadsheet.js";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;

class App extends Component {
  static template = xml`<Spreadsheet data="data"/>`;
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
    }
  `;
  static components = { Spreadsheet };

  data = {
    colNumber: 26,
    rowNumber: 100,
    cols: { 3: { size: 150 } },
    rows: { },
    cells: {
      B2: { content: "coucou" },
      B3: { content: "43" },
      D4: { content: "=-2*B3" }
    }
  };
}

// Setup code
function setup() {
  const app = new App();
  app.mount(document.body);
}
whenReady(setup);
