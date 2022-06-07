import { transform } from "../../../src/collaborative/ot/ot";
import {
  AddMergeCommand,
  CreateFilterTableCommand,
  DeleteFigureCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
} from "../../../src/types";
import { LineChartDefinition } from "../../../src/types/chart/line_chart";
import { target } from "../../test_helpers/helpers";

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

describe("OT with CREATE_FILTER_TABLE", () => {
  const createTable: Omit<CreateFilterTableCommand, "target"> = {
    type: "CREATE_FILTER_TABLE",
    sheetId: "42",
  };
  const addMerge: Omit<AddMergeCommand, "target"> = {
    type: "ADD_MERGE",
    sheetId: "42",
  };

  describe.each([createTable, addMerge])(
    "CREATE_FILTER_TABLE with CREATE_FILTER_TABLE & ADD_MERGE",
    (cmd) => {
      test("Overlapping target", () => {
        const zones = target("A1");
        const createTableCmd = { ...createTable, target: zones };
        const executed = { ...cmd, target: zones };
        expect(transform(createTableCmd, executed)).toBeUndefined();
      });

      test("distinct targets", () => {
        const createTableCommand = { ...createTable, target: target("A1") };
        const executed = { ...cmd, target: target("B2") };
        expect(transform(createTableCommand, executed)).toEqual(createTableCommand);
      });
    }
  );
});
