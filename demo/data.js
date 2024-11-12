/**
 * We export here two datasets, useful to test and play with o-spreadsheet:
 *
 * - a demo dataset (demoData)
 * . a perf focused dataset (created by function makeLargeDataset)
 */

export const demoData = {
  version: 14,
  sheets: [
    {
      id: "Sheet1",
      name: "Sheet1",
      colNumber: 26,
      rowNumber: 100,
      rows: {},
      cols: {},
      merges: [],
      cells: {
        A1: { content: '="1"' },
        A2: { content: '="10"' },
        A3: { content: '="100"' },
        A4: { content: '="2"' },
        A5: { content: '="2"' },
        B1: { content: '=MATCH( "1",   A1:A5, 1)' },
        B2: { content: '=MATCH( "2",   A1:A5, 1)' },
        B3: { content: '=MATCH( "5",   A1:A5, 1)' },
        B4: { content: '=MATCH( "10",  A1:A5, 1)' },
        B5: { content: '=MATCH( "100", A1:A5, 1)' },
      },
      conditionalFormats: [],
      figures: [],
      filterTables: [],
      areGridLinesVisible: true,
      isVisible: true,
      headerGroups: { ROW: [], COL: [] },
      dataValidationRules: [],
    },
  ],
  entities: {},
  styles: {},
  formats: {},
  borders: {},
  revisionId: "77f5e60c-bc9e-4730-8fb9-d7c18b10c795",
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
    },
  },
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
    cells[`A${row}`] = { content: row.toString() };
    for (let col = 1; col < cols; col++) {
      const colLetter = _getColumnLetter(col);
      const prev = _getColumnLetter(col - 1);
      cells[colLetter + row] = {
        content: `=${prev}${row}+1`,
      };
    }
  }
  const letter = _getColumnLetter(cols);
  const nextLetter = _getColumnLetter(cols + 1);
  for (let i = 3; i < cols; i++) {
    cells[nextLetter + i] = {
      content: `=SUM(A${i}:${letter}${i})`,
    };
  }
  return cells;
}

function computeArrayFormulaCells(cols, rows) {
  const cells = {};
  const initRow = 4;
  for (let row = initRow; row <= rows; row++) {
    cells[`A${row}`] = { content: row.toString() };
  }
  for (let col = 1; col < cols; col++) {
    const colLetter = _getColumnLetter(col);
    const prev = _getColumnLetter(col - 1);
    cells[colLetter + initRow] = {
      content: `=transpose(transpose(${prev}${initRow}:${prev}${rows}))`,
    };
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
          cells[letter + index] = { content: `${col + index}` };
          break;
        case "floats":
          cells[letter + index] = { content: `${col + index}.123` };
          break;
        case "longFloats":
          cells[letter + index] = { content: `${col + index}.123456789123456` };
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
      cells[letter + index] = { content: Math.random().toString(36).substr(2) };
    }
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
      case "arrayFormulas":
        cells = computeArrayFormulaCells(cols, rows);
        break;
      case "numbers":
      case "floats":
      case "longFloats":
        cells = computeNumberCells(cols, rows, sheetsInfo[0]);
        break;
      case "strings":
        cells = computeStringCells(cols, rows);
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
    version: 10,
    sheets,
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
