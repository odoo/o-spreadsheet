import { transform } from "../../../src/collaborative/ot/ot";
import {
  BasicChartUIDefinition,
  DeleteFigureCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
} from "../../../src/types";

describe("OT with DELETE_FIGURE", () => {
  const deleteFigure: DeleteFigureCommand = {
    type: "DELETE_FIGURE",
    sheetId: "42",
    id: "42",
  };
  const updateChart: Omit<UpdateChartCommand, "id"> = {
    type: "UPDATE_CHART",
    sheetId: "42",
    definition: {} as BasicChartUIDefinition,
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
