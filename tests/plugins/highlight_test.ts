import { Model } from "../../src";
import "../canvas.mock";
import { HighlightPlugin } from "../../src/plugins/highlight";
import { toZone } from "../../src/helpers";

let model: Model;

function getPendingHighlights(model: Model): string {
  const highligthPlugin = (model as any).handlers.find((h) => h instanceof HighlightPlugin);
  return highligthPlugin.pendingHighlights;
}

function getColor(model: Model): string {
  const highligthPlugin = (model as any).handlers.find((h) => h instanceof HighlightPlugin);
  return highligthPlugin.color;
}

beforeEach(async () => {
  model = new Model();
});

describe("highlight", () => {
  test("add highlight border ", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888" },
      highlightType: "border"
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        type: "border",
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });
  test("add highlight background ", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888" },
      highlightType: "background"
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        type: "background",
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });
  test("add highlight border+background ", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888" },
      highlightType: "all"
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        type: "all",
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });

  test("remove all highlight", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888", B6: "#999" },
      highlightType: "border"
    });
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { C2: "#888", C6: "#999" },
      highlightType: "background"
    });
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { D2: "#888", D6: "#999" },
      highlightType: "all"
    });
    expect(model.getters.getHighlights().length).toBe(6);
    model.dispatch("REMOVE_ALL_HIGHLIGHTS");
    expect(model.getters.getHighlights()).toEqual([]);
  });

  test("remove a single highlight border", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888", B6: "#999" },
      highlightType: "border",
    });
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: { B6: "#999" },
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
        type: "border",
      },
    ]);
  });
  test("remove a single highlight background", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888", B6: "#999" },
      highlightType: "background",
    });
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: { B6: "#999" },
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
        type: "background",
      },
    ]);
  });
  test("remove a single highlight border+background", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888", B6: "#999" },
      highlightType: "all",
    });
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: { B6: "#999" },
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
        type: "all",
      },
    ]);
  });

  test("add no hightlight", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: {},
      highlightType: "border",
    });
    expect(model.getters.getHighlights()).toStrictEqual([]);
  });

  test("remove highlight with another color", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888" },
      highlightType: "border",
    });
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: { B2: "#999" },
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
        type: "border",
      },
    ]);
  });

  test("remove highlight with same range", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888" },
      highlightType: "border",
    });
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#999" },
      highlightType: "border",
    });
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: { B2: "#999" },
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        type: "border",
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });

  test("remove highlight with sheet reference", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888" },
      highlightType: "border"
    });
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: { "Sheet1!B2": "#888" },
    });
    expect(model.getters.getHighlights()).toHaveLength(0);
  });

  test("remove highlight from another sheet", () => {
    const sheet1 = model.getters.getActiveSheetId();
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888" },
      highlightType: "border"
    });
    model.dispatch("CREATE_SHEET", { sheetId: "42", activate: true });
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B2: "#888" },
      highlightType: "border"
    });
    expect(model.getters.getHighlights()).toStrictEqual([{
      color: "#888",
      sheet: sheet1,
      type: "border",
      zone: { bottom: 1, left: 1, right: 1, top: 1 },
    }, {
      color: "#888",
      sheet: "42",
      type: "border",
      zone: { bottom: 1, left: 1, right: 1, top: 1 },
    }]);
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: { B2: "#888" },
    });
    expect(model.getters.getHighlights()).toStrictEqual([{
      color: "#888",
      type: "border",
      sheet: sheet1,
      zone: { bottom: 1, left: 1, right: 1, top: 1 },
    }]);
  });

  test("highlight cell selection", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: getColor(model),
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
        type: "border",
      },
    ]);
  });

  test("highlight selection sequence", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    const zone1 = { bottom: 5, left: 1, right: 5, top: 1 };
    const zone2 = { bottom: 10, left: 6, right: 10, top: 6 };
    model.dispatch("SET_SELECTION", {
      anchor: [1, 1],
      zones: [zone1],
    });
    model.dispatch("STOP_SELECTION");
    const firstColor = getColor(model);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: firstColor,
        sheet: model.getters.getActiveSheetId(),
        zone: zone1,
        type: "border",
      },
    ]);
    model.dispatch("START_SELECTION");
    model.dispatch("SET_SELECTION", {
      anchor: [6, 6],
      zones: [zone2],
    });
    model.dispatch("STOP_SELECTION");
    expect(getColor(model)).toBe(firstColor);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: firstColor,
        sheet: model.getters.getActiveSheetId(),
        zone: zone2,
        type: "border",
      },
    ]);
  });

  test("expand selection highlights in a new color", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    const zone1 = { bottom: 5, left: 1, right: 5, top: 1 };
    const zone2 = { bottom: 10, left: 6, right: 10, top: 6 };
    model.dispatch("SET_SELECTION", {
      anchor: [1, 1],
      zones: [zone1],
    });
    model.dispatch("STOP_SELECTION");
    const firstColor = getColor(model);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: firstColor,
        sheet: model.getters.getActiveSheetId(),
        zone: zone1,
        type: "border",
      },
    ]);
    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
    model.dispatch("SET_SELECTION", {
      anchor: [6, 6],
      zones: [zone2],
    });
    model.dispatch("STOP_SELECTION");
    expect(getColor(model)).not.toBe(firstColor);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: getColor(model),
        sheet: model.getters.getActiveSheetId(),
        zone: zone2,
        type: "border",
      },
    ]);
  });

  test("selection highlights with previous selection and expand", () => {
    model.dispatch("START_SELECTION");
    const zone1 = { bottom: 5, left: 1, right: 5, top: 1 };
    model.dispatch("SET_SELECTION", {
      anchor: [1, 1],
      zones: [zone1],
    });
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION_EXPANSION");
    model.dispatch("SELECT_CELL", { col: 10, row: 10 });
    model.dispatch("STOP_SELECTION");
    expect(model.getters.getHighlights().length).toBe(2);
    const [firstColor, secondColor] = model.getters.getHighlights().map((h) => h.color);
    expect(firstColor).not.toBe(secondColor);
  });

  test("set a color", () => {
    model.dispatch("SET_HIGHLIGHT_COLOR", { color: "#999" });
    expect(getColor(model)).toBe("#999");
  });

  test("color changes when manually changed", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    const zone1 = { bottom: 5, left: 1, right: 5, top: 1 };
    const zone2 = { bottom: 10, left: 6, right: 10, top: 6 };
    model.dispatch("SET_SELECTION", {
      anchor: [1, 1],
      zones: [zone1],
    });
    model.dispatch("STOP_SELECTION");
    const firstColor = getColor(model);
    expect(model.getters.getHighlights().map((h) => h.color)).toEqual([firstColor]);
    model.dispatch("SET_HIGHLIGHT_COLOR", { color: "#999" });
    model.dispatch("START_SELECTION");
    model.dispatch("SET_SELECTION", {
      anchor: [6, 6],
      zones: [zone2],
    });
    model.dispatch("STOP_SELECTION");
    expect(getColor(model)).not.toBe(firstColor);
    expect(model.getters.getHighlights().map((h) => h.color)).toEqual(["#999"]);
  });

  test("select same range twice highlights once", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    const anchor: [number, number] = [1, 1];
    const zone = { bottom: 5, left: 1, right: 5, top: 1 };
    const zones = [zone];
    model.dispatch("START_SELECTION");
    const color = getColor(model);
    model.dispatch("SET_SELECTION", { anchor, zones });
    model.dispatch("STOP_SELECTION");
    expect(model.getters.getHighlights()).toStrictEqual([
      { color, zone, sheet: model.getters.getActiveSheetId(), type: "border", },
    ]);
    model.dispatch("START_SELECTION");
    model.dispatch("SET_SELECTION", { anchor, zones });
    expect(model.getters.getHighlights()).toStrictEqual([
      { color, zone, sheet: model.getters.getActiveSheetId(), type: "border", },
    ]);
  });

  test("selection without pending highlight", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    const zone1 = { bottom: 5, left: 1, right: 5, top: 1 };
    const zone2 = { bottom: 10, left: 6, right: 10, top: 6 };
    model.dispatch("SET_SELECTION", {
      anchor: [1, 1],
      zones: [zone1],
    });
    const firstColor = getColor(model);
    model.dispatch("STOP_SELECTION");
    model.dispatch("RESET_PENDING_HIGHLIGHT");
    model.dispatch("START_SELECTION");
    model.dispatch("SET_SELECTION", {
      anchor: [6, 6],
      zones: [zone2],
    });
    model.dispatch("STOP_SELECTION");
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: firstColor,
        sheet: model.getters.getActiveSheetId(),
        zone: zone1,
        type: "border",
      },
      {
        color: getColor(model),
        sheet: model.getters.getActiveSheetId(),
        zone: zone2,
        type: "border",
      },
    ]);
  });

  test("selection with manually set pending highlight", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { B10: "#999" },
      highlightType: "border",
    });
    model.dispatch("ADD_PENDING_HIGHLIGHTS", {
      ranges: { B10: "#999" },
      highlightType: "border",
    });
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    model.dispatch("SELECT_CELL", { col: 1, row: 1 });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: getColor(model),
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
        type: "border",
      },
    ]);
  });

  test("expanding selection does not remove pending highlight from previous zones", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    model.dispatch("SELECT_CELL", { col: 5, row: 5 });
    const firstColor = getColor(model);
    model.dispatch("START_SELECTION_EXPANSION");
    model.dispatch("SELECT_CELL", { col: 7, row: 7 });
    expect(model.getters.getSelectedZones().length).toBe(2);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: firstColor,
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 5, left: 5, right: 5, top: 5 },
        type: "border",
      },
      {
        color: getColor(model),
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 7, left: 7, right: 7, top: 7 },
        type: "border",
      },
    ]);
  });

  test("selecting cells in a merge expands the highlight", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    const sheet = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId: sheet, zone: toZone("A2:A4") });
    model.dispatch("START_SELECTION_EXPANSION");
    model.dispatch("SET_SELECTION", {
      anchor: [0, 4],
      zones: [toZone("A3:A5")],
    });
    const mergeColor = getColor(model);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: mergeColor,
        sheet: model.getters.getActiveSheetId(),
        zone: toZone("A2:A5"),
        type: "border",
      },
    ]);
  });

  test("selecting cell in a merge does not reset pending highlights", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    const sheet = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId: sheet, zone: toZone("A2:A4") });
    model.dispatch("START_SELECTION_EXPANSION");
    model.dispatch("SET_SELECTION", {
      anchor: [0, 4],
      zones: [toZone("A3:A5")],
    });
    const mergeColor = getColor(model);
    model.dispatch("ALTER_SELECTION", { cell: [0, 1] }); // TopLeft
    model.dispatch("ALTER_SELECTION", { cell: [0, 0] }); // above merge
    model.dispatch("STOP_SELECTION");
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: mergeColor,
        sheet: model.getters.getActiveSheetId(),
        zone: toZone("A1:A5"),
        type: "border",
      },
    ]);
  });

  test("disabling selection highlighting resets pending highlights", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("ADD_PENDING_HIGHLIGHTS", {
      ranges: { B10: "#999" },
      highlightType: "border",
    });
    expect(getPendingHighlights(model).length).toBe(1);
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: false });
    expect(getPendingHighlights(model).length).toBe(0);
  });
});
