import { transform } from "../../../src/collaborative/ot/ot";
import {
  AddColumnsRowsCommand,
  DeleteFigureCommand,
  UpdateCellCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
} from "../../../src/types";
import { LineChartDefinition } from "../../../src/types/chart/line_chart";

describe("OT with DELETE_FIGURE", () => {
  const deleteFigure: DeleteFigureCommand = {
    type: "DELETE_FIGURE",
    sheetId: "42",
    figureId: "42",
  };
  const updateChart: Omit<UpdateChartCommand, "figureId"> = {
    type: "UPDATE_CHART",
    sheetId: "42",
    chartId: "42",
    definition: {} as LineChartDefinition,
  };
  const updateFigure: Omit<UpdateFigureCommand, "figureId"> = {
    type: "UPDATE_FIGURE",
    sheetId: "42",
    col: 0,
    row: 0,
  };

  describe.each([updateChart, updateFigure])("UPDATE_CHART & UPDATE_FIGURE", (cmd) => {
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
