import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { HighlightPlugin } from "../../src/plugins/ui/highlight";
import {
  createSheet,
  createSheetWithName,
  merge,
  selectCell,
  setSelection,
} from "../test_helpers/commands_helpers";

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
  test("add highlight", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [["B2", "#888"]],
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });

  test("remove all highlight", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [
        ["B2", "#888"],
        ["B6", "#999"],
      ],
    });
    expect(model.getters.getHighlights().length).toBe(2);
    model.dispatch("REMOVE_ALL_HIGHLIGHTS");
    expect(model.getters.getHighlights()).toEqual([]);
  });

  test("remove a single highlight", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [
        ["B2", "#888"],
        ["B6", "#999"],
      ],
    });
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: [["B6", "#999"]],
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });

  test("add no highlight", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [],
    });
    expect(model.getters.getHighlights()).toStrictEqual([]);
  });

  test("can add highlight when valid sheet name", () => {
    createSheetWithName(model, { sheetId: "42" }, "kikou");
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [["kikou!B2", "#888"]],
    });
    expect(model.getters.getHighlights()).toHaveLength(1);
  });

  test("can't add highlight with invalid sheet name", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [["kikou!B2", "#888"]],
    });
    expect(model.getters.getHighlights()).toHaveLength(0);
  });

  test("remove highlight with another color", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [["B2", "#888"]],
    });
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: [["B2", "#999"]],
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });

  test("remove highlight with same range", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [["B2", "#888"]],
    });
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [["B2", "#999"]],
    });
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: [["B2", "#999"]],
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });

  test("remove highlight with sheet reference", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [["B2", "#888"]],
    });
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: [["Sheet1!B2", "#888"]],
    });
    expect(model.getters.getHighlights()).toHaveLength(0);
  });

  test("remove highlight from another sheet", () => {
    const sheet1 = model.getters.getActiveSheetId();
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [["B2", "#888"]],
    });
    createSheet(model, { sheetId: "42", activate: true });
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [["B2", "#888"]],
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: sheet1,
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
      {
        color: "#888",
        sheet: "42",
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
    model.dispatch("REMOVE_HIGHLIGHTS", {
      ranges: [["B2", "#888"]],
    });
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: "#888",
        sheet: sheet1,
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });

  test("highlight cell selection", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    selectCell(model, "B2");
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: getColor(model),
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });

  test("highlight selection sequence", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    const zone1XC = "B2:F6";
    const zone2XC = "G7:K11";
    setSelection(model, [zone1XC]);
    model.dispatch("STOP_SELECTION");
    const firstColor = getColor(model);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: firstColor,
        sheet: model.getters.getActiveSheetId(),
        zone: toZone(zone1XC),
      },
    ]);
    model.dispatch("START_SELECTION");
    setSelection(model, [zone2XC]);
    model.dispatch("STOP_SELECTION");
    expect(getColor(model)).toBe(firstColor);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: firstColor,
        sheet: model.getters.getActiveSheetId(),
        zone: toZone(zone2XC),
      },
    ]);
  });

  test("expand selection highlights in a new color", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    const zone1XC = "B2:F6";
    const zone2XC = "G7:K11";
    setSelection(model, [zone1XC]);
    model.dispatch("STOP_SELECTION");
    const firstColor = getColor(model);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: firstColor,
        sheet: model.getters.getActiveSheetId(),
        zone: toZone(zone1XC),
      },
    ]);
    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
    setSelection(model, [zone2XC]);
    model.dispatch("STOP_SELECTION");
    expect(getColor(model)).not.toBe(firstColor);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: getColor(model),
        sheet: model.getters.getActiveSheetId(),
        zone: toZone(zone2XC),
      },
    ]);
  });

  test("selection highlights with previous selection and expand", () => {
    model.dispatch("START_SELECTION");
    setSelection(model, ["B2:F6"]);
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "K11");
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
    const zone1XC = "B2:F6";
    const zone2XC = "G7:K11";
    setSelection(model, [zone1XC]);
    model.dispatch("STOP_SELECTION");
    const firstColor = getColor(model);
    expect(model.getters.getHighlights().map((h) => h.color)).toEqual([firstColor]);
    model.dispatch("SET_HIGHLIGHT_COLOR", { color: "#999" });
    model.dispatch("START_SELECTION");
    setSelection(model, [zone2XC]);
    model.dispatch("STOP_SELECTION");
    expect(getColor(model)).not.toBe(firstColor);
    expect(model.getters.getHighlights().map((h) => h.color)).toEqual(["#999"]);
  });

  test("select same range twice highlights once", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    const zoneXC = "B2:F6";
    const zone = toZone(zoneXC);
    model.dispatch("START_SELECTION");
    const color = getColor(model);
    setSelection(model, [zoneXC]);
    model.dispatch("STOP_SELECTION");
    expect(model.getters.getHighlights()).toStrictEqual([
      { color, zone, sheet: model.getters.getActiveSheetId() },
    ]);
    model.dispatch("START_SELECTION");
    setSelection(model, [zoneXC]);
    expect(model.getters.getHighlights()).toStrictEqual([
      { color, zone, sheet: model.getters.getActiveSheetId() },
    ]);
  });

  test("selection without pending highlight", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    const zone1XC = "B2:F6";
    const zone2XC = "G7:K11";
    setSelection(model, [zone1XC]);
    const firstColor = getColor(model);
    model.dispatch("STOP_SELECTION");
    model.dispatch("RESET_PENDING_HIGHLIGHT");
    model.dispatch("START_SELECTION");
    setSelection(model, [zone2XC]);
    model.dispatch("STOP_SELECTION");
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: firstColor,
        sheet: model.getters.getActiveSheetId(),
        zone: toZone(zone1XC),
      },
      {
        color: getColor(model),
        sheet: model.getters.getActiveSheetId(),
        zone: toZone(zone2XC),
      },
    ]);
  });

  test("selection with manually set pending highlight", () => {
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: [["B10", "#999"]],
    });
    model.dispatch("ADD_PENDING_HIGHLIGHTS", {
      ranges: [["B10", "#999"]],
    });
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    selectCell(model, "B2");
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: getColor(model),
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 1, left: 1, right: 1, top: 1 },
      },
    ]);
  });

  test("expanding selection does not remove pending highlight from previous zones", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("START_SELECTION");
    selectCell(model, "F6");
    const firstColor = getColor(model);
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "H8");
    expect(model.getters.getSelectedZones().length).toBe(2);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: firstColor,
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 5, left: 5, right: 5, top: 5 },
      },
      {
        color: getColor(model),
        sheet: model.getters.getActiveSheetId(),
        zone: { bottom: 7, left: 7, right: 7, top: 7 },
      },
    ]);
  });

  test("selecting cells in a merge expands the highlight", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    merge(model, "A2:A4");
    model.dispatch("START_SELECTION_EXPANSION");
    setSelection(model, ["A3:A5"], { anchor: "A5" });
    const mergeColor = getColor(model);
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: mergeColor,
        sheet: model.getters.getActiveSheetId(),
        zone: toZone("A2:A5"),
      },
    ]);
  });

  test("selecting cell in a merge does not reset pending highlights", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    merge(model, "A2:A4");
    model.dispatch("START_SELECTION_EXPANSION");
    setSelection(model, ["A3:A5"], { anchor: "A5" });
    const mergeColor = getColor(model);
    model.dispatch("ALTER_SELECTION", { cell: [0, 1] }); // TopLeft
    model.dispatch("ALTER_SELECTION", { cell: [0, 0] }); // above merge
    model.dispatch("STOP_SELECTION");
    expect(model.getters.getHighlights()).toStrictEqual([
      {
        color: mergeColor,
        sheet: model.getters.getActiveSheetId(),
        zone: toZone("A1:A5"),
      },
    ]);
  });

  test("disabling selection highlighting resets pending highlights", () => {
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: true });
    model.dispatch("ADD_PENDING_HIGHLIGHTS", {
      ranges: [["B10", "#999"]],
    });
    expect(getPendingHighlights(model).length).toBe(1);
    model.dispatch("HIGHLIGHT_SELECTION", { enabled: false });
    expect(getPendingHighlights(model).length).toBe(0);
  });
});
