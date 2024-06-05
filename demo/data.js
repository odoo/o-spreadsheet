/**
 * We export here two datasets, useful to test and play with o-spreadsheet:
 *
 * - a demo dataset (demoData)
 * . a perf focused dataset (created by function makeLargeDataset)
 */

export const demoData = {
  version: 13,
  sheets: [
    {
      id: "sh2",
      name: "Sheet2",
      colNumber: 26,
      rowNumber: 100,
      rows: {},
      cols: {},
      merges: [],
      cells: {},
      conditionalFormats: [],
      figures: [
        {
          id: "1",
          tag: "chart",
          width: 100,
          height: 100,
          x: 200,
          y: 200,
          data: {
            type: "line",
            dataSetsHaveTitle: false,
            background: "#FFFFFF",
            dataSets: [],
            legendPosition: "top",
            verticalAxisPosition: "left",
            title: "Line",
            stacked: false,
          },
        },
        {
          id: "2",
          tag: "chart",
          width: 100,
          height: 100,
          x: 50,
          y: 50,
          data: {
            type: "bar",
            dataSetsHaveTitle: false,
            background: "#FFFFFF",
            dataSets: [],
            legendPosition: "top",
            verticalAxisPosition: "left",
            title: "Bar",
            stacked: false,
          },
        },
      ],
      filterTables: [],
      areGridLinesVisible: true,
      isVisible: true,
    },
  ],
  entities: {},
  styles: {},
  formats: {},
  borders: {},
  revisionId: "6923ee14-e909-4c70-9af6-ebab3ad59070",
  uniqueFigureIds: true,
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
