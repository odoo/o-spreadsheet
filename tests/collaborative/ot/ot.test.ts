import { transform } from "@odoo/o-spreadsheet-engine/collaborative/ot/ot";
import { LineChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/line_chart";
import {
  AddColumnsRowsCommand,
  DeleteChartCommand,
  DeleteFigureCommand,
  DeleteNamedRangeCommand,
  UpdateCarouselCommand,
  UpdateCellCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
  UpdateNamedRangeCommand,
} from "../../../src/types";
import { toRangeData } from "../../test_helpers/helpers";

describe("OT with figures commands", () => {
  const deleteFigure: DeleteFigureCommand = {
    type: "DELETE_FIGURE",
    sheetId: "42",
    figureId: "42",
  };
  const deleteChart: DeleteChartCommand = {
    type: "DELETE_CHART",
    sheetId: "42",
    chartId: "chartId",
  };
  const updateChart: UpdateChartCommand = {
    type: "UPDATE_CHART",
    sheetId: "42",
    chartId: "chartId",
    figureId: "42",
    definition: {} as LineChartDefinition,
  };
  const updateFigure: Omit<UpdateFigureCommand, "figureId"> = {
    type: "UPDATE_FIGURE",
    sheetId: "42",
    col: 0,
    row: 0,
  };
  const updateCarousel: UpdateCarouselCommand = {
    type: "UPDATE_CAROUSEL",
    sheetId: "42",
    figureId: "42",
    definition: { items: [] },
  };

  describe.each([updateChart, updateFigure, updateCarousel])("DELETE_FIGURE command", (cmd) => {
    test("Same ID", () => {
      expect(transform({ ...cmd, figureId: "42" }, deleteFigure)).toBeUndefined();
    });

    test("distinct ID", () => {
      expect(transform({ ...cmd, figureId: "otherId" }, deleteFigure)).toEqual({
        ...cmd,
        figureId: "otherId",
      });
    });
  });

  describe("DELETE_CHART command", () => {
    test("UPDATE_CHART with same ID", () => {
      expect(transform({ ...updateChart, chartId: "chartId" }, deleteChart)).toBeUndefined();
    });

    test("UPDATE_CHART with same IDdistinct ID", () => {
      const toTransform = { ...updateChart, chartId: "otherId" };
      expect(transform(toTransform, deleteChart)).toEqual(toTransform);
    });

    test("UPDATE_CAROUSEL with chart in definition", () => {
      const toTransform: UpdateCarouselCommand = {
        ...updateCarousel,
        definition: {
          items: [
            { type: "chart", chartId: "chartId" },
            { type: "chart", chartId: "otherId" },
          ],
        },
      };
      expect(transform(toTransform, deleteChart)).toEqual({
        ...toTransform,
        definition: {
          items: [{ type: "chart", chartId: "otherId" }],
        },
      });
    });
  });
});

test("OT supports case-insensitive sheetname", () => {
  const UpdateCellCommand: UpdateCellCommand = {
    type: "UPDATE_CELL",
    sheetId: "sh1",
    col: 0,
    row: 0,
    // purposefully using lowercase "sheet1" to test case insensitivity
    content: "=sheet1!C5",
  };
  const AddColumnCommand: AddColumnsRowsCommand = {
    type: "ADD_COLUMNS_ROWS",
    sheetId: "sh1",
    base: 1,
    dimension: "COL",
    quantity: 1,
    position: "after",
    sheetName: "Sheet1",
  };
  expect(transform(UpdateCellCommand, AddColumnCommand)).toEqual({
    ...UpdateCellCommand,
    content: "=Sheet1!D5",
  });
});

test("OT supports named range renaming", () => {
  const UpdateCellCommand: UpdateCellCommand = {
    type: "UPDATE_CELL",
    sheetId: "sh1",
    col: 0,
    row: 0,
    content: "=MyNamedRange + 5",
  };
  const UpdateNamedRange: UpdateNamedRangeCommand = {
    type: "UPDATE_NAMED_RANGE",
    oldRangeName: "MyNamedRange",
    newRangeName: "MyRenamedRange",
    ranges: [toRangeData("sheetId", "A1:B3")],
  };
  expect(transform(UpdateCellCommand, UpdateNamedRange)).toEqual({
    ...UpdateCellCommand,
    content: "=MyRenamedRange + 5",
  });
});

test("Delete/Update named range command are transformed on range renaming", () => {
  const updateNamedRange: UpdateNamedRangeCommand = {
    type: "UPDATE_NAMED_RANGE",
    oldRangeName: "MyNamedRange",
    newRangeName: "MyRenamedRange",
    ranges: [toRangeData("sheetId", "A1:B3")],
  };

  // Delete named range command is transformed
  const deleteNamedRangeCommand: DeleteNamedRangeCommand = {
    type: "DELETE_NAMED_RANGE",
    name: "MyNamedRange",
  };
  expect(transform(deleteNamedRangeCommand, updateNamedRange)).toEqual({
    ...deleteNamedRangeCommand,
    name: "MyRenamedRange",
  });

  // Update named range command is transformed
  const updateNamedRangeToTransform: UpdateNamedRangeCommand = {
    ...updateNamedRange,
    oldRangeName: "MyNamedRange",
    newRangeName: "SomeOtherName",
  };
  expect(transform(updateNamedRangeToTransform, updateNamedRange)).toEqual({
    ...updateNamedRangeToTransform,
    oldRangeName: "MyRenamedRange",
    newRangeName: "SomeOtherName",
  });

  // Unrelated command is not transformed
  const unrelatedDeleteNamedRangeCommand: DeleteNamedRangeCommand = {
    type: "DELETE_NAMED_RANGE",
    name: "SomeUnrelatedName",
  };
  expect(transform(unrelatedDeleteNamedRangeCommand, updateNamedRange)).toEqual(
    unrelatedDeleteNamedRangeCommand
  );
});
