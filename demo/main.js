owl.config.mode = "dev";

const { whenReady } = owl.utils;
const { Component } = owl;
const { xml, css } = owl.tags;

const Spreadsheet = o_spreadsheet.Spreadsheet;
class App extends Component {
  static template = xml`<Spreadsheet data="data" t-on-ask-confirmation="askConfirmation"/>`;
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
    sheets: [
      {
        name: "Sheet1",
        colNumber: 26,
        rowNumber: 100,
        cols: { 1: { }, 3: {  } },
        rows: {},
        cells: {
          B2: { content: "Owl is awesome", style: 1 },
          B4: { content: "Numbers", style: 4 },
          C4: { content: "12.4" },
          C5: { content: "42" },
          C7: { content: "3" },
          B9: { content: "Formulas", style: 5 },
          C9: { content: "= SUM ( C4 : C5 )" },
          C10: { content: "=SUM(C4:C7)" },
          D10: { content: "note that C7 is empty" },
          C11: { content: "=-(3 + C7 *SUM(C4:C7))" },
          C12: { content: "=SUM(C9:C11)" },
          D12: { content: "this is a sum of sums" },
          B14: { content: "Errors", style: 6 },
          C14: { content: "=C14" },
          C15: { content: "=(+" },
          C16: { content: "=C15" },
          F2: { content: "italic blablah", style: 2 },
          F3: { content: "strikethrough", style: 3 },
          H2: { content: "merged content" },
          C20: { content: "left", border: 1},
          E20: { content: "top", border: 2},
          G20: { content: "all", border: 3},
          K3: { border: 3},
          G13: {content: "=A1+A2+A3+A4+A5+A6+A7+A8+A9+A10+A11+A12+A13+A14+A15+A16+A17+A18"}
        },
        merges: ["H2:I5", 'K3:K8'],
      }
    ],
    styles: {
      1: { bold: true, textColor: "#3A3791", fontSize: 12 },
      2: { italic: true },
      3: { strikethrough: true },
      4: { fillColor: "#e3efd9"},
      5: { fillColor: "#c5e0b3"},
      6: { fillColor: "#a7d08c"},
    },
    borders: {
      1: { left: ["thin", "#000"]},
      2: { top: ["thin", "#000"]},
      3: {
        top: ["thin", "#000"],
        left: ["thin", "#000"],
        bottom: ["thin", "#000"],
        right: ["thin", "#000"]
      },
    }
  };

  askConfirmation(ev) {
    if (window.confirm(ev.detail.content)) {
      ev.detail.confirm();
    }
  }
}

// Setup code
function setup() {
  const app = new App();
  app.mount(document.body);
}
whenReady(setup);
