/**
 * We export here two datasets, useful to test and play with o-spreadsheet:
 *
 * - a demo dataset (demoData)
 * . a perf focused dataset (created by function makeLargeDataset)
 */

export const demoData = {
  version: 7,
  sheets: [
    {
      name: "Sheet1",
      colNumber: 26,
      rowNumber: 120,
      cols: { 1: {}, 3: {} },
      rows: {},
      cells: {
        A21: { content: "Sheet2 => B2:" },
        B2: { content: "Owl is awesome", style: 1 },
        B4: { content: "Numbers", style: 4 },
        B21: { content: "=Sheet2!B2", style: 7 },
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
        C17: { content: "=(+)" },
        C18: { content: "=C1{C2" },
        F2: { content: "italic blablah", style: 2 },
        F3: { content: "strikethrough", style: 3 },
        H2: { content: "merged content" },
        C20: { content: "left", border: 1 },
        E20: { content: "top", border: 2 },
        G20: { content: "all", border: 3 },
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
        G8: { content: "30" },
        B26: { content: "first dataset" },
        C26: { content: "second dataset" },
        B27: { content: "12" },
        B28: { content: "=floor(RAND()*50)" },
        B29: { content: "=floor(RAND()*50)" },
        B30: { content: "=floor(RAND()*50)" },
        B31: { content: "=floor(RAND()*50)" },
        B32: { content: "=floor(RAND()*50)" },
        B33: { content: "=floor(RAND()*50)" },
        B34: { content: "19" },
        B35: { content: "=floor(RAND()*50)" },
        C27: { content: "=floor(RAND()*50)" },
        C28: { content: "=floor(RAND()*50)" },
        C29: { content: "=floor(RAND()*50)" },
        C30: { content: "=floor(RAND()*50)" },
        C31: { content: "=floor(RAND()*50)" },
        C32: { content: "=floor(RAND()*50)" },
        C33: { content: "=floor(RAND()*50)" },
        C34: { content: "=floor(RAND()*50)" },
        C35: { content: "=floor(RAND()*50)" },
        A27: { content: "Emily Anderson (Emmy)" },
        A28: { content: "Sophie Allen (Saffi)" },
        A29: { content: "Chloe Adams" },
        A30: { content: "Megan Alexander (Meg)" },
        A31: { content: "Lucy Arnold (Lulu)" },
        A32: { content: "Hannah Alvarez" },
        A33: { content: "Jessica Alcock (Jess)" },
        A34: { content: "Charlotte Anaya" },
        A35: { content: "Lauren Anthony" },
        K3: { border: 5 },
        K4: { border: 4 },
        K5: { border: 4 },
        K6: { border: 4 },
        K7: { border: 4 },
        K8: { border: 6 },
        H23: { content: "0" },
        H24: { content: "1" },
        H25: { content: "2" },
        H26: { content: "3" },
        H27: { content: "4" },
        H28: { content: "5" },
        H29: { content: "6" },
        H30: { content: "7" },
        H31: { content: "8" },
        H32: { content: "9" },
        H33: { content: "10" },
        I23: { content: "0" },
        I24: { content: "1" },
        I25: { content: "2" },
        I26: { content: "3" },
        I27: { content: "4" },
        I28: { content: "5" },
        I29: { content: "4" },
        I30: { content: "3" },
        I31: { content: "2" },
        I32: { content: "1" },
        I33: { content: "0" },
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
            style: { fillColor: "orange" },
          },
        },
        {
          id: "2",
          ranges: ["G1:G100"],
          rule: {
            type: "ColorScaleRule",
            minimum: { type: "value", color: 0xffffff },
            maximum: { type: "value", color: 0xff0000 },
          },
        },
        {
          id: "3",
          ranges: ["H23:H33"],
          rule: {
            type: "IconSetRule",
                upperInflectionPoint: { type: "percentage", value: "66", operator: "gt" },
                lowerInflectionPoint: { type: "percentage", value: "33", operator: "gt" },
                icons: {
                  upper: "arrowGood",
                  middle: "dotNeutral",
                  lower: "arrowBad",
                },
          },
        },
        {
          id: "4",
          ranges: ["I23:I33"],
          rule: {
            type: "IconSetRule",
                upperInflectionPoint: { type: "number", value: "4", operator: "ge" },
                lowerInflectionPoint: { type: "number", value: "2", operator: "ge" },
                icons: {
                  upper: "smileyGood",
                  middle: "smileyNeutral",
                  lower: "smileyBad",
                },
          },
        },
      ],
    },
    {
      name: "Sheet2",
      cells: {
        B2: { content: "42" },
      },
      figures: [
        {
          id: "1",
          tag: "chart",
          width: 400,
          height: 300,
          x: 100,
          y: 100,
          data: {
            type: "line",
            title: "demo chart",
            labelRange: "Sheet1!A27:A35",
            dataSets: ["Sheet1!B26:B35", "Sheet1!C26:C35"],
            dataSetsHaveTitle: true,
          },
        },
        {
          id: "2",
          tag: "chart",
          width: 400,
          height: 300,
          x: 600,
          y: 100,
          data: {
            type: "bar",
            title: "demo chart 2",
            labelRange: "Sheet1!A27:A35",
            dataSets: ["Sheet1!B27:B35", "Sheet1!C27:C35"],
            dataSetsHaveTitle: false,
          },
        },
      ],
    },
  ],
  styles: {
    1: { bold: true, textColor: "#3A3791", fontSize: 12 },
    2: { italic: true },
    3: { strikethrough: true },
    4: { fillColor: "#e3efd9" },
    5: { fillColor: "#c5e0b3" },
    6: { fillColor: "#a7d08c" },
    7: { align: "left" },
  },
  borders: {
    1: { left: ["thin", "#000"] },
    2: { top: ["thin", "#000"] },
    3: {
      top: ["thin", "#000"],
      left: ["thin", "#000"],
      bottom: ["thin", "#000"],
      right: ["thin", "#000"],
    },
    4: { right: ["thin", "#000"], left: ["thin", "#000"] },
    5: {
      left: ["thin", "#000"],
      right: ["thin", "#000"],
      top: ["thin", "#000"],
    },
    6: {
      left: ["thin", "#000"],
      right: ["thin", "#000"],
      bottom: ["thin", "#000"],
    },
  },
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
      cells[x + 3] = {
        formula: { text: "=2*|0|", dependencies: [`${prev}${rows}`] },
      };
    }
    for (let index = 4; index <= rows; index++) {
      cells[x + index] = {
        formula: { text: "=|0|+1", dependencies: [`${x}${index - 1}`] },
      };
    }
  }
  const letter = _getColumnLetter(cols);
  const nextLetter = _getColumnLetter(cols + 1);
  for (let i = 3; i <= rows; i++) {
    cells[nextLetter + i] = {
      formula: { text: "=SUM(|0|)", dependencies: [`A${i}:${letter}${i}`] },
    };
  }
  return cells;
}

export function makeLargeDataset(cols, rows) {
  return {
    version: 6,
    sheets: [
      {
        name: "Sheet1",
        colNumber: cols,
        rowNumber: rows,
        cols: { 1: {}, 3: {} },
        rows: {},
        cells: computeCells(cols, rows),
      },
    ],
    styles: {
      1: { bold: true, textColor: "#3A3791", fontSize: 12 },
      2: { italic: true },
      3: { strikethrough: true },
      4: { fillColor: "#e3efd9" },
      5: { fillColor: "#c5e0b3" },
      6: { fillColor: "#a7d08c" },
    },
    borders: {},
  };
}
