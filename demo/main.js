owl.config.mode = "dev";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;

const Spreadsheet = o_spreadsheet.Spreadsheet;
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
      C9: { content: "= SUM ( C4 : C5 )" },
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
      F3: { content: "strikethrough", style: 3 },
      F6: { content: "o-spreadsheet has:", style: 1 },
      F7: { content: "- a real tokenizer and parser" },
      F8: { content: "- an expression compiler" },
      F9: { content: "- evaluate dependent formulas correctly" },
      F10: { content: "- properly rewrite formulas on copy/paste" },
      F11: { content: "- a canvas renderer" },
      F12: { content: "- rendering are applied once very RAF" },
      F13: { content: "- basic support for styles" },
      F14: { content: "... in 1100 loc, including css/templates/icons" },
      F16: { content: "Still missing:", style: 1 },
      F17: { content: "- resizing columns" },
      F18: { content: "- context menus" },
      F19: { content: "- some editing tools (fonts, color, ...)" },
      F20: { content: "- merging cells" },
      F21: { content: "- borders" },
      H2: { content: "merged content" }
    },
    styles: {
      1: { bold: true },
      2: { italic: true },
      3: { strikethrough: true }
    },
    merges: ["H2:I5"]
  };
}

// Setup code
function setup() {
  const app = new App();
  app.mount(document.body);
}
whenReady(setup);
