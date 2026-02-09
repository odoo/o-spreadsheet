/**
 * We export here two datasets, useful to test and play with o-spreadsheet:
 *
 * - a demo dataset (demoData)
 * . a perf focused dataset (created by function makeLargeDataset)
 */

export const demoData = {
  version: "19.1.0",
  sheets: [
    {
      id: "id-autofill",
      name: "Autofill",
      colNumber: 26,
      rowNumber: 101,
      rows: {},
      cols: {
        0: { size: 110 },
        1: { size: 76 },
        2: { size: 133 },
        3: { size: 165 },
        4: { size: 94 },
        5: { size: 169 },
        6: { size: 96 },
        7: { size: 67 },
      },
      merges: [],
      cells: {
        A1: "incrementing numbers",
        A2: "1",
        A3: "2",
        A4: "3",
        B1: "copy numbers",
        "B2:B4": "1",
        C1: "large incrementing numbers",
        C2: "1",
        C3: "5",
        C4: "9",
        D1: "formula with incrementing reference",
        D2: "=sum(C2)",
        "D3:D4": { R: "+R1" },
        E1: "incrementing letter",
        E2: "a",
        E3: "b",
        E4: "c",
        F1: "incrementing letters large increments",
        F2: "a",
        F3: "c",
        F4: "e",
        G1: "incrementing dates",
        G2: "45658",
        G3: "45659",
        G4: "45660",
        H1: "random text",
        H2: "mqjqds",
        H3: "1",
        H4: "qsdiqop",
      },
      styles: { "A1:Z1": 1 },
      formats: { "G1:G101": 1 },
      borders: {},
      conditionalFormats: [],
      dataValidationRules: [],
      figures: [],
      tables: [],
      areGridLinesVisible: true,
      isVisible: true,
      isLocked: false,
      headerGroups: { ROW: [], COL: [] },
    },
  ],
  styles: { 1: { rotation: -0.785 } },
  formats: { 1: "d/m/yyyy" },
  borders: {},
  revisionId: "START_REVISION",
  uniqueFigureIds: true,
  settings: {
    locale: {
      name: "English (US)",
      code: "en_US",
      thousandsSeparator: ",",
      decimalSeparator: ".",
      dateFormat: "m/d/yyyy",
      timeFormat: "hh:mm:ss a",
      formulaArgSeparator: ",",
      weekStart: 7,
    },
  },
  pivots: {},
  pivotNextId: 1,
  customTableStyles: {},
};

// Performance dataset
function _getColumnLetter(number) {
  return number !== -1
    ? _getColumnLetter(Math.floor(number / 26) - 1) + String.fromCharCode(65 + (number % 26))
    : "";
}

function computeFormulaCells(cols, rows) {
  const cells = {};
  for (let row = 4; row <= rows; row++) {
    cells[`A${row}`] = row.toString();
    for (let col = 1; col < cols; col++) {
      const colLetter = _getColumnLetter(col);
      const prev = _getColumnLetter(col - 1);
      cells[colLetter + row] = `=${prev}${row}+1`;
    }
  }
  const letter = _getColumnLetter(cols);
  const nextLetter = _getColumnLetter(cols + 1);
  for (let i = 4; i <= rows; i++) {
    cells[nextLetter + i] = `=SUM(A${i}:${letter}${i})`;
  }
  return cells;
}

function computeFormulaCellsSquished(cols, rows) {
  const cells = {};
  for (let row = 4; row <= rows; row++) {
    cells[`A${row}`] = row.toString();
  }
  for (let col = 1; col < cols; col++) {
    const colLetter = _getColumnLetter(col);
    const prev = _getColumnLetter(col - 1);
    cells[`${colLetter}4`] = `=${prev}4+1`;
    cells[`${colLetter}5:${colLetter + rows}`] = { N: "=", R: "+R1" };
  }
  const letter = _getColumnLetter(cols);
  const nextLetter = _getColumnLetter(cols + 1);
  for (let i = 4; i <= rows; i++) {
    cells[nextLetter + i] = `=SUM(A${i}:${letter}${i})`;
  }
  return cells;
}

function computeArrayFormulaCells(cols, rows) {
  const cells = {};
  const initRow = 4;
  for (let row = initRow; row <= rows; row++) {
    cells[`A${row}`] = row.toString();
  }
  for (let col = 1; col < cols; col++) {
    const colLetter = _getColumnLetter(col);
    const prev = _getColumnLetter(col - 1);
    cells[colLetter + initRow] = `=transpose(transpose(${prev}${initRow}:${prev}${rows}))`;
  }
  return cells;
}

function computeVectorizedFormulaCells(cols, rows) {
  const cells = {};
  const initRow = 4;
  for (let row = initRow; row <= rows; row++) {
    cells[`A${row}`] = row.toString();
  }
  for (let col = 1; col < cols; col++) {
    const colLetter = _getColumnLetter(col);
    const prev = _getColumnLetter(col - 1);
    cells[colLetter + initRow] = `=${prev}${initRow}:${prev}${rows}+1`;
  }
  const letter = _getColumnLetter(cols);
  const nextLetter = _getColumnLetter(cols + 1);
  for (let i = 3; i < cols; i++) {
    cells[nextLetter + i] = `=SUM(A${i}:${letter}${i})`;
  }
  return cells;
}

function computeNumberCells(cols, rows, type = "numbers") {
  const cells = {};
  for (let col = 0; col < cols; col++) {
    const letter = _getColumnLetter(col);
    for (let index = 1; index < rows - 1; index++) {
      switch (type) {
        case "numbers":
          cells[letter + index] = `${col + index}`;
          break;
        case "floats":
          cells[letter + index] = `${col + index}.123`;
          break;
        case "longFloats":
          cells[letter + index] = `${col + index}.123456789123456`;
          break;
      }
    }
  }
  return cells;
}

function computeStringCells(cols, rows) {
  const cells = {};
  for (let col = 0; col < cols; col++) {
    const letter = _getColumnLetter(col);
    for (let index = 1; index < rows; index++) {
      cells[letter + index] = Math.random().toString(36).slice(2);
    }
  }
  return cells;
}

function computeSplitVlookup(rows) {
  /*
   * in A1 write =SPLIT("1 2", " ")
   * in C1, write=B2
   * write a VLOOKUP that search in column C --> slow
   */
  const cells = {};
  for (let row = 1; row < rows; row++) {
    cells["A" + row] = `=SPLIT("1 2", " ")`;
    cells["C" + row] = `=B${row}`;
    cells["D" + row] = `=VLOOKUP("2",C1:C${rows},1)`;
    cells["F" + row] = `=D${row}`;
  }
  return cells;
}

/**
 *
 * @param {*} cols
 * @param {*} rows
 * @param {*} sheetsInfo ("numbers"|"strings"|"formulas")[]>
 * @returns
 */
export function makeLargeDataset(cols, rows, sheetsInfo = ["formulas"]) {
  const sheets = [];
  let cells;
  for (let index = 0; index < sheetsInfo.length; index++) {
    switch (sheetsInfo[index]) {
      case "formulas":
        cells = computeFormulaCells(cols, rows);
        break;
      case "formulasSquished":
        cells = computeFormulaCellsSquished(cols, rows);
        break;
      case "arrayFormulas":
        cells = computeArrayFormulaCells(cols, rows);
        break;
      case "vectorizedFormulas":
        cells = computeVectorizedFormulaCells(cols, rows);
        break;
      case "numbers":
      case "floats":
      case "longFloats":
        cells = computeNumberCells(cols, rows, sheetsInfo[0]);
        break;
      case "strings":
        cells = computeStringCells(cols, rows);
        break;
      case "splitVlookup":
        cells = computeSplitVlookup(rows);
        break;
    }
    sheets.push({
      name: `Sheet${index + 1}`,
      colNumber: cols,
      rowNumber: rows,
      cols: { 1: {}, 3: {} }, // ?
      rows: {},
      cells,
    });
  }
  return {
    version: "18.5.1",
    sheets,
    styles: {
      1: { bold: true, textColor: "#674EA7", fontSize: 12 },
      2: { italic: true },
      3: { strikethrough: true },
      4: { fillColor: "#FFF2CC" },
      5: { fillColor: "#D9EAD3" },
      6: { fillColor: "#B6D7A8" },
    },
    formats: {},
    borders: {},
    revisionId: "START_REVISION",
    uniqueFigureIds: true,
    settings: {
      locale: {
        name: "English (US)",
        code: "en_US",
        thousandsSeparator: ",",
        decimalSeparator: ".",
        weekStart: 7,
        dateFormat: "m/d/yyyy",
        timeFormat: "hh:mm:ss a",
        formulaArgSeparator: ",",
      },
    },
    pivots: {},
    pivotNextId: 1,
    customTableStyles: {},
  };
}
