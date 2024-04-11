const salesperson = [
  "Perceval",
  "Arthur",
  "Dame Séli",
  "Léodagan",
  "Karadoc",
  "Lancelot du Lac",
  "Guenièvre",
  "Bohort",
  "Père Blaise",
  "Yvain",
  "Merlin",
  "Gauvin",
  "Mevanwi",
  "Roi Loth",
  "Uther Pendragon",
  "Goustan le Cruel",
  "Ygeme de Tintagel",
];

const stages = ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

const sources = ["Web", "Phone", "Email", "In person", "Other"];

const customers = Array(30)
  .fill(0)
  .map((_, i) => `Customer ${i + 1}`);

const columns = [
  "Salesperson",
  "Stage",
  "Customer",
  "Email",
  "Amount",
  "Probability",
  "Created on",
  "Source",
  "Active",
];

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function makePivotDataset(rowsNumber = 10_000) {
  const cells = {
    A1: { content: "Salesperson" },
    B1: { content: "Stage" },
    C1: { content: "Customer" },
    D1: { content: "Email" },
    E1: { content: "Amount" },
    F1: { content: "Probability" },
    G1: { content: "Created on" },
    H1: { content: "Source" },
    I1: { content: "Active" },
  };
  let rowIndex = 2;
  const data = [];
  for (let i = 0; i < rowsNumber; i++) {
    const customer = customers[randomIntFromInterval(0, customers.length - 1)];
    cells[`A${rowIndex}`] = {
      content: salesperson[randomIntFromInterval(0, salesperson.length - 1)],
    };
    cells[`B${rowIndex}`] = { content: stages[randomIntFromInterval(0, stages.length - 1)] };
    cells[`C${rowIndex}`] = { content: customer };
    cells[`D${rowIndex}`] = {
      content: `${customer.replace(/\s/g, "").toLowerCase()}@example.com}`,
    };
    cells[`E${rowIndex}`] = { content: `${randomIntFromInterval(0, 100000)}`, format: 2 };
    cells[`F${rowIndex}`] = { content: `${randomIntFromInterval(0, 100)}`, format: 3 };
    cells[`G${rowIndex}`] = { content: `${randomIntFromInterval(40179, 45657)}`, format: 1 }; //random date between 1/1/2010 and 31/12/2024
    cells[`H${rowIndex}`] = { content: sources[randomIntFromInterval(0, sources.length - 1)] };
    cells[`I${rowIndex}`] = { content: Math.random() > 0.5 ? "true" : "false" };
    rowIndex++;
  }
  return {
    sheets: [
      {
        name: "Pivot",
        id: "pivot",
        colNumber: 256,
        rowNumber: rowsNumber + 1,
        cells: {
          A1: {
            content: `=PIVOT("1")`,
          },
        },
      },
      {
        name: "Data",
        id: "data",
        colNumber: columns.length,
        rowNumber: rowsNumber + 1,
        cells,
      },
    ],
    formats: {
      1: "d/m/yyyy",
      2: "[$$]#,##0.00",
      3: "0.00%",
    },
    pivotNextId: 2,
    pivots: {
      1: {
        type: "SPREADSHEET",
        columns: [
          {
            name: "Stage",
          },
        ],
        rows: [
          {
            name: "Created on",
            granularity: "year_number",
            order: "asc",
          },
        ],
        measures: [
          {
            name: "Amount",
            aggregator: "sum",
          },
        ],
        name: "My pivot",
        dataSet: {
          zone: {
            top: 0,
            bottom: rowsNumber,
            left: 0,
            right: 8,
          },
          sheetId: "data",
        },
        formulaId: "1",
      },
    },
  };
}
