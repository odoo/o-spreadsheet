import { Model, PivotSortedColumn, SpreadsheetPivotCoreDefinition } from "../../src";
import { PREVIOUS_VALUE } from "../../src/helpers/pivot/pivot_domain_helpers";
import { getFormattedGrid, getGrid } from "../test_helpers/helpers";
import { createModelWithTestPivotDataset, updatePivot } from "../test_helpers/pivot_helpers";

// prettier-ignore
const unsortedGrid = {
    A20: "(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
    A22: "February",    B22: 22500,    C22: "",     D22: 22500,
    A23: "March",       B23: 125400,   C23: 64000,  D23: 189400,
    A24: "April",       B24: 82300,    C24: 26000,  D24: 108300,
    A25: "Total",       B25: 230200,   C25: 90000,  D25: 320200,
}

describe("Pivot sorting", () => {
  test("Can sort the pivot on any column", () => {
    const model = createModelWithTestPivotDataset();
    expect(getGrid(model)).toMatchObject(unsortedGrid);

    updatePivot(model, "pivotId", {
      sortedCol: {
        measure: "measureId",
        order: "asc",
        domain: [{ field: "Salesperson", value: "Alice", type: "char" }],
      },
    });
    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
        A20: "(#1) Pivot",   B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",     B22: 22500,    C22: "",     D22: 22500,
        A23: "April",        B23: 82300,    C23: 26000,  D23: 108300,
        A24: "March",        B24: 125400,   C24: 64000,  D24: 189400,
        A25: "Total",        B25: 230200,   C25: 90000,  D25: 320200,
    });

    updatePivot(model, "pivotId", {
      sortedCol: {
        measure: "measureId",
        order: "asc",
        domain: [{ field: "Salesperson", value: "Bob", type: "char" }],
      },
    });
    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",   B22: 22500,    C22: "",     D22: 22500,
        A23: "April",      B23: 82300,    C23: 26000,  D23: 108300,
        A24: "March",      B24: 125400,   C24: 64000,  D24: 189400,
        A25: "Total",      B25: 230200,   C25: 90000,  D25: 320200,
    });

    updatePivot(model, "pivotId", {
      sortedCol: { measure: "measureId", order: "desc", domain: [] },
    });
    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "March",      B22: 125400,   C22: 64000,  D22: 189400,
        A23: "April",      B23: 82300,    C23: 26000,  D23: 108300,
        A24: "February",   B24: 22500,    C24: "",     D24: 22500,
        A25: "Total",      B25: 230200,   C25: 90000,  D25: 320200,
    });
  });

  test("Empty values are sorted as the smallest value", () => {
    const model = createModelWithTestPivotDataset();
    const bobColumn: PivotSortedColumn = {
      measure: "measureId",
      order: "asc",
      domain: [{ field: "Salesperson", value: "Bob", type: "char" }],
    };

    updatePivot(model, "pivotId", { sortedCol: { ...bobColumn, order: "asc" } });
    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
      A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
      A22: "February",   B22: 22500,    C22: "",     D22: 22500,
      A23: "April",      B23: 82300,    C23: 26000,  D23: 108300,
      A24: "March",      B24: 125400,   C24: 64000,  D24: 189400,
      A25: "Total",      B25: 230200,   C25: 90000,  D25: 320200,
    });

    updatePivot(model, "pivotId", { sortedCol: { ...bobColumn, order: "desc" } });
    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
      A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
      A22: "March",      B22: 125400,   C22: 64000,  D22: 189400,
      A23: "April",      B23: 82300,    C23: 26000,  D23: 108300,
      A24: "February",   B24: 22500,    C24: "",     D24: 22500,
      A25: "Total",      B25: 230200,   C25: 90000,  D25: 320200,
    });
  });

  test("Can sort on pivot with multiple group by", () => {
    const model = createModelWithTestPivotDataset({
      rows: [
        { fieldName: "Created on", granularity: "month_number", order: "asc" },
        { fieldName: "Active", order: "asc" },
      ],
      sortedCol: { measure: "measureId", order: "asc", domain: [] },
    });

    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
        A20:"(#1) Pivot",    B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",     B22: 22500,    C22: "",     D22: 22500,
        A23: "FALSE",        B23: 22500,    C23: "",     D23: 22500,
        A24: "April",        B24: 82300,    C24: 26000,  D24: 108300,
        A25: "TRUE",         B25: 17300,    C25: 26000,  D25: 43300,
        A26: "FALSE",        B26: 65000,    C26: "",     D26: 65000,
        A27: "March",        B27: 125400,   C27: 64000,  D27: 189400,
        A28: "TRUE",         B28: 19800,    C28: 11000,  D28: 30800,
        A29: "FALSE",        B29: 105600,   C29: 53000,  D29: 158600,
        A30: "Total",        B30: 230200,   C30: 90000,  D30: 320200,
    });

    updatePivot(model, "pivotId", {
      sortedCol: {
        measure: "measureId",
        order: "desc",
        domain: [{ field: "Salesperson", value: "Alice", type: "char" }],
      },
    });
    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
        A20:"(#1) Pivot",    B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "March",        B22: 125400,   C22: 64000,  D22: 189400,
        A23: "FALSE",        B23: 105600,   C23: 53000,  D23: 158600,
        A24: "TRUE",         B24: 19800,    C24: 11000,  D24: 30800,
        A25: "April",        B25: 82300,    C25: 26000,  D25: 108300,
        A26: "FALSE",        B26: 65000,    C26: "",     D26: 65000,
        A27: "TRUE",         B27: 17300,    C27: 26000,  D27: 43300,
        A28: "February",     B28: 22500,    C28: "",     D28: 22500,
        A29: "FALSE",        B29: 22500,    C29: "",     D29: 22500,
        A30: "Total",        B30: 230200,   C30: 90000,  D30: 320200,
    });
  });

  test("Trying to sort the pivot on an invalid column or measure does nothing", () => {
    const model = createModelWithTestPivotDataset({
      sortedCol: {
        measure: "measureId",
        order: "asc",
        domain: [{ field: "Salesperson", value: "Random Pouilleux", type: "char" }],
      },
    });
    expect(getGrid(model)).toMatchObject(unsortedGrid);

    updatePivot(model, "pivotId", {
      sortedCol: {
        measure: "measureId",
        order: "asc",
        domain: [{ field: "Not a real field", value: "Alice", type: "char" }],
      },
    });
    expect(getGrid(model)).toMatchObject(unsortedGrid);

    updatePivot(model, "pivotId", {
      sortedCol: {
        measure: "Not a real measure",
        order: "asc",
        domain: [{ field: "Salesperson", value: "Alice", type: "char" }],
      },
    });
    expect(getGrid(model)).toMatchObject(unsortedGrid);
  });

  test("Can sort on a calculated measure", () => {
    const model = createModelWithTestPivotDataset();
    const sheetId = model.getters.getActiveSheetId();
    updatePivot(model, "pivotId", {
      measures: [
        {
          id: "Expected Revenue",
          fieldName: "Expected Revenue",
          aggregator: "sum",
          isHidden: true,
        },
        {
          id: "Twice the revenue",
          fieldName: "Twice the revenue",
          aggregator: "sum",
          computedBy: { formula: "='Expected Revenue'*2", sheetId },
        },
      ],
      sortedCol: {
        measure: "Twice the revenue",
        order: "asc",
        domain: [],
      },
    });
    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "",      D20: "Bob", // FIXME: headers are bugged when hiding a measure
        A22: "February",   B22: 45000,    C22: 0,       D22: 45000,
        A23: "April",      B23: 164600,   C23: 52000,   D23: 216600,
        A24: "March",      B24: 250800,   C24: 128000,  D24: 378800,
        A25: "Total",      B25: 460400,   C25: 180000,  D25: 640400,
    });
  });

  test("Sorting is applied before measure display", () => {
    const model = createModelWithTestPivotDataset({
      measures: [
        {
          id: "measureId",
          fieldName: "Expected Revenue",
          aggregator: "sum",
          display: {
            type: "running_total",
            fieldNameWithGranularity: "Created on:month_number",
          },
        },
      ],
      sortedCol: {
        measure: "measureId",
        order: "asc",
        domain: [],
      },
    });

    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",   B22: 22500,    C22: 0,      D22: 22500,
        A23: "April",      B23: 104800,   C23: 26000,  D23: 130800,
        A24: "March",      B24: 230200,   C24: 90000,  D24: 320200,
        A25: "Total",      B25: "",       C25: "",     D25: "",
    });
  });

  test("(previous) in measure display take sorting into account", () => {
    // Note: this is explicitly disable in Excel.
    const model = createModelWithTestPivotDataset({
      sortedCol: {
        measure: "measureId",
        order: "asc",
        domain: [],
      },
    });

    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",   B22: 22500,    C22: "",     D22: 22500,
        A23: "April",      B23: 82300,    C23: 26000,  D23: 108300,
        A24: "March",      B24: 125400,   C24: 64000,  D24: 189400,
        A25: "Total",      B25: 230200,   C25: 90000,  D25: 320200,
    });

    updatePivot(model, "pivotId", {
      measures: [
        {
          id: "measureId",
          fieldName: "Expected Revenue",
          aggregator: "sum",
          display: {
            type: "%_of",
            fieldNameWithGranularity: "Created on:month_number",
            value: PREVIOUS_VALUE,
          },
        },
      ],
    });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",   B22: "100.00%",  C22: "",         D22: "100.00%",
        A23: "April",      B23: "365.78%",  C23: "",         D23: "481.33%",
        A24: "March",      B24: "152.37%",  C24: "246.15%",  D24: "174.88%",
        A25: "Total",      B25: "",         C25: "",         D25: "",
    });
  });

  test("Can import/export sorted pivot ", () => {
    const pivotDefinition: Partial<SpreadsheetPivotCoreDefinition> = {
      columns: [{ fieldName: "Salesperson" }],
      sortedCol: {
        measure: "measureId",
        order: "asc",
        domain: [{ field: "Salesperson", value: "Alice", type: "char" }],
      },
    };
    const model = createModelWithTestPivotDataset(pivotDefinition);

    const exported = model.exportData();
    expect(exported.pivots).toMatchObject({ pivotId: pivotDefinition });

    const importedModel = new Model(exported);
    expect(importedModel.getters.getPivotCoreDefinition("pivotId")).toMatchObject(pivotDefinition);
  });
});
