/**
 * We export here two datasets, useful to test and play with o-spreadsheet:
 *
 * - a demo dataset (demoData)
 * . a perf focused dataset (created by function makeLargeDataset)
 */

export const demoData = {
  version: 1,
  sheets: [
    {
      name: "Sheet1",
      colNumber: 26,
      rowNumber: 120,
      cols: { 1: {}, 3: {} },
      rows: {},
      cells: {
        B2: { content: "Owl is awesome", style: 1 },
        B4: { content: "Numbers", style: 4 },
        C1: { content: "CF =42" },
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
        C20: { content: "left", border: 1 },
        E20: { content: "top", border: 2 },
        G20: { content: "all", border: 3 },
        K3: { border: 3 },
        B17: { content: "=WAIT(1000)" },
        G13: { content: "=A1+A2+A3+A4+A5+A6+A7+A8+A9+A10+A11+A12+A13+A14+A15+A16+A17+A18" },
        C23: { content: "0.43", format: "0.00%" },
        C24: { content: "10", format: "#,##0.00" },
        C25: { content: "10.123", format: "#,##0.00" },
        G1: { content: "CF color scale:" },
        G2: { content: "5" },
        G3: { content: "8" },
        G4: { content: "9" },
        G5: { content: "15" },
        G6: { content: "22" },
        G8: { content: "30" }
      },
      merges: ["H2:I5", "K3:K8"],
      conditionalFormats: [
        {
          id: "1",
          ranges: ["C1:C100"],
          rule: {
            values: ["42"],
            operator: "Equal",
            type: "CellIsRule",
            style: { fillColor: "orange" }
          }
        },
        {
          id: "2",
          ranges: ["G1:G100"],
          rule: {
            type: "ColorScaleRule",
            minimum: { type: "value", color: 0xffffff },
            maximum: { type: "value", color: 0xff0000 }
          }
        }
      ]
    }
  ],
  styles: {
    1: { bold: true, textColor: "#3A3791", fontSize: 12 },
    2: { italic: true },
    3: { strikethrough: true },
    4: { fillColor: "#e3efd9" },
    5: { fillColor: "#c5e0b3" },
    6: { fillColor: "#a7d08c" }
  },
  borders: {
    1: { left: ["thin", "#000"] },
    2: { top: ["thin", "#000"] },
    3: {
      top: ["thin", "#000"],
      left: ["thin", "#000"],
      bottom: ["thin", "#000"],
      right: ["thin", "#000"]
    }
  }
};

// Performance dataset
function _getColumnLetter(number) {
  return number !== -1
    ? _getColumnLetter(Math.floor(number / 26) - 1) + String.fromCharCode(65 + (number % 26))
    : "";
}

function computeCells(cols, rows) {
  const cells = {};
  for (let letter = 0; letter <= cols; letter++) {
    const x = _getColumnLetter(letter);
    if (letter === 0) {
      cells[x + 3] = { content: letter.toString() };
    } else {
      const prev = _getColumnLetter(letter - 1);
      cells[x + 3] = { content: `=2*${prev}${rows}` };
    }
    for (let index = 4; index <= rows; index++) {
      cells[x + index] = { content: `=${x}${index - 1}+1` };
    }
  }
  const letter = _getColumnLetter(cols);
  const nextLetter = _getColumnLetter(cols + 1);
  for (let i = 3; i <= rows; i++) {
    cells[nextLetter + i] = { content: `=SUM(A${i}:${letter}${i})` };
  }
  return cells;
}

export function makeLargeDataset(cols, rows) {
  return {
    version: 1,
    sheets: [
      {
        name: "Sheet1",
        colNumber: 45,
        rowNumber: 1000000,
        cols: { 1: {}, 3: {} },
        rows: {},
        cells: computeCells(cols, rows)
      }
    ],
    styles: {
      1: { bold: true, textColor: "#3A3791", fontSize: 12 },
      2: { italic: true },
      3: { strikethrough: true },
      4: { fillColor: "#e3efd9" },
      5: { fillColor: "#c5e0b3" },
      6: { fillColor: "#a7d08c" }
    },
    borders: {}
  };
}
