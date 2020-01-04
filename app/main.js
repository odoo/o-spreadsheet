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
    cols: { 1: { size: 120 }, 3: { size: 150 } },
    rows: {},
    cells: {
      B2: { content: "Owl is awesome", style: 1 },
      B4: { content: "Numbers" },
      C4: { content: "12.4" },
      C5: { content: "42" },
      C7: { content: "3" },
      B9: { content: "Formulas" },
      C9: { content: "=SUM(C4:C5)" },
      C10: { content: "=SUM(C4:C7)" },
      D10: { content: "note that C7 is empty" },
      C11: { content: "=-(3 + C7 *SUM(C4:C7))" },
      C12: { content: "=SUM(C9:C11)" },
      D12: { content: "this is a sum of sums" },
      B14: { content: "Errors" },
      C14: { content: "=C14" },
      C15: { content: "=(+" },
      C16: { content: "=C15" },
      F2: { content: "italic blablah", style: 2 },
      F3: { content: "strikethrough", style: 3 }
    },
    styles: {
      1: { bold: true },
      2: { italic: true },
      3: { strikethrough: true }
    }
  };
}

// Setup code
function setup() {
  const app = new App();
  app.mount(document.body);
}
whenReady(setup);
