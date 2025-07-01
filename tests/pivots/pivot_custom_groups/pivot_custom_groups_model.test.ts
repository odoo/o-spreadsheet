import { CommandResult, Model, PivotCustomGroupedField, UID } from "../../../src";
import { setCellContent } from "../../test_helpers/commands_helpers";
import { getFormattedGrid, target } from "../../test_helpers/helpers";
import { createModelWithPivot, updatePivot } from "../../test_helpers/pivot_helpers";

let model: Model;
let pivotId: string;
let sheetId: UID;

const GROUPED_STAGES_FIELD: PivotCustomGroupedField = {
  parentField: "Stage",
  name: "GroupedStages",
  groups: [
    { name: "Initial", values: ["New", "Proposition"] },
    { name: "Final", values: ["Qualified", "Won"] },
  ],
};

const GROUPED_OPPORTUNITIES_FIELD: PivotCustomGroupedField = {
  parentField: "Opportunity",
  name: "GroupedOpportunities",
  groups: [
    { name: "First Group", values: ["my opportunity", "test opportunity"] },
    { name: "Second Group", values: ["5 VP Chairs", "Access to Online Catalog"] },
    { name: "Others", isOtherGroup: true, values: [] },
  ],
};

beforeEach(() => {
  model = createModelWithPivot("A1:I22");
  sheetId = model.getters.getActiveSheetId();
  model.dispatch("CLEAR_FORMATTING", { sheetId, target: target("F2:F22") });
  pivotId = model.getters.getPivotIds()[0];
  setCellContent(model, "A30", "=PIVOT(1)");
});

describe("Custom field are checked for validity", () => {
  test("Cannot have duplicated group names", () => {
    const customField = {
      ...GROUPED_STAGES_FIELD,
      groups: [
        { name: "aa", values: ["New"] },
        { name: "aa", values: ["Won"] },
      ],
    };
    const result = updatePivot(model, pivotId, { customFields: { GroupedStages: customField } });
    expect(result).toBeCancelledBecause(CommandResult.InvalidPivotCustomField);
  });

  test("Cannot have values in multiple groups", () => {
    const customField = {
      ...GROUPED_STAGES_FIELD,
      groups: [
        { name: "aa", values: ["New"] },
        { name: "bb", values: ["New"] },
      ],
    };
    const result = updatePivot(model, pivotId, { customFields: { GroupedStages: customField } });
    expect(result).toBeCancelledBecause(CommandResult.InvalidPivotCustomField);
  });

  test("Cannot have multiple others groups", () => {
    const customField = {
      ...GROUPED_STAGES_FIELD,
      groups: [
        { name: "aa", values: [], isOtherGroup: true },
        { name: "bb", values: [], isOtherGroup: true },
      ],
    };
    const result = updatePivot(model, pivotId, { customFields: { GroupedStages: customField } });
    expect(result).toBeCancelledBecause(CommandResult.InvalidPivotCustomField);
  });

  test("Custom field with a wrong parent fields are flagged as invalid", () => {
    const customField = { ...GROUPED_STAGES_FIELD, parentField: "UnknownField" };
    const result = updatePivot(model, pivotId, {
      rows: [{ fieldName: "GroupedStages" }],
      customFields: { GroupedStages: customField },
    });
    expect(result).toBeSuccessfullyDispatched(); // We don't know what fields exist in the core plugin

    const pivot = model.getters.getPivot(pivotId);
    expect(pivot.definition.rows[0].isValid).toBe(false);
  });
});

describe("Custom fields tests", () => {
  test("Can have a custom field", () => {
    updatePivot(model, pivotId, {
      columns: [
        { fieldName: "GroupedStages", order: "desc" },
        { fieldName: "Stage", order: "asc" },
      ],
      rows: [{ fieldName: "Salesperson", order: "asc" }],
      measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: "Expected Revenue:sum" }],
      customFields: { GroupedStages: GROUPED_STAGES_FIELD },
    });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A30:"My pivot",       B30: "Initial",  C30: "",             D30: "Final",      E30: "",       F30: "",
        A31: "",              B31: "New",      C31: "Proposition",  D31: "Qualified",  E31: "Won",    F31: "Total",
        A33: "Eden",          B33: "24000",    C33: "15000",        D33: "36000",      E33: "2000",   F33: "77000",
        A34: "Kevin",         B34: "97500",    C34: "74600",        D34: "51300",      E34: "19800",  F34: "243200",
        A35: "Total",         B35: "121500",   C35: "89600",        D35: "87300",      E35: "21800",  F35: "320200",
    });
  });

  test("Can have an others group will all the non grouped values", () => {
    updatePivot(model, pivotId, {
      columns: [{ fieldName: "Stage", order: "asc" }],
      rows: [{ fieldName: "GroupedOpportunities", order: "asc" }],
      measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: "Expected Revenue:sum" }],
      customFields: { GroupedOpportunities: GROUPED_OPPORTUNITIES_FIELD },
    });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A30:"My pivot",       B30: "New",     C30: "Proposition",  D30: "Qualified",  E30: "Won",    F30: "Total",
        A32: "First Group",   B32: "13000",   C32: "",             D32: "",           E32: "",       F32: "13000",
        A33: "Second Group",  B33: "",        C33: "5600",         D33: "",           E33: "2000",   F33: "7600",
        A34: "Others",        B34: "108500",  C34: "84000",        D34: "87300",      E34: "19800",  F34: "299600",
        A35: "Total",         B35: "121500",  C35: "89600",        D35: "87300",      E35: "21800",  F35: "320200",
    });
  });

  test("Can sort custom fields, with others group always being at the end", () => {
    updatePivot(model, pivotId, {
      rows: [{ fieldName: "GroupedOpportunities", order: "asc" }],
      columns: [],
      measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: "Expected Revenue:sum" }],
      customFields: { GroupedOpportunities: GROUPED_OPPORTUNITIES_FIELD },
    });
    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A32: "First Group",   B32: "13000",
        A33: "Second Group",  B33: "7600",
        A34: "Others",        B34: "299600",
    });

    updatePivot(model, pivotId, {
      rows: [{ fieldName: "GroupedOpportunities", order: "desc" }],
    });
    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A32: "Second Group",  B32: "7600",
        A33: "First Group",   B33: "13000",
        A34: "Others",        B34: "299600",
    });

    updatePivot(model, pivotId, {
      rows: [{ fieldName: "GroupedOpportunities", order: undefined }],
    });
    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A32: "First Group",   B32: "13000",
        A33: "Second Group",  B33: "7600",
        A34: "Others",        B34: "299600",
    });
  });

  test("Can have multiple custom fields", () => {
    updatePivot(model, pivotId, {
      columns: [{ fieldName: "GroupedStages", order: "desc" }],
      rows: [{ fieldName: "GroupedOpportunities", order: "asc" }],
      measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: "Expected Revenue:sum" }],
      customFields: {
        GroupedStages: GROUPED_STAGES_FIELD,
        GroupedOpportunities: GROUPED_OPPORTUNITIES_FIELD,
      },
    });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A30:"My pivot",       B30: "Initial",  C30: "Final",   D30: "Total",
        A32: "First Group",   B32: "13000",    C32: "",        D32: "13000",
        A33: "Second Group",  B33: "5600",     C33: "2000",    D33: "7600",
        A34: "Others",        B34: "192500",   C34: "107100",  D34: "299600",
        A35: "Total",         B35: "211100",   C35: "109100",  D35: "320200",
    });
  });

  test("Can collapse a custom field", () => {
    updatePivot(model, pivotId, {
      columns: [],
      rows: [
        { fieldName: "GroupedStages", order: "desc" },
        { fieldName: "Salesperson", order: "asc" },
      ],
      measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: "Expected Revenue:sum" }],
      customFields: { GroupedStages: GROUPED_STAGES_FIELD },
      collapsedDomains: {
        ROW: [[{ field: "GroupedStages", value: "Initial", type: "custom" }]],
        COL: [],
      },
    });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A30:"My pivot",       B30: "Total",
        A32: "Initial",       B32: "211100",
        A33: "Final",         B33: "109100",
        A34: "Eden",          B34: "38000",
        A35: "Kevin",         B35: "71100",
        A36: "Total",         B36: "320200",
    });
  });

  test("Can have the custom group in one dimension, and its parent field in the other", () => {
    updatePivot(model, pivotId, {
      columns: [{ fieldName: "GroupedStages", order: "desc" }],
      rows: [{ fieldName: "Stage", order: "asc" }],
      measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: "Expected Revenue:sum" }],
      customFields: { GroupedStages: GROUPED_STAGES_FIELD },
    });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A30:"My pivot",       B30: "Initial",  C30: "Final",   D30: "Total",
        A32: "New",           B32: "121500",   C32: "",        D32: "121500",
        A33: "Proposition",   B33: "89600",    C33: "",        D33: "89600",
        A34: "Qualified",     B34: "",         C34: "87300",   D34: "87300",
        A35: "Won",           B35: "",         C35: "21800",   D35: "21800",
        A36: "Total",         B36: "211100",   C36: "109100",  D36: "320200",
    });
  });

  test("Can use grouped fields with calculated measures", () => {
    updatePivot(model, pivotId, {
      rows: [
        { fieldName: "GroupedOpportunities", order: "asc" },
        { fieldName: "Active", order: "asc" },
      ],
      columns: [],
      measures: [
        {
          id: "calc",
          fieldName: "calc",
          aggregator: "count",
          computedBy: { formula: "=GroupedOpportunities", sheetId },
        },
      ],
      customFields: { GroupedOpportunities: GROUPED_OPPORTUNITIES_FIELD },
    });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A30:"My pivot",       B30: "Total",
        A32: "First Group",   B32: "2", // Subtotal is count of values in sub-group
        A33: "FALSE",         B33: "First Group", // Leaf is =GroupedOpportunities
        A34: "TRUE",          B34: "First Group",
        A35: "Second Group",  B35: "1",
        A36: "FALSE",         B36: "Second Group",
        A37: "Others",        B37: "2",
        A38: "FALSE",         B38: "Others",
        A39: "TRUE",          B39: "Others",
        A40: "Total",         B40: "5",
    });
  });
});
