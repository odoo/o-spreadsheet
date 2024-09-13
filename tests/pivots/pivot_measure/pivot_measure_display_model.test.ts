import { CellErrorType, PivotMeasureDisplay } from "../../../src";
import { NEXT_VALUE, PREVIOUS_VALUE } from "../../../src/helpers/pivot/pivot_domain_helpers";
import { setCellContent } from "../../test_helpers/commands_helpers";
import { getCell, getEvaluatedCell } from "../../test_helpers/getters_helpers";
import { getFormattedGrid, getGrid } from "../../test_helpers/helpers";
import {
  createModelWithTestPivotDataset,
  updatePivot,
  updatePivotMeasureDisplay,
} from "../../test_helpers/pivot_helpers";

const pivotId = "pivotId";
const measureId = "measureId";

describe("Measure display", () => {
  test("Can display measures with no calculations", () => {
    const model = createModelWithTestPivotDataset();
    updatePivotMeasureDisplay(model, pivotId, measureId, { type: "no_calculations" });

    expect(model.getters.getPivotCoreDefinition(pivotId).measures[0].display).toEqual({
      type: "no_calculations",
    });

    // prettier-ignore
    expect(getGrid(model)).toMatchObject({
        A20: "(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",    B22: 22500,    C22: "",     D22: 22500,
        A23: "March",       B23: 125400,   C23: 64000,  D23: 189400,
        A24: "April",       B24: 82300,    C24: 26000,  D24: 108300,
        A25: "Total",       B25: 230200,   C25: 90000,  D25: 320200,
    });
  });

  test("%_of_grand_total display type", () => {
    const model = createModelWithTestPivotDataset();
    updatePivotMeasureDisplay(model, pivotId, measureId, { type: "%_of_grand_total" });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A20: "(#1) Pivot",  B20: "Alice",   C20: "Bob",     D20: "Total",
        A22: "February",    B22: "7.03%",   C22: "0.00%",   D22: "7.03%",
        A23: "March",       B23: "39.16%",  C23: "19.99%",  D23: "59.15%",
        A24: "April",       B24: "25.70%",  C24: "8.12%",   D24: "33.82%",
        A25: "Total",       B25: "71.89%",  C25: "28.11%",  D25: "100.00%",
    });
  });

  test("Displayed measure are updated when changing the aggregator", () => {
    const model = createModelWithTestPivotDataset();
    updatePivot(model, pivotId, {
      measures: [
        {
          fieldName: "Expected Revenue",
          aggregator: "max",
          id: measureId,
          display: { type: "%_of_grand_total" },
        },
      ],
    });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
        A20: "(#1) Pivot",  B20: "Alice",    C20: "Bob",     D20: "Total",
        A22: "February",    B22: "37.50%",   C22: "0.00%",   D22: "37.50%",
        A23: "March",       B23: "100.00%",  C23: "58.33%",  D23: "100.00%",
        A24: "April",       B24: "66.67%",   C24: "40.00%",  D24: "66.67%",
        A25: "Total",       B25: "100.00%",  C25: "58.33%",  D25: "100.00%",
    });
  });

  test("%_of_col_total display type", () => {
    const model = createModelWithTestPivotDataset();
    updatePivotMeasureDisplay(model, pivotId, measureId, { type: "%_of_col_total" });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
      A20: "(#1) Pivot",  B20: "Alice",    C20: "Bob",      D20: "Total",
      A22: "February",    B22: "9.77%",    C22: "0.00%",    D22: "7.03%",
      A23: "March",       B23: "54.47%",   C23: "71.11%",   D23: "59.15%",
      A24: "April",       B24: "35.75%",   C24: "28.89%",   D24: "33.82%",
      A25: "Total",       B25: "100.00%",  C25: "100.00%",  D25: "100.00%",
    });
  });

  test("%_of_row_total display type", () => {
    const model = createModelWithTestPivotDataset();
    updatePivotMeasureDisplay(model, pivotId, measureId, { type: "%_of_row_total" });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
      A20: "(#1) Pivot",  B20: "Alice",    C20: "Bob",     D20: "Total",
      A22: "February",    B22: "100.00%",  C22: "0.00%",   D22: "100.00%",
      A23: "March",       B23: "66.21%",   C23: "33.79%",  D23: "100.00%",
      A24: "April",       B24: "75.99%",   C24: "24.01%",  D24: "100.00%",
      A25: "Total",       B25: "71.89%",   C25: "28.11%",  D25: "100.00%",
    });
  });

  test("%_of_parent_row_total display type", () => {
    const model = createModelWithTestPivotDataset({
      rows: [
        { fieldName: "Created on", granularity: "month_number", order: "asc" },
        { fieldName: "Active", order: "asc" },
      ],
      measures: [
        {
          fieldName: "Expected Revenue",
          aggregator: "sum",
          id: measureId,
          display: { type: "%_of_parent_row_total" },
        },
      ],
    });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
      A20: "(#1) Pivot",      B20: "Alice",    C20: "Bob",      D20: "Total",
      A22: "February",        B22: "9.77%",    C22: "0.00%",    D22: "7.03%",
      A23: "    FALSE",       B23: "100.00%",  C23: "",         D23: "100.00%",
      A24: "March",           B24: "54.47%",   C24: "71.11%",   D24: "59.15%",
      A25: "    FALSE",       B25: "84.21%",   C25: "82.81%",   D25: "83.74%",
      A26: "    TRUE",        B26: "15.79%",   C26: "17.19%",   D26: "16.26%",
      A27: "April",           B27: "35.75%",   C27: "28.89%",   D27: "33.82%",
      A28: "    FALSE",       B28: "78.98%",   C28: "0.00%",    D28: "60.02%",
      A29: "    TRUE",        B29: "21.02%",   C29: "100.00%",  D29: "39.98%",
      A30: "Total",           B30: "100.00%",  C30: "100.00%",  D30: "100.00%",
    });
  });

  test("%_of_parent_col_total display type", () => {
    const model = createModelWithTestPivotDataset();
    updatePivot(model, pivotId, {
      columns: [
        { fieldName: "Salesperson", order: "asc" },
        { fieldName: "Active", order: "asc" },
      ],
      measures: [
        {
          fieldName: "Expected Revenue",
          aggregator: "sum",
          id: measureId,
          display: { type: "%_of_parent_col_total" },
        },
      ],
    });

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
      A20:"(#1) Pivot",  B20: "Alice",    C20: "",        D20: "Bob",     E20: "",         F20: "",
      A21: "",           B21: "FALSE",    C21: "TRUE",    D21: "FALSE",   E21: "TRUE",     F21: "Total",
      A23: "February",   B23: "100.00%",  C23: "0.00%",   D23: "",        E23: "",         F23: "100.00%",
      A24: "March",      B24: "84.21%",   C24: "15.79%",  D24: "82.81%",  E24: "17.19%",   F24: "100.00%",
      A25: "April",      B25: "78.98%",   C25: "21.02%",  D25: "0.00%",   E25: "100.00%",  F25: "100.00%",
      A26: "Total",      B26: "83.88%",   C26: "16.12%",  D26: "58.89%",  E26: "41.11%",   F26: "100.00%",
    });
  });

  describe("%_of_parent_total", () => {
    test("%_of_parent_total on row", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of_parent_total",
        fieldNameWithGranularity: "Created on:month_number",
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",           B22: "100.00%",  C22: "",         D22: "100.00%",
        A23: "    FALSE",          B23: "100.00%",  C23: "",         D23: "100.00%",
        A24: "        Won",        B24: "100.00%",  C24: "",         D24: "100.00%",
        A25: "March",              B25: "100.00%",  C25: "100.00%",  D25: "100.00%",
        A26: "    FALSE",          B26: "84.21%",   C26: "82.81%",   D26: "83.74%",
        A27: "        New",        B27: "84.21%",   C27: "23.44%",   D27: "63.67%",
        A28: "        Won",        B28: "0.00%",    C28: "59.38%",   D28: "20.06%",
        A29: "    TRUE",           B29: "15.79%",   C29: "17.19%",   D29: "16.26%",
        A30: "        New",        B30: "0.00%",    C30: "17.19%",   D30: "5.81%",
        A31: "        Won",        B31: "15.79%",   C31: "0.00%",    D31: "10.45%",
        A32: "April",              B32: "100.00%",  C32: "100.00%",  D32: "100.00%",
        A33: "    FALSE",          B33: "78.98%",   C33: "0.00%",    D33: "60.02%",
        A34: "        New",        B34: "48.60%",   C34: "0.00%",    D34: "36.93%",
        A35: "        Won",        B35: "30.38%",   C35: "0.00%",    D35: "23.08%",
        A36: "    TRUE",           B36: "21.02%",   C36: "100.00%",  D36: "39.98%",
        A37: "        New",        B37: "10.94%",   C37: "92.31%",   D37: "30.47%",
        A38: "        Won",        B38: "10.09%",   C38: "7.69%",    D38: "9.51%",
        A39: "Total",              B39: "",         C39: "",         D39: "",
      });
    });

    test("Can display measure as percentage of given parent field on non-root parent row", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of_parent_total",
        fieldNameWithGranularity: "Active",
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",           B22: "",         C22: "",         D22: "",
        A23: "    FALSE",          B23: "100.00%",  C23: "",         D23: "100.00%",
        A24: "        Won",        B24: "100.00%",  C24: "",         D24: "100.00%",
        A25: "March",              B25: "",         C25: "",         D25: "",
        A26: "    FALSE",          B26: "100.00%",  C26: "100.00%",  D26: "100.00%",
        A27: "        New",        B27: "100.00%",  C27: "28.30%",   D27: "76.04%",
        A28: "        Won",        B28: "0.00%",    C28: "71.70%",   D28: "23.96%",
        A29: "    TRUE",           B29: "100.00%",  C29: "100.00%",  D29: "100.00%",
        A30: "        New",        B30: "0.00%",    C30: "100.00%",  D30: "35.71%",
        A31: "        Won",        B31: "100.00%",  C31: "0.00%",    D31: "64.29%",
        A32: "April",              B32: "",         C32: "",         D32: "",
        A33: "    FALSE",          B33: "100.00%",  C33: "",         D33: "100.00%",
        A34: "        New",        B34: "61.54%",   C34: "",         D34: "61.54%",
        A35: "        Won",        B35: "38.46%",   C35: "",         D35: "38.46%",
        A36: "    TRUE",           B36: "100.00%",  C36: "100.00%",  D36: "100.00%",
        A37: "        New",        B37: "52.02%",   C37: "92.31%",   D37: "76.21%",
        A38: "        Won",        B38: "47.98%",   C38: "7.69%",    D38: "23.79%",
        A39: "Total",              B39: "",         C39: "",         D39: "",
      });
    });

    test("Can display measure as percentage of given parent field on a parent column", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of_parent_total",
        fieldNameWithGranularity: "Salesperson",
      };
      const model = createModelWithTestPivotDataset({
        columns: [
          { fieldName: "Salesperson", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",   C20: "",         D20: "Bob",     E20: "",        F20: "",
        A21: "",           B21: "New",     C21: "Won",      D21: "New",     E21: "Won",     F21: "Total",
        A23: "February",   B23: "0.00%",   C23: "100.00%",  D23: "",        E23: "",        F23: "",
        A24: "March",      B24: "84.21%",  C24: "15.79%",   D24: "40.63%",  E24: "59.38%",  F24: "",
        A25: "April",      B25: "59.54%",  C25: "40.46%",   D25: "92.31%",  E25: "7.69%",   F25: "",
        A26: "Total",      B26: "67.16%",  C26: "32.84%",   D26: "55.56%",  E26: "44.44%",  F26: "",
      });
    });

    test("%_of_parent_total with field not in the pivot", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of_parent_total",
        fieldNameWithGranularity: "Active",
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",   D20: "Total",
        A22: "February",   B22: "#N/A",   C22: "#N/A",  D22: "#N/A",
        A23: "March",      B23: "#N/A",   C23: "#N/A",  D23: "#N/A",
        A24: "April",      B24: "#N/A",   C24: "#N/A",  D24: "#N/A",
        A25: "Total",      B25: "#N/A",   C25: "#N/A",  D25: "#N/A",
      });
      expect(getEvaluatedCell(model, "B22").message).toEqual(
        'Field "Active" not found in pivot for measure display calculation'
      );
    });
  });

  describe("%_of", () => {
    test("Can display measure as %_of given row field value", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of",
        fieldNameWithGranularity: "Created on:month_number",
        value: 2,
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",    C20: "Bob",  D20: "Total",
        A22: "February",   B22: "100.00%",  C22: "",     D22: "100.00%", // No value for Bob in February, so the whole col is empty
        A23: "March",      B23: "557.33%",  C23: "",     D23: "841.78%",
        A24: "April",      B24: "365.78%",  C24: "",     D24: "481.33%",
        A25: "Total",      B25: "",         C25: "",     D25: "",
      });
    });

    test("Can display measure as %_of given col field value", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of",
        fieldNameWithGranularity: "Salesperson",
        value: "Alice",
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",    C20: "Bob",     D20: "Total",
        A22: "February",   B22: "100.00%",  C22: "#NULL!",  D22: "",
        A23: "March",      B23: "100.00%",  C23: "51.04%",  D23: "",
        A24: "April",      B24: "100.00%",  C24: "31.59%",  D24: "",
        A25: "Total",      B25: "100.00%",  C25: "39.10%",  D25: "",
      });
    });

    test("%_of with multi level grouping", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of",
        fieldNameWithGranularity: "Active",
        value: false,
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",           B22: "",         C22: "",         D22: "",
        A23: "    FALSE",          B23: "100.00%",  C23: "",         D23: "100.00%",
        A24: "        Won",        B24: "100.00%",  C24: "",         D24: "100.00%",
        A25: "March",              B25: "",         C25: "",         D25: "",
        A26: "    FALSE",          B26: "100.00%",  C26: "100.00%",  D26: "100.00%",
        A27: "        New",        B27: "100.00%",  C27: "100.00%",  D27: "100.00%",
        A28: "        Won",        B28: "",         C28: "100.00%",  D28: "100.00%",
        A29: "    TRUE",           B29: "18.75%",   C29: "20.75%",   D29: "19.42%",
        A30: "        New",        B30: "#NULL!",   C30: "73.33%",   D30: "9.12%",
        A31: "        Won",        B31: "",         C31: "#NULL!",   D31: "52.11%",
        A32: "April",              B32: "",         C32: "",         D32: "",
        A33: "    FALSE",          B33: "100.00%",  C33: "",         D33: "100.00%",
        A34: "        New",        B34: "100.00%",  C34: "",         D34: "100.00%",
        A35: "        Won",        B35: "100.00%",  C35: "",         D35: "100.00%",
        A36: "    TRUE",           B36: "26.62%",   C36: "",         D36: "66.62%",
        A37: "        New",        B37: "22.50%",   C37: "",         D37: "82.50%",
        A38: "        Won",        B38: "33.20%",   C38: "",         D38: "41.20%",
        A39: "Total",              B39: "",         C39: "",         D39: "",
      });
    });

    test("%_of (previous)", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of",
        fieldNameWithGranularity: "Created on:month_number",
        value: PREVIOUS_VALUE,
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",    C20: "Bob",     D20: "Total",
        A22: "February",   B22: "100.00%",  C22: "",        D22: "100.00%",
        A23: "March",      B23: "557.33%",  C23: "",        D23: "841.78%",
        A24: "April",      B24: "65.63%",   C24: "40.63%",  D24: "57.18%",
        A25: "Total",      B25: "",         C25: "",        D25: "",
      });
    });

    test("%_of (next)", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of",
        fieldNameWithGranularity: "Salesperson",
        value: NEXT_VALUE,
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",   B22: "",         C22: "",         D22: "",
        A23: "March",      B23: "195.94%",  C23: "100.00%",  D23: "",
        A24: "April",      B24: "316.54%",  C24: "100.00%",  D24: "",
        A25: "Total",      B25: "255.78%",  C25: "100.00%",  D25: "",
      });
    });

    test("%_of (previous) with multi level grouping", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of",
        fieldNameWithGranularity: "Active",
        value: PREVIOUS_VALUE,
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",           B22: "",         C22: "",         D22: "",
        A23: "    FALSE",          B23: "100.00%",  C23: "",         D23: "100.00%",
        A24: "        Won",        B24: "100.00%",  C24: "",         D24: "100.00%",
        A25: "March",              B25: "",         C25: "",         D25: "",
        A26: "    FALSE",          B26: "100.00%",  C26: "100.00%",  D26: "100.00%",
        A27: "        New",        B27: "100.00%",  C27: "100.00%",  D27: "100.00%",
        A28: "        Won",        B28: "",         C28: "100.00%",  D28: "100.00%",
        A29: "    TRUE",           B29: "18.75%",   C29: "20.75%",   D29: "19.42%",
        A30: "        New",        B30: "#NULL!",   C30: "73.33%",   D30: "9.12%",
        A31: "        Won",        B31: "",         C31: "#NULL!",   D31: "52.11%",
        A32: "April",              B32: "",         C32: "",         D32: "",
        A33: "    FALSE",          B33: "100.00%",  C33: "",         D33: "100.00%",
        A34: "        New",        B34: "100.00%",  C34: "",         D34: "100.00%",
        A35: "        Won",        B35: "100.00%",  C35: "",         D35: "100.00%",
        A36: "    TRUE",           B36: "26.62%",   C36: "",         D36: "66.62%",
        A37: "        New",        B37: "22.50%",   C37: "",         D37: "82.50%",
        A38: "        Won",        B38: "33.20%",   C38: "",         D38: "41.20%",
        A39: "Total",              B39: "",         C39: "",         D39: "",
      });
    });

    test("%_of (previous) with field sorted in descending order", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of",
        fieldNameWithGranularity: "Created on:month_number",
        value: PREVIOUS_VALUE,
      };
      const model = createModelWithTestPivotDataset({
        rows: [{ fieldName: "Created on", granularity: "month_number", order: "desc" }],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "April",      B22: "100.00%",  C22: "100.00%",  D22: "100.00%",
        A23: "March",      B23: "152.37%",  C23: "246.15%",  D23: "174.88%",
        A24: "February",   B24: "17.94%",   C24: "#NULL!",   D24: "11.88%",
        A25: "Total",      B25: "",         C25: "",         D25: "",
      });
    });

    test("%_of with field not in pivot", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of",
        fieldNameWithGranularity: "Stages",
        value: "Won",
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",   D20: "Total",
        A22: "February",   B22: "#N/A",   C22: "#N/A",  D22: "#N/A",
        A23: "March",      B23: "#N/A",   C23: "#N/A",  D23: "#N/A",
        A24: "April",      B24: "#N/A",   C24: "#N/A",  D24: "#N/A",
        A25: "Total",      B25: "#N/A",   C25: "#N/A",  D25: "#N/A",
      });
    });

    test("%_of with field value not in pivot", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of",
        fieldNameWithGranularity: "Salesperson",
        value: "Annette",
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",   D20: "Total",
        A22: "February",   B22: "#N/A",   C22: "#N/A",  D22: "",
        A23: "March",      B23: "#N/A",   C23: "#N/A",  D23: "",
        A24: "April",      B24: "#N/A",   C24: "#N/A",  D24: "",
        A25: "Total",      B25: "#N/A",   C25: "#N/A",  D25: "",
      });
    });

    test("%_of make the difference between value 0 and empty value", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_of",
        fieldNameWithGranularity: "Salesperson",
        value: "Bob",
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // No value for Bob in February, so the percentage from Bob for Alice is empty
      expect(getEvaluatedCell(model, "B22").value).toEqual("");
      expect(getEvaluatedCell(model, "C22").value).toEqual("");

      setCellContent(model, "A2", "02/02/2024");
      setCellContent(model, "C2", ""); // Empty Expected Revenue for Bob in February
      expect(getEvaluatedCell(model, "B22").value).toEqual("");
      expect(getEvaluatedCell(model, "C22").value).toEqual("");

      setCellContent(model, "C2", "0"); // 0 Expected Revenue for Bob in February
      expect(getEvaluatedCell(model, "B22").value).toEqual(CellErrorType.DivisionByZero);
      expect(getEvaluatedCell(model, "C22").value).toEqual(CellErrorType.DivisionByZero);
    });
  });

  describe("difference_from", () => {
    test("Can display measure as difference_from given row field value", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "difference_from",
        fieldNameWithGranularity: "Created on:month_number",
        value: 2,
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",   C20: "Bob",    D20: "Total",
        A22: "February",   B22: "",        C22: "",       D22: "",
        A23: "March",      B23: "102900",  C23: "64000",  D23: "166900",
        A24: "April",      B24: "59800",   C24: "26000",  D24: "85800",
        A25: "Total",      B25: "",        C25: "",       D25: "",
      });
    });

    test("Can display measure as difference_from given col field value", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "difference_from",
        fieldNameWithGranularity: "Salesperson",
        value: "Alice",
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",      D20: "Total",
        A22: "February",   B22: "",       C22: "-22500",   D22: "",
        A23: "March",      B23: "",       C23: "-61400",   D23: "",
        A24: "April",      B24: "",       C24: "-56300",   D24: "",
        A25: "Total",      B25: "",       C25: "-140200",  D25: "",
      });
    });

    test("difference_from with multi level grouping", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "difference_from",
        fieldNameWithGranularity: "Active",
        value: true,
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",   C20: "Bob",     D20: "Total",
        A22: "February",           B22: "",        C22: "",        D22: "",
        A23: "    FALSE",          B23: "#N/A",    C23: "#N/A",    D23: "#N/A",
        A24: "        Won",        B24: "#N/A",    C24: "#N/A",    D24: "#N/A",
        A25: "March",              B25: "",        C25: "",        D25: "",
        A26: "    FALSE",          B26: "85800",   C26: "42000",   D26: "127800",
        A27: "        New",        B27: "105600",  C27: "4000",    D27: "109600",
        A28: "        Won",        B28: "-19800",  C28: "38000",   D28: "18200",
        A29: "    TRUE",           B29: "",        C29: "",        D29: "",
        A30: "        New",        B30: "",        C30: "",        D30: "",
        A31: "        Won",        B31: "",        C31: "",        D31: "",
        A32: "April",              B32: "",        C32: "",        D32: "",
        A33: "    FALSE",          B33: "47700",   C33: "-26000",  D33: "21700",
        A34: "        New",        B34: "31000",   C34: "-24000",  D34: "7000",
        A35: "        Won",        B35: "16700",   C35: "-2000",   D35: "14700",
        A36: "    TRUE",           B36: "",        C36: "",        D36: "",
        A37: "        New",        B37: "",        C37: "",        D37: "",
        A38: "        Won",        B38: "",        C38: "",        D38: "",
        A39: "Total",              B39: "",        C39: "",        D39: "",
      });
    });

    test("difference_from (previous) with multi level grouping", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "difference_from",
        fieldNameWithGranularity: "Active",
        value: PREVIOUS_VALUE,
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",    C20: "Bob",     D20: "Total",
        A22: "February",           B22: "",         C22: "",        D22: "",
        A23: "    FALSE",          B23: "",         C23: "",        D23: "",
        A24: "        Won",        B24: "",         C24: "",        D24: "",
        A25: "March",              B25: "",         C25: "",        D25: "",
        A26: "    FALSE",          B26: "",         C26: "",        D26: "",
        A27: "        New",        B27: "",         C27: "",        D27: "",
        A28: "        Won",        B28: "",         C28: "",        D28: "",
        A29: "    TRUE",           B29: "-85800",   C29: "-42000",  D29: "-127800",
        A30: "        New",        B30: "-105600",  C30: "-4000",   D30: "-109600",
        A31: "        Won",        B31: "19800",    C31: "-38000",  D31: "-18200",
        A32: "April",              B32: "",         C32: "",        D32: "",
        A33: "    FALSE",          B33: "",         C33: "",        D33: "",
        A34: "        New",        B34: "",         C34: "",        D34: "",
        A35: "        Won",        B35: "",         C35: "",        D35: "",
        A36: "    TRUE",           B36: "-47700",   C36: "26000",   D36: "-21700",
        A37: "        New",        B37: "-31000",   C37: "24000",   D37: "-7000",
        A38: "        Won",        B38: "-16700",   C38: "2000",    D38: "-14700",
        A39: "Total",              B39: "",         C39: "",        D39: "",
      });
    });
  });

  describe("%_difference_from", () => {
    test("Can display measure as %_difference_from given row field value", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_difference_from",
        fieldNameWithGranularity: "Created on:month_number",
        value: 2,
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",    C20: "Bob",  D20: "Total",
        A22: "February",   B22: "",         C22: "",     D22: "",
        A23: "March",      B23: "457.33%",  C23: "",     D23: "741.78%",
        A24: "April",      B24: "265.78%",  C24: "",     D24: "381.33%",
        A25: "Total",      B25: "",         C25: "",     D25: "",
      });
    });

    test("Can display measure as %_difference_from given col field value", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_difference_from",
        fieldNameWithGranularity: "Salesperson",
        value: "Alice",
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",      D20: "Total",
        A22: "February",   B22: "",       C22: "#NULL!",   D22: "",
        A23: "March",      B23: "",       C23: "-48.96%",  D23: "",
        A24: "April",      B24: "",       C24: "-68.41%",  D24: "",
        A25: "Total",      B25: "",       C25: "-60.90%",  D25: "",
      });
    });

    test("%_difference_from with multi level grouping", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_difference_from",
        fieldNameWithGranularity: "Active",
        value: true,
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",           B22: "",         C22: "",         D22: "",
        A23: "    FALSE",          B23: "#N/A",     C23: "#N/A",     D23: "#N/A",
        A24: "        Won",        B24: "#N/A",     C24: "#N/A",     D24: "#N/A",
        A25: "March",              B25: "",         C25: "",         D25: "",
        A26: "    FALSE",          B26: "433.33%",  C26: "381.82%",  D26: "414.94%",
        A27: "        New",        B27: "",         C27: "36.36%",   D27: "996.36%",
        A28: "        Won",        B28: "#NULL!",    C28: "",        D28: "91.92%",
        A29: "    TRUE",           B29: "",         C29: "",         D29: "",
        A30: "        New",        B30: "",         C30: "",         D30: "",
        A31: "        Won",        B31: "",         C31: "",         D31: "",
        A32: "April",              B32: "",         C32: "",         D32: "",
        A33: "    FALSE",          B33: "275.72%",  C33: "#NULL!",   D33: "50.12%",
        A34: "        New",        B34: "344.44%",  C34: "#NULL!",   D34: "21.21%",
        A35: "        Won",        B35: "201.20%",  C35: "#NULL!",   D35: "142.72%",
        A36: "    TRUE",           B36: "",         C36: "",         D36: "",
        A37: "        New",        B37: "",         C37: "",         D37: "",
        A38: "        Won",        B38: "",         C38: "",         D38: "",
        A39: "Total",              B39: "",         C39: "",         D39: "",
      });
    });

    test("%_difference_from (previous) with multi level grouping", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_difference_from",
        fieldNameWithGranularity: "Active",
        value: PREVIOUS_VALUE,
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",           B22: "",         C22: "",         D22: "",
        A23: "    FALSE",          B23: "",         C23: "",         D23: "",
        A24: "        Won",        B24: "",         C24: "",         D24: "",
        A25: "March",              B25: "",         C25: "",         D25: "",
        A26: "    FALSE",          B26: "",         C26: "",         D26: "",
        A27: "        New",        B27: "",         C27: "",         D27: "",
        A28: "        Won",        B28: "",         C28: "",         D28: "",
        A29: "    TRUE",           B29: "-81.25%",  C29: "-79.25%",  D29: "-80.58%",
        A30: "        New",        B30: "#NULL!",   C30: "-26.67%",  D30: "-90.88%",
        A31: "        Won",        B31: "",         C31: "#NULL!",   D31: "-47.89%",
        A32: "April",              B32: "",         C32: "",         D32: "",
        A33: "    FALSE",          B33: "",         C33: "",         D33: "",
        A34: "        New",        B34: "",         C34: "",         D34: "",
        A35: "        Won",        B35: "",         C35: "",         D35: "",
        A36: "    TRUE",           B36: "-73.38%",  C36: "",         D36: "-33.38%",
        A37: "        New",        B37: "-77.50%",  C37: "",         D37: "-17.50%",
        A38: "        Won",        B38: "-66.80%",  C38: "",         D38: "-58.80%",
        A39: "Total",              B39: "",         C39: "",         D39: "",
      });
    });

    test("%_difference_from make the difference between value 0 and empty value", () => {
      const measureDisplay: PivotMeasureDisplay = {
        type: "%_difference_from",
        fieldNameWithGranularity: "Salesperson",
        value: "Bob",
      };
      const model = createModelWithTestPivotDataset({
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: measureDisplay,
          },
        ],
      });

      // No value for Bob in February, so the percentage from Bob for Alice is empty
      expect(getEvaluatedCell(model, "B22").value).toEqual("");
      expect(getEvaluatedCell(model, "C22").value).toEqual("");

      setCellContent(model, "A2", "02/02/2024");
      setCellContent(model, "C2", ""); // Empty Expected Revenue for Bob in February
      expect(getEvaluatedCell(model, "B22").value).toEqual("");
      expect(getEvaluatedCell(model, "C22").value).toEqual("");

      setCellContent(model, "C2", "0"); // 0 Expected Revenue for Bob in February
      expect(getEvaluatedCell(model, "B22").value).toEqual(CellErrorType.DivisionByZero);
      expect(getEvaluatedCell(model, "C22").value).toEqual("");
    });
  });

  describe("index", () => {
    test("Can display measure as index with simple grouping", () => {
      const model = createModelWithTestPivotDataset();
      updatePivotMeasureDisplay(model, pivotId, measureId, { type: "index" });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",        C20: "Bob",          D20: "Total",
        A22: "February",   B22: "1.390964379",  C22: "0",            D22: "1",
        A23: "March",      B23: "0.920944737",  C23: "1.202205796",  D23: "1",
        A24: "April",      B24: "1.057030179",  C24: "0.854129476",  D24: "1",
        A25: "Total",      B25: "1",            C25: "1",            D25: "1",
      });
    });

    test("Can display measure as index with multi-level grouping", () => {
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [
          {
            fieldName: "Expected Revenue",
            aggregator: "sum",
            id: measureId,
            display: { type: "index" },
          },
        ],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",        C20: "Bob",          D20: "Total",
        A22: "February",           B22: "1.390964379",  C22: "0",            D22: "1",
        A23: "    FALSE",          B23: "1.390964379",  C23: "0",            D23: "1",
        A24: "        Won",        B24: "1.390964379",  C24: "0",            D24: "1",
        A25: "March",              B25: "0.920944737",  C25: "1.202205796",  D25: "1",
        A26: "    FALSE",          B26: "0.926140217",  C26: "1.188916912",  D26: "1",
        A27: "        New",        B27: "1.217958859",  C27: "0.442509674",  D27: "1",
        A28: "        Won",        B28: "0",            C28: "3.557777778",  D28: "1",
        A29: "    TRUE",           B29: "0.894191386",  C29: "1.270634921",  D29: "1",
        A30: "        New",        B30: "0",            C30: "3.557777778",  D30: "1",
        A31: "        Won",        B31: "1.390964379",  C31: "0",            D31: "1",
        A32: "April",              B32: "1.057030179",  C32: "0.854129476",  D32: "1",
        A33: "    FALSE",          B33: "1.390964379",  C33: "0",            D33: "1",
        A34: "        New",        B34: "1.390964379",  C34: "0",            D34: "1",
        A35: "        Won",        B35: "1.390964379",  C35: "0",            D35: "1",
        A36: "    TRUE",           B36: "0.555743274",  C36: "2.136309982",  D36: "1",
        A37: "        New",        B37: "0.379353921",  C37: "2.587474747",  D37: "1",
        A38: "        Won",        B38: "1.120874208",  C38: "0.690830636",  D38: "1",
        A39: "Total",              B39: "1",            C39: "1",            D39: "1",
      });
    });
  });

  describe("rank_asc", () => {
    test("Can display measure as ascending ranking on a row field", () => {
      const model = createModelWithTestPivotDataset();
      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "rank_asc",
        fieldNameWithGranularity: "Created on:month_number",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",   B22: "1",      C22: "",     D22: "1",
        A23: "March",      B23: "3",      C23: "2",    D23: "3",
        A24: "April",      B24: "2",      C24: "1",    D24: "2",
        A25: "Total",      B25: "",       C25: "",     D25: "",
      });
    });

    test("Can display measure as ascending ranking on multi-level row fields", () => {
      let display: PivotMeasureDisplay = {
        type: "rank_asc",
        fieldNameWithGranularity: "Created on:month_number",
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: measureId, display }],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",           B22: "1",      C22: "",     D22: "1",
        A23: "    FALSE",          B23: "1",      C23: "",     D23: "1",
        A24: "        Won",        B24: "3",      C24: "",     D24: "3",
        A25: "March",              B25: "3",      C25: "2",    D25: "3",
        A26: "    FALSE",          B26: "3",      C26: "1",    D26: "3",
        A27: "        New",        B27: "3",      C27: "2",    D27: "4",
        A28: "        Won",        B28: "",       C28: "2",    D28: "5",
        A29: "    TRUE",           B29: "2",      C29: "1",    D29: "1",
        A30: "        New",        B30: "",       C30: "1",    D30: "1",
        A31: "        Won",        B31: "2",      C31: "",     D31: "2",
        A32: "April",              B32: "2",      C32: "1",    D32: "2",
        A33: "    FALSE",          B33: "2",      C33: "",     D33: "2",
        A34: "        New",        B34: "2",      C34: "",     D34: "3",
        A35: "        Won",        B35: "4",      C35: "",     D35: "4",
        A36: "    TRUE",           B36: "1",      C36: "2",    D36: "2",
        A37: "        New",        B37: "1",      C37: "3",    D37: "2",
        A38: "        Won",        B38: "1",      C38: "1",    D38: "1",
        A39: "Total",              B39: "",       C39: "",     D39: "",
      });

      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "rank_asc",
        fieldNameWithGranularity: "Active",
      });
      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",           B22: "",       C22: "",     D22: "",
        A23: "    FALSE",          B23: "1",      C23: "",     D23: "1",
        A24: "        Won",        B24: "1",      C24: "",     D24: "1",
        A25: "March",              B25: "",       C25: "",     D25: "",
        A26: "    FALSE",          B26: "2",      C26: "2",    D26: "2",
        A27: "        New",        B27: "1",      C27: "2",    D27: "2",
        A28: "        Won",        B28: "",       C28: "1",    D28: "2",
        A29: "    TRUE",           B29: "1",      C29: "1",    D29: "1",
        A30: "        New",        B30: "",       C30: "1",    D30: "1",
        A31: "        Won",        B31: "1",      C31: "",     D31: "1",
        A32: "April",              B32: "",       C32: "",     D32: "",
        A33: "    FALSE",          B33: "2",      C33: "",     D33: "2",
        A34: "        New",        B34: "2",      C34: "",     D34: "2",
        A35: "        Won",        B35: "2",      C35: "",     D35: "2",
        A36: "    TRUE",           B36: "1",      C36: "1",    D36: "1",
        A37: "        New",        B37: "1",      C37: "1",    D37: "1",
        A38: "        Won",        B38: "1",      C38: "1",    D38: "1",
        A39: "Total",              B39: "",       C39: "",     D39: "",
      });

      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "rank_asc",
        fieldNameWithGranularity: "Stage",
      });
      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",           B22: "",       C22: "",     D22: "",
        A23: "    FALSE",          B23: "",       C23: "",     D23: "",
        A24: "        Won",        B24: "1",      C24: "",     D24: "1",
        A25: "March",              B25: "",       C25: "",     D25: "",
        A26: "    FALSE",          B26: "",       C26: "",     D26: "",
        A27: "        New",        B27: "1",      C27: "1",    D27: "2",
        A28: "        Won",        B28: "",       C28: "2",    D28: "1",
        A29: "    TRUE",           B29: "",       C29: "",     D29: "",
        A30: "        New",        B30: "",       C30: "1",    D30: "1",
        A31: "        Won",        B31: "1",      C31: "",     D31: "2",
        A32: "April",              B32: "",       C32: "",     D32: "",
        A33: "    FALSE",          B33: "",       C33: "",     D33: "",
        A34: "        New",        B34: "2",      C34: "",     D34: "2",
        A35: "        Won",        B35: "1",      C35: "",     D35: "1",
        A36: "    TRUE",           B36: "",       C36: "",     D36: "",
        A37: "        New",        B37: "2",      C37: "2",    D37: "2",
        A38: "        Won",        B38: "1",      C38: "1",    D38: "1",
        A39: "Total",              B39: "",       C39: "",     D39: "",
      });
    });

    test("Can display measure as ascending ranking on a column field", () => {
      const model = createModelWithTestPivotDataset();
      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "rank_asc",
        fieldNameWithGranularity: "Salesperson",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",   B22: "1",      C22: "",     D22: "",
        A23: "March",      B23: "2",      C23: "1",    D23: "",
        A24: "April",      B24: "2",      C24: "1",    D24: "",
        A25: "Total",      B25: "2",      C25: "1",    D25: "",
      });
    });
  });

  describe("rank_desc", () => {
    test("Can display measure as descending ranking on a row field", () => {
      const model = createModelWithTestPivotDataset();
      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "rank_desc",
        fieldNameWithGranularity: "Created on:month_number",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",   B22: "3",      C22: "",     D22: "3",
        A23: "March",      B23: "1",      C23: "1",    D23: "1",
        A24: "April",      B24: "2",      C24: "2",    D24: "2",
        A25: "Total",      B25: "",       C25: "",     D25: "",
      });
    });

    test("Can display measure as descending ranking on multi-level row fields", () => {
      let display: PivotMeasureDisplay = {
        type: "rank_desc",
        fieldNameWithGranularity: "Active",
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: measureId, display }],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",           B22: "",       C22: "",     D22: "",
        A23: "    FALSE",          B23: "1",      C23: "",     D23: "1",
        A24: "        Won",        B24: "1",      C24: "",     D24: "1",
        A25: "March",              B25: "",       C25: "",     D25: "",
        A26: "    FALSE",          B26: "1",      C26: "1",    D26: "1",
        A27: "        New",        B27: "1",      C27: "1",    D27: "1",
        A28: "        Won",        B28: "",       C28: "1",    D28: "1",
        A29: "    TRUE",           B29: "2",      C29: "2",    D29: "2",
        A30: "        New",        B30: "",       C30: "2",    D30: "2",
        A31: "        Won",        B31: "1",      C31: "",     D31: "2",
        A32: "April",              B32: "",       C32: "",     D32: "",
        A33: "    FALSE",          B33: "1",      C33: "",     D33: "1",
        A34: "        New",        B34: "1",      C34: "",     D34: "1",
        A35: "        Won",        B35: "1",      C35: "",     D35: "1",
        A36: "    TRUE",           B36: "2",      C36: "1",    D36: "2",
        A37: "        New",        B37: "2",      C37: "1",    D37: "2",
        A38: "        Won",        B38: "2",      C38: "1",    D38: "2",
        A39: "Total",              B39: "",       C39: "",     D39: "",
      });
    });

    test("Can display measure as descending ranking on a column field", () => {
      const model = createModelWithTestPivotDataset();
      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "rank_desc",
        fieldNameWithGranularity: "Salesperson",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",  C20: "Bob",  D20: "Total",
        A22: "February",   B22: "1",      C22: "",     D22: "",
        A23: "March",      B23: "1",      C23: "2",    D23: "",
        A24: "April",      B24: "1",      C24: "2",    D24: "",
        A25: "Total",      B25: "1",      C25: "2",    D25: "",
      });
    });
  });

  describe("running_total", () => {
    test("Can display measure as running total of a row field", () => {
      const model = createModelWithTestPivotDataset();
      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "running_total",
        fieldNameWithGranularity: "Created on:month_number",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",   C20: "Bob",    D20: "Total",
        A22: "February",   B22: "22500",   C22: "0",      D22: "22500",
        A23: "March",      B23: "147900",  C23: "64000",  D23: "211900",
        A24: "April",      B24: "230200",  C24: "90000",  D24: "320200",
        A25: "Total",      B25: "",        C25: "",       D25: "",
      });
    });

    test("Can display measure as running total of multi-level row fields", () => {
      let display: PivotMeasureDisplay = {
        type: "running_total",
        fieldNameWithGranularity: "Created on:month_number",
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: measureId, display }],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",   C20: "Bob",    D20: "Total",
        A22: "February",           B22: "22500",   C22: "0",      D22: "22500",
        A23: "    FALSE",          B23: "22500",   C23: "0",      D23: "22500",
        A24: "        Won",        B24: "22500",   C24: "0",      D24: "22500",
        A25: "March",              B25: "147900",  C25: "64000",  D25: "211900",
        A26: "    FALSE",          B26: "128100",  C26: "53000",  D26: "181100",
        A27: "        New",        B27: "105600",  C27: "15000",  D27: "120600",
        A28: "        Won",        B28: "22500",   C28: "38000",  D28: "60500",
        A29: "    TRUE",           B29: "19800",   C29: "11000",  D29: "30800",
        A30: "        New",        B30: "0",       C30: "11000",  D30: "11000",
        A31: "        Won",        B31: "19800",   C31: "0",      D31: "19800",
        A32: "April",              B32: "230200",  C32: "90000",  D32: "320200",
        A33: "    FALSE",          B33: "193100",  C33: "53000",  D33: "246100",
        A34: "        New",        B34: "145600",  C34: "15000",  D34: "160600",
        A35: "        Won",        B35: "47500",   C35: "38000",  D35: "85500",
        A36: "    TRUE",           B36: "37100",   C36: "37000",  D36: "74100",
        A37: "        New",        B37: "9000",    C37: "35000",  D37: "44000",
        A38: "        Won",        B38: "28100",   C38: "2000",   D38: "30100",
        A39: "Total",              B39: "",        C39: "",       D39: "",
      });

      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "running_total",
        fieldNameWithGranularity: "Active",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",   C20: "Bob",    D20: "Total",
        A22: "February",           B22: "",        C22: "",       D22: "",
        A23: "    FALSE",          B23: "22500",   C23: "0",      D23: "22500",
        A24: "        Won",        B24: "22500",   C24: "0",      D24: "22500",
        A25: "March",              B25: "",        C25: "",       D25: "",
        A26: "    FALSE",          B26: "105600",  C26: "53000",  D26: "158600",
        A27: "        New",        B27: "105600",  C27: "15000",  D27: "120600",
        A28: "        Won",        B28: "0",       C28: "38000",  D28: "38000",
        A29: "    TRUE",           B29: "125400",  C29: "64000",  D29: "189400",
        A30: "        New",        B30: "105600",  C30: "26000",  D30: "131600",
        A31: "        Won",        B31: "19800",   C31: "38000",  D31: "57800",
        A32: "April",              B32: "",        C32: "",       D32: "",
        A33: "    FALSE",          B33: "65000",   C33: "0",      D33: "65000",
        A34: "        New",        B34: "40000",   C34: "0",      D34: "40000",
        A35: "        Won",        B35: "25000",   C35: "0",      D35: "25000",
        A36: "    TRUE",           B36: "82300",   C36: "26000",  D36: "108300",
        A37: "        New",        B37: "49000",   C37: "24000",  D37: "73000",
        A38: "        Won",        B38: "33300",   C38: "2000",   D38: "35300",
        A39: "Total",              B39: "",        C39: "",       D39: "",
      });

      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "running_total",
        fieldNameWithGranularity: "Stage",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",   C20: "Bob",    D20: "Total",
        A22: "February",           B22: "",        C22: "",       D22: "",
        A23: "    FALSE",          B23: "",        C23: "",       D23: "",
        A24: "        Won",        B24: "22500",   C24: "0",      D24: "22500",
        A25: "March",              B25: "",        C25: "",       D25: "",
        A26: "    FALSE",          B26: "",        C26: "",       D26: "",
        A27: "        New",        B27: "105600",  C27: "15000",  D27: "120600",
        A28: "        Won",        B28: "105600",  C28: "53000",  D28: "158600",
        A29: "    TRUE",           B29: "",        C29: "",       D29: "",
        A30: "        New",        B30: "0",       C30: "11000",  D30: "11000",
        A31: "        Won",        B31: "19800",   C31: "11000",  D31: "30800",
        A32: "April",              B32: "",        C32: "",       D32: "",
        A33: "    FALSE",          B33: "",        C33: "",       D33: "",
        A34: "        New",        B34: "40000",   C34: "0",      D34: "40000",
        A35: "        Won",        B35: "65000",   C35: "0",      D35: "65000",
        A36: "    TRUE",           B36: "",        C36: "",       D36: "",
        A37: "        New",        B37: "9000",    C37: "24000",  D37: "33000",
        A38: "        Won",        B38: "17300",   C38: "26000",  D38: "43300",
        A39: "Total",              B39: "",        C39: "",       D39: "",
      });
    });

    test("Can display measure as running_total of a column field", () => {
      const model = createModelWithTestPivotDataset();
      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "running_total",
        fieldNameWithGranularity: "Salesperson",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",   C20: "Bob",     D20: "Total",
        A22: "February",   B22: "22500",   C22: "22500",   D22: "",
        A23: "March",      B23: "125400",  C23: "189400",  D23: "",
        A24: "April",      B24: "82300",   C24: "108300",  D24: "",
        A25: "Total",      B25: "230200",  C25: "320200",  D25: "",
      });
    });

    test("Running total with row sorted in descending order", () => {
      let display: PivotMeasureDisplay = {
        type: "running_total",
        fieldNameWithGranularity: "Created on:month_number",
      };
      const model = createModelWithTestPivotDataset({
        rows: [{ fieldName: "Created on", granularity: "month_number", order: "desc" }],
        measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: measureId, display }],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",   C20: "Bob",    D20: "Total",
        A22: "April",      B22: "82300",   C22: "26000",  D22: "108300",
        A23: "March",      B23: "207700",  C23: "90000",  D23: "297700",
        A24: "February",   B24: "230200",  C24: "90000",  D24: "320200",
        A25: "Total",      B25: "",        C25: "",       D25: "",
      });
    });
  });

  describe("%_running_total", () => {
    test("Can display measure as percentage of running total of a row field", () => {
      const model = createModelWithTestPivotDataset();
      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "%_running_total",
        fieldNameWithGranularity: "Created on:month_number",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",   B22: "9.77%",    C22: "0.00%",    D22: "7.03%",
        A23: "March",      B23: "64.25%",   C23: "71.11%",   D23: "66.18%",
        A24: "April",      B24: "100.00%",  C24: "100.00%",  D24: "100.00%",
        A25: "Total",      B25: "",         C25: "",         D25: "",
      });
    });

    test("Can display measure as percentage of running total of multi-level row fields", () => {
      let display: PivotMeasureDisplay = {
        type: "%_running_total",
        fieldNameWithGranularity: "Created on:month_number",
      };
      const model = createModelWithTestPivotDataset({
        rows: [
          { fieldName: "Created on", granularity: "month_number", order: "asc" },
          { fieldName: "Active", order: "asc" },
          { fieldName: "Stage", order: "asc" },
        ],
        measures: [{ fieldName: "Expected Revenue", aggregator: "sum", id: measureId, display }],
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",           B22: "9.77%",    C22: "0.00%",    D22: "7.03%",
        A23: "    FALSE",          B23: "11.65%",   C23: "0.00%",    D23: "9.14%",
        A24: "        Won",        B24: "47.37%",   C24: "0.00%",    D24: "26.32%",
        A25: "March",              B25: "64.25%",   C25: "71.11%",   D25: "66.18%",
        A26: "    FALSE",          B26: "66.34%",   C26: "100.00%",  D26: "73.59%",
        A27: "        New",        B27: "72.53%",   C27: "100.00%",  D27: "75.09%",
        A28: "        Won",        B28: "47.37%",   C28: "100.00%",  D28: "70.76%",
        A29: "    TRUE",           B29: "53.37%",   C29: "29.73%",   D29: "41.57%",
        A30: "        New",        B30: "0.00%",    C30: "31.43%",   D30: "25.00%",
        A31: "        Won",        B31: "70.46%",   C31: "0.00%",    D31: "65.78%",
        A32: "April",              B32: "100.00%",  C32: "100.00%",  D32: "100.00%",
        A33: "    FALSE",          B33: "100.00%",  C33: "100.00%",  D33: "100.00%",
        A34: "        New",        B34: "100.00%",  C34: "100.00%",  D34: "100.00%",
        A35: "        Won",        B35: "100.00%",  C35: "100.00%",  D35: "100.00%",
        A36: "    TRUE",           B36: "100.00%",  C36: "100.00%",  D36: "100.00%",
        A37: "        New",        B37: "100.00%",  C37: "100.00%",  D37: "100.00%",
        A38: "        Won",        B38: "100.00%",  C38: "100.00%",  D38: "100.00%",
        A39: "Total",              B39: "",         C39: "",         D39: "",
      });

      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "%_running_total",
        fieldNameWithGranularity: "Active",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",           B22: "",         C22: "",         D22: "",
        A23: "    FALSE",          B23: "100.00%",  C23: "",         D23: "100.00%",
        A24: "        Won",        B24: "100.00%",  C24: "",         D24: "100.00%",
        A25: "March",              B25: "",         C25: "",         D25: "",
        A26: "    FALSE",          B26: "84.21%",   C26: "82.81%",   D26: "83.74%",
        A27: "        New",        B27: "100.00%",  C27: "57.69%",   D27: "91.64%",
        A28: "        Won",        B28: "0.00%",    C28: "100.00%",  D28: "65.74%",
        A29: "    TRUE",           B29: "100.00%",  C29: "100.00%",  D29: "100.00%",
        A30: "        New",        B30: "100.00%",  C30: "100.00%",  D30: "100.00%",
        A31: "        Won",        B31: "100.00%",  C31: "100.00%",  D31: "100.00%",
        A32: "April",              B32: "",         C32: "",         D32: "",
        A33: "    FALSE",          B33: "78.98%",   C33: "0.00%",    D33: "60.02%",
        A34: "        New",        B34: "81.63%",   C34: "0.00%",    D34: "54.79%",
        A35: "        Won",        B35: "75.08%",   C35: "0.00%",    D35: "70.82%",
        A36: "    TRUE",           B36: "100.00%",  C36: "100.00%",  D36: "100.00%",
        A37: "        New",        B37: "100.00%",  C37: "100.00%",  D37: "100.00%",
        A38: "        Won",        B38: "100.00%",  C38: "100.00%",  D38: "100.00%",
        A39: "Total",              B39: "",         C39: "",         D39: "",
      });

      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "%_running_total",
        fieldNameWithGranularity: "Stage",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",          B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",           B22: "",         C22: "",         D22: "",
        A23: "    FALSE",          B23: "",         C23: "",         D23: "",
        A24: "        Won",        B24: "100.00%",  C24: "",         D24: "100.00%",
        A25: "March",              B25: "",         C25: "",         D25: "",
        A26: "    FALSE",      B26: "",         C26: "",         D26: "",
        A27: "        New",            B27: "100.00%",  C27: "28.30%",   D27: "76.04%",
        A28: "        Won",        B28: "100.00%",  C28: "100.00%",  D28: "100.00%",
        A29: "    TRUE",           B29: "",         C29: "",         D29: "",
        A30: "        New",        B30: "0.00%",    C30: "100.00%",  D30: "35.71%",
        A31: "        Won",        B31: "100.00%",  C31: "100.00%",  D31: "100.00%",
        A32: "April",              B32: "",         C32: "",         D32: "",
        A33: "    FALSE",          B33: "",         C33: "",         D33: "",
        A34: "        New",        B34: "61.54%",   C34: "",         D34: "61.54%",
        A35: "        Won",        B35: "100.00%",  C35: "",         D35: "100.00%",
        A36: "    TRUE",           B36: "",         C36: "",         D36: "",
        A37: "        New",        B37: "52.02%",   C37: "92.31%",   D37: "76.21%",
        A38: "        Won",        B38: "100.00%",  C38: "100.00%",  D38: "100.00%",
        A39: "Total",              B39: "",         C39: "",         D39: "",
      });
    });

    test("Can display measure as percentage of running total of a column field", () => {
      const model = createModelWithTestPivotDataset();
      updatePivotMeasureDisplay(model, pivotId, measureId, {
        type: "%_running_total",
        fieldNameWithGranularity: "Salesperson",
      });

      // prettier-ignore
      expect(getFormattedGrid(model)).toMatchObject({
        A20:"(#1) Pivot",  B20: "Alice",    C20: "Bob",      D20: "Total",
        A22: "February",   B22: "100.00%",  C22: "100.00%",  D22: "",
        A23: "March",      B23: "66.21%",   C23: "100.00%",  D23: "",
        A24: "April",      B24: "75.99%",   C24: "100.00%",  D24: "",
        A25: "Total",      B25: "71.89%",   C25: "100.00%",  D25: "",
      });
    });
  });

  test("Display measure as works with PIVOT.VALUE formulas", () => {
    const measureDisplay: PivotMeasureDisplay = {
      type: "%_of",
      fieldNameWithGranularity: "Created on:month_number",
      value: 2,
    };
    const model = createModelWithTestPivotDataset({
      measures: [
        {
          fieldName: "Expected Revenue",
          aggregator: "sum",
          id: measureId,
          display: measureDisplay,
        },
      ],
    });
    const pivot = model.getters.getPivot(pivotId);
    model.dispatch("INSERT_PIVOT", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 19,
      pivotId,
      table: pivot.getTableStructure().export(),
    });

    expect(getCell(model, "B22")?.content).toContain("PIVOT.VALUE");

    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
                         B20: "Alice",    C20: "Bob",  D20: "Total",
      A22: "February",   B22: "100.00%",  C22: "",     D22: "100.00%",
      A23: "March",      B23: "557.33%",  C23: "",     D23: "841.78%",
      A24: "April",      B24: "365.78%",  C24: "",     D24: "481.33%",
      A25: "Total",      B25: "",         C25: "",     D25: "",
    });
  });

  test("Can change measure display with calculated measure", () => {
    const measureDisplay: PivotMeasureDisplay = {
      type: "%_of_grand_total",
      fieldNameWithGranularity: "Created on:month_number",
      value: 2,
    };
    const model = createModelWithTestPivotDataset();
    const sheetId = model.getters.getActiveSheetId();
    updatePivot(model, pivotId, {
      measures: [
        {
          fieldName: "Expected Revenue",
          userDefinedName: "m1",
          aggregator: "sum",
          id: "m1",
          display: measureDisplay,
        },
        {
          fieldName: "Expected Revenue + 1000",
          userDefinedName: "m2",
          aggregator: "sum",
          id: "calculated",
          computedBy: { formula: "='m1' + 1000", sheetId },
          display: measureDisplay,
        },
      ],
    });
    // prettier-ignore
    expect(getFormattedGrid(model)).toMatchObject({
      A20:"(#1) Pivot",  B20: "Alice",   C20: "",        D20: "Bob",     E20: "",        F20: "Total",    G20: "",
      A21: "",           B21: "m1",      C21: "m2",      D21: "m1",      E21: "m2",      F21: "m1",       G21: "m2",
      A22: "February",   B22: "7.03%",   C22: "7.20%",   D22: "0.00%",   E22: "0.31%",   F22: "7.03%",    G22: "7.51%",
      A23: "March",      B23: "39.16%",  C23: "38.75%",  D23: "19.99%",  E23: "19.93%",  F23: "59.15%",   G23: "58.68%",
      A24: "April",      B24: "25.70%",  C24: "25.54%",  D24: "8.12%",   E24: "8.28%",   F24: "33.82%",   G24: "33.81%",
      A25: "Total",      B25: "71.89%",  C25: "71.49%",  D25: "28.11%",  E25: "28.51%",  F25: "100.00%",  G25: "100.00%",
    });
  });
});
