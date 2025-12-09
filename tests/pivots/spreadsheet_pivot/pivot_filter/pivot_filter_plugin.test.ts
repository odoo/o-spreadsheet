import { Model } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetPivotCoreDefinition } from "@odoo/o-spreadsheet-engine/types/pivot";
import { getEvaluatedGrid } from "../../../test_helpers";
import { createModelFromGrid } from "../../../test_helpers/helpers";
import { addPivot, createModelWithTestPivotDataset } from "../../../test_helpers/pivot_helpers";

describe("pivot table with filters", () => {
  test("Hide a value with a values filter", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer",   B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice",      B2: "10",
      A3: "Bob",        B3: "20",
      A4: "Olaf",       B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      rows: [{ fieldName: "Customer", order: "asc" }],
      columns: [],
      measures: [{ id: "price", fieldName: "Price", aggregator: "sum" }],
      filters: [{ fieldName: "Customer", filterType: "values", hiddenValues: ["Alice"] }],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:C5")).toEqual([
      ["Pivot"],
      [""],
      ["Bob"],
      ["Olaf"],
      ["Total"]
    ]);
  });

  test("Hide all values with a values filter", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice", B2: "10",
      A3: "Bob", B3: "20",
      A4: "Olaf", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      rows: [{ fieldName: "Customer", order: "asc" }],
      columns: [],
      measures: [{ id: "price", fieldName: "Price", aggregator: "sum" }],
      filters: [
        { fieldName: "Customer", filterType: "values", hiddenValues: ["Alice", "Bob", "Olaf"] },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:C2")).toEqual([
      ["Pivot"],
      [""],
    ]);
  });

  test("Hide no values with a values filter", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice", B2: "10",
      A3: "Bob", B3: "20",
      A4: "Olaf", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      rows: [{ fieldName: "Customer", order: "asc" }],
      columns: [],
      measures: [{ id: "price", fieldName: "Price", aggregator: "sum" }],
      filters: [{ fieldName: "Customer", filterType: "values", hiddenValues: [] }],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:C5")).toEqual([
      ["Pivot"],
      [""],
      ["Alice"],
      ["Bob"],
      ["Olaf"],
    ]);
  });

  test("Hide values with a text criterion filter", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice", B2: "10",
      A3: "Bob", B3: "20",
      A4: "Olaf", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      rows: [{ fieldName: "Customer", order: "asc" }],
      columns: [],
      measures: [{ id: "price", fieldName: "Price", aggregator: "sum" }],
      filters: [
        { fieldName: "Customer", filterType: "criterion", type: "beginsWithText", values: ["a"] },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:C4")).toEqual([
      ["Pivot"],
      [""],
      ["Alice"],
      ["Total"],
    ]);
  });

  test("Hide values with a number criterion filter", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "=PIVOT(1)",
      A2: "Alice", B2: "10",
      A3: "Bob", B3: "20",
      A4: "Olaf", B4: "30",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B4", {
      rows: [{ fieldName: "Customer", order: "asc" }],
      columns: [],
      measures: [{ id: "price", fieldName: "Price", aggregator: "sum" }],
      filters: [
        { fieldName: "Price", filterType: "criterion", type: "isLessThan", values: ["25"] },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:D5")).toEqual([
      ["Pivot", "Total"],
      ["", "Price"],
      ["Alice", "10"],
      ["Bob", "20"],
      ["Total", "30"]
    ]);
  });

  test("Hide values with a date criterion filter", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price", C1: "Date", D1: "=PIVOT(1)",
      A2: "Alice", B2: "10", C2: "1/1/2001",
      A3: "Bob", B3: "20", C3: "2/2/2002",
      A4: "Olaf", B4: "30", C4: "3/3/2003"
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C4", {
      rows: [{ fieldName: "Customer", order: "asc" }],
      columns: [],
      measures: [{ id: "price", fieldName: "Price", aggregator: "sum" }],
      filters: [
        {
          fieldName: "Date",
          filterType: "criterion",
          type: "dateIsBefore",
          values: ["2/2/2002"],
          dateValue: "exactDate",
        },
      ],
    });
    // prettier-ignore
    expect(getEvaluatedGrid(model, "D1:E4")).toEqual([
      ["Pivot", "Total"],
      ["", "Price"],
      ["Alice", "10"],
      ["Total", "10"]
    ]);
  });
});

test("migration", () => {
  const data = {
    version: "19.1.0",
    pivots: {
      1: {
        type: "SPREADSHEET",
        columns: [],
        domain: [],
        measures: [{ id: "probability:sum", fieldName: "probability", aggregator: "sum" }],
        model: "partner",
        rows: [{ fieldName: "bar" }],
        sortedColumn: {
          measure: "foo",
          order: "asc",
        },
        name: "A pivot",
        formulaId: "1",
      },
    },
  };
  const model = new Model(data);
  expect(model.getters.getPivot("1").definition.filters).toEqual([]);
});

test("Import/export", () => {
  const pivotDefinition: Partial<SpreadsheetPivotCoreDefinition> = {
    columns: [{ fieldName: "Salesperson" }],
    filters: [{ fieldName: "Active", filterType: "values", hiddenValues: ["FALSE"] }],
  };
  const model = createModelWithTestPivotDataset(pivotDefinition);
  const exported = model.exportData();
  expect(exported.pivots["pivotId"].filters).toEqual([
    {
      fieldName: "Active",
      filterType: "values",
      hiddenValues: ["FALSE"],
    },
  ]);
  const importedModel = new Model(exported);
  expect(importedModel.getters.getPivot("pivotId").definition.filters).toEqual([
    {
      fieldName: "Active",
      displayName: "Active",
      isValid: true,
      filterType: "values",
      hiddenValues: ["FALSE"],
    },
  ]);
});
