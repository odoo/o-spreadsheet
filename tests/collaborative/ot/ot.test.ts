import { transform } from "../../../src/collaborative/ot/ot";
import { DeleteFigureCommand, UpdateChartCommand, UpdateFigureCommand } from "../../../src/types";
import { LineChartDefinition } from "../../../src/types/chart/line_chart";

describe("OT with DELETE_FIGURE", () => {
  const deleteFigure: DeleteFigureCommand = {
    type: "DELETE_FIGURE",
    sheetId: "42",
    id: "42",
  };
  const updateChart: Omit<UpdateChartCommand, "id"> = {
    type: "UPDATE_CHART",
    sheetId: "42",
    definition: {} as LineChartDefinition,
  };
  const updateFigure: Omit<UpdateFigureCommand, "id"> = {
    type: "UPDATE_FIGURE",
    sheetId: "42",
  };

  describe.each([updateChart, updateFigure])("UPDATE_CHART & UPDATE_FIGURE", (cmd) => {
    test("Same ID", () => {
      expect(transform({ ...cmd, id: "42" }, deleteFigure)).toBeUndefined();
    });

    test("distinct ID", () => {
      expect(transform({ ...cmd, id: "otherId" }, deleteFigure)).toEqual({ ...cmd, id: "otherId" });
    });
  });
});
