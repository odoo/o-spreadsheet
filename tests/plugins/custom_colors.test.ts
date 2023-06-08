import { Model } from "../../src";
import { UID } from "../../src/types";
import {
  createChart,
  createScorecardChart,
  redo,
  setStyle,
  undo,
} from "../test_helpers/commands_helpers";
import { createColorScale, createEqualCF, target, toRangesData } from "../test_helpers/helpers";

describe("custom colors are correctly handled when formatting cells", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  test("Adding style to cell add custom colors in the plugin", () => {
    expect(model.getters.getCustomColors()).toEqual([]);
    setStyle(model, "A1", { fillColor: "#505050" });
    expect(model.getters.getCustomColors()).toEqual(["#505050"]);
    setStyle(model, "B1", { textColor: "#101010" });
    expect(model.getters.getCustomColors()).toEqual(["#505050", "#101010"]);
  });

  test("Classical colors are not taken into account by the plugin", () => {
    setStyle(model, "A1", { fillColor: "#FFFFFF", textColor: "#FF0000" });
    expect(model.getters.getCustomColors()).toEqual([]);
  });

  test("Removing style to cell keep custom colors in the plugin", () => {
    setStyle(model, "A1", { fillColor: "#123456", textColor: "#2468BD" });
    expect(model.getters.getCustomColors()).toEqual(["#2468BD", "#123456"]);
    model.dispatch("CLEAR_FORMATTING", {
      sheetId,
      target: target("A1"),
    });
    expect(model.getters.getCustomColors()).toEqual(["#2468BD", "#123456"]);
  });

  test("Adding conditional formatting add custom colors in the plugin", () => {
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createEqualCF("1", { fillColor: "#123456", textColor: "#2468BD" }, "1"),
      sheetId,
      ranges: toRangesData(sheetId, "A1:A3,C1:D3,F1:F3"),
    });
    expect(model.getters.getCustomColors()).toEqual(["#2468BD", "#123456"]);
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: createColorScale(
        "2",
        { type: "value", color: 0xf500ff, value: "" },
        { type: "value", color: 0x123456, value: "" }
      ),
      ranges: toRangesData(sheetId, "B1:B5"),
      sheetId,
    });
    expect(model.getters.getCustomColors()).toEqual(["#2468BD", "#F500FF", "#123456"]);
  });

  test("Non-HEX6 lowercase colors are correctly converted", () => {
    expect(model.getters.getCustomColors()).toEqual([]);
    setStyle(model, "A1", { fillColor: "#123", textColor: "#F0F000" });
    expect(model.getters.getCustomColors()).toEqual(["#F0F000", "#112233"]);
  });

  test("duplicated colors on cells only appears once", () => {
    setStyle(model, "A1", { fillColor: "#123456", textColor: "#123456" });
    expect(model.getters.getCustomColors()).toEqual(["#123456"]);
  });

  test("Custom colors with undo/redo", () => {
    setStyle(model, "A1", { fillColor: "#123456" });
    setStyle(model, "A2", { fillColor: "#FF0058" });
    expect(model.getters.getCustomColors()).toEqual(["#123456", "#FF0058"]);
    undo(model);
    expect(model.getters.getCustomColors()).toEqual(["#123456"]);
    redo(model);
    expect(model.getters.getCustomColors()).toEqual(["#123456", "#FF0058"]);
  });
});

describe("custom colors are correctly handled when editing charts", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });
  test("Chart background colors are taken into account", () => {
    expect(model.getters.getCustomColors()).toEqual([]);
    createChart(
      model,
      {
        dataSets: ["A1:A10"],
        labelRange: "A1",
        background: "#123456",
      },
      "1",
      sheetId
    );
    expect(model.getters.getCustomColors()).toEqual(["#123456"]);
    model.dispatch("UPDATE_CHART", {
      sheetId,
      id: "1",
      definition: {
        title: "a title",
        dataSets: [],
        type: "bar",
        stacked: false,
        dataSetsHaveTitle: false,
        verticalAxisPosition: "left",
        legendPosition: "none",
        background: "#112233",
        aggregated: false,
      },
    });
    expect(model.getters.getCustomColors()).toEqual(["#112233", "#123456"]);
    model.dispatch("DELETE_FIGURE", {
      sheetId,
      id: "1",
    });
    expect(model.getters.getCustomColors()).toEqual(["#112233", "#123456"]);
  });

  test("Gauge colors are taken into account", () => {
    expect(model.getters.getCustomColors()).toEqual([]);
    model.dispatch("CREATE_CHART", {
      sheetId,
      id: "1",
      definition: {
        title: "a title",
        type: "gauge",
        dataRange: "B1:B4",
        sectionRule: {
          rangeMin: "0",
          rangeMax: "100",
          colors: {
            lowerColor: "#112233",
            middleColor: "#123456",
            upperColor: "#2468BD",
          },
          lowerInflectionPoint: {
            type: "number" as const,
            value: "33",
          },
          upperInflectionPoint: {
            type: "number" as const,
            value: "66",
          },
        },
      },
    });
    expect(model.getters.getCustomColors()).toEqual(["#2468BD", "#112233", "#123456"]);
  });

  test("Scorecard colors are taken into account", () => {
    expect(model.getters.getCustomColors()).toEqual([]);
    createScorecardChart(
      model,
      {
        baselineColorDown: "#112233",
        baselineColorUp: "#123456",
      },
      "1"
    );
    expect(model.getters.getCustomColors()).toEqual(["#112233", "#123456"]);
  });

  test("duplicated colors on cell and chart only appears once", () => {
    setStyle(model, "A1", { fillColor: "#123456" });
    createChart(
      model,
      {
        dataSets: ["A1:A10"],
        labelRange: "A1",
        background: "#123456",
      },
      "1",
      sheetId
    );
    expect(model.getters.getCustomColors()).toEqual(["#123456"]);
  });
});
