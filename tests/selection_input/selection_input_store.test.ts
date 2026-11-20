import { PluginInstance, Scope } from "@odoo/owl";
import { Model } from "../../src";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { SelectionInputPlugin } from "../../src/components/selection_input/selection_input_plugin";
import { toZone, zoneToXc } from "../../src/helpers/zones";
import { HighlightPlugin } from "../../src/owl_plugins/highlight_plugin";
import { ClipboardStore } from "../../src/stores/clipboard_store";
import { OwlPluginGetter } from "../../src/types/spreadsheet_env";
import {
  activateSheet,
  addCellToSelection,
  copy,
  createSheet,
  createSheetWithName,
  merge,
  moveAnchorCell,
  paste,
  resizeAnchorZone,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setSelection,
} from "../test_helpers/commands_helpers";
import { flattenHighlightRange } from "../test_helpers/helpers";
import { makeLocalOwlPlugin } from "../test_helpers/owl_plugins_helpers";
import { makeGlobalStoreWithModel } from "../test_helpers/stores";

function makeSelectionInput(scope: Scope, initialRanges: string[], hasSingleRange = false) {
  return makeLocalOwlPlugin(scope, SelectionInputPlugin, {
    initialRanges,
    hasSingleRange,
    colors: [],
    disabledRanges: [],
  });
}

function makeSelectionInputPlugin(initialRanges: string[] = [], hasSingleRange = false) {
  const { container, model, getPlugin, scope } = makeGlobalStoreWithModel(new Model());
  const plugin = makeSelectionInput(scope, initialRanges, hasSingleRange);
  return { plugin, model, container, getPlugin, scope };
}

/** returns the highlighted zone by the selection input component */
function highlightedZones(getPlugin: OwlPluginGetter) {
  return getPlugin(HighlightPlugin)
    .highlights.map((h) => h.range.zone)
    .map(zoneToXc);
}

function idOfRange(
  plugin: PluginInstance<typeof SelectionInputPlugin>,
  rangeIndex: number
): number {
  return plugin.selectionInputs[rangeIndex].id;
}

describe("selection input plugin", () => {
  test("empty input should focus the first range", () => {
    const { plugin } = makeSelectionInputPlugin();
    expect(plugin.selectionInputs.length).toBe(1);
    expect(plugin.selectionInputs[0].xc).toBe("");
    expect(plugin.selectionInputs[0].isFocused).toBe(true);
  });

  test("input with inital ranges should not be focused", () => {
    const { plugin, getPlugin } = makeSelectionInputPlugin(["D4"]);
    expect(plugin.selectionInputs.length).toBe(1);
    expect(plugin.selectionInputs[0].xc).toBe("D4");
    expect(plugin.selectionInputs[0].isFocused).toBeFalsy();
    expect(highlightedZones(getPlugin)).toStrictEqual([]);
  });

  test("multiple initial values have different ids", () => {
    const { plugin } = makeSelectionInputPlugin(["D4", "D5"]);
    const [range1, range2] = plugin.selectionInputs;
    expect(range1.id).not.toBe(range2.id);
  });

  test("focused input should change with selection", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin();
    plugin.focusById(idOfRange(plugin, 0));
    selectCell(model, "C2");
    expect(plugin.selectionInputs[0].xc).toBe("C2");
    const firstColor = plugin.selectionInputs[0].color;
    expect(highlightedZones(getPlugin)).toStrictEqual(["C2"]);
    selectCell(model, "D4");
    const secondColor = plugin.selectionInputs[0].color;
    expect(plugin.selectionInputs[0].xc).toBe("D4");
    expect(highlightedZones(getPlugin)).toStrictEqual(["D4"]);
    expect(firstColor).toBe(secondColor);
  });

  test("select cell inside a merge expands the selection", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin();
    merge(model, "A2:A4");
    plugin.focusById(idOfRange(plugin, 0));
    setSelection(model, ["A3:A5"]);
    expect(plugin.selectionInputs[0].xc).toBe("A2:A5");
    expect(highlightedZones(getPlugin)).toStrictEqual(["A2:A5"]);
  });

  test("select cell inside a merge expands the selection of a single range input", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin([], true);
    selectCell(model, "B1");
    merge(model, "A2:A4");
    plugin.focusById(idOfRange(plugin, 0));
    addCellToSelection(model, "A4");
    setAnchorCorner(model, "A3");
    expect(plugin.selectionInputs[0].xc).toBe("A2");
    expect(highlightedZones(getPlugin)).toStrictEqual(["A2:A4"]);
    setAnchorCorner(model, "A2");
    expect(plugin.selectionInputs[0].xc).toBe("A2");
    expect(highlightedZones(getPlugin)).toStrictEqual(["A2:A4"]);
  });

  test("selecting the range of a spilled formula does not create a spill reference", () => {
    const { plugin, model } = makeSelectionInputPlugin();
    setCellContent(model, "A1", "=MUNIT(2)");
    plugin.focusById(idOfRange(plugin, 0));
    setSelection(model, ["A1:B2"]);
    expect(plugin.selectionInputs[0].xc).not.toBe("A1#");
    expect(plugin.selectionInputs[0].xc).toBe("A1:B2");
  });

  test("focus input which is already focused", () => {
    const { plugin } = makeSelectionInputPlugin();
    plugin.focusById(idOfRange(plugin, 0));
    expect(plugin.selectionInputs[0].isFocused).toBe(true);
    plugin.focusById(idOfRange(plugin, 0));
    expect(plugin.selectionInputs[0].isFocused).toBe(true);
  });

  test("focused input should not change when selecting a zone for composer", () => {
    const { plugin, model, container } = makeSelectionInputPlugin();
    const composerStore = container.get(CellComposerStore);
    plugin.focusById(idOfRange(plugin, 0));
    composerStore.startEdition("=");
    selectCell(model, "C2");
    expect(plugin.selectionInputs[0].xc).toBe("");
  });

  test("expanding a selection fills empty input then adds a new input", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin();
    plugin.focusById(idOfRange(plugin, 0));
    selectCell(model, "C2");
    expect(plugin.selectionInputs.length).toBe(1);
    expect(plugin.selectionInputs.map((i) => i.xc)).toEqual(["C2"]);
    expect(highlightedZones(getPlugin)).toStrictEqual(["C2"]);
    addCellToSelection(model, "D2");
    expect(plugin.selectionInputs.length).toBe(2);
    expect(plugin.selectionInputs.map((i) => i.xc)).toEqual(["C2", "D2"]);
    expect(highlightedZones(getPlugin)).toStrictEqual(["C2", "D2"]);
    const [firstColor, secondColor] = plugin.selectionInputs.map((i) => i.color);
    expect(firstColor).not.toBe(secondColor);
  });

  test("expanding a selection focuses the last range", () => {
    const { plugin, model } = makeSelectionInputPlugin();
    plugin.focusById(idOfRange(plugin, 0));
    selectCell(model, "C2");
    addCellToSelection(model, "D2");
    expect(plugin.selectionInputs[1].isFocused).toBe(true);
  });

  test("expanding a selection does not add input if maximum is reached", () => {
    const { plugin, model } = makeSelectionInputPlugin([], true);
    selectCell(model, "C2");
    addCellToSelection(model, "D2");
    expect(plugin.selectionInputs).toHaveLength(1);
    expect(plugin.selectionInputs[0].xc).toBe("D2");
  });

  test("cannot add empty range when maximum ranges reached", () => {
    const { plugin } = makeSelectionInputPlugin([], true);
    expect(plugin.selectionInputs).toHaveLength(1);
    plugin.addEmptyRange();
    expect(plugin.selectionInputs).toHaveLength(1);
  });

  test("Cannot add multiple ranges to a 'singleRange' input", () => {
    const { plugin } = makeSelectionInputPlugin([], true);
    expect(plugin.selectionInputs).toHaveLength(1);
    expect(plugin.selectionInputValues).toEqual([]);
    plugin.changeRange(idOfRange(plugin, 0), "A3,A1");
    plugin.changeRange(idOfRange(plugin, 0), "A3,");
    expect(plugin.selectionInputValues).toEqual([]);
  });

  test("cannot add new range when maximum ranges reached", () => {
    const { plugin } = makeSelectionInputPlugin([], true);
    expect(plugin.selectionInputs).toHaveLength(1);
    plugin.changeRange(idOfRange(plugin, 0), "A3, A2");
    expect(plugin.selectionInputs).toHaveLength(1);
  });

  test("add an empty range", () => {
    const { plugin } = makeSelectionInputPlugin();
    expect(plugin.selectionInputs.length).toBe(1);
    plugin.addEmptyRange();
    expect(plugin.selectionInputs.length).toBe(2);
    expect(plugin.selectionInputs[1].isFocused).toBe(true);
    expect(plugin.selectionInputs[1].xc).toBe("");
  });

  test("add an empty range with initial value", () => {
    const { plugin } = makeSelectionInputPlugin(["A5"]);
    expect(plugin.selectionInputs.length).toBe(1);
    plugin.addEmptyRange();
    expect(plugin.selectionInputs.length).toBe(2);
    expect(plugin.selectionInputs[1].isFocused).toBe(true);
    expect(plugin.selectionInputs[1].xc).toBe("");
  });

  test("remove a range", () => {
    const { plugin } = makeSelectionInputPlugin();
    plugin.addEmptyRange();
    const ids = plugin.selectionInputs.map((i) => i.id);
    expect(plugin.selectionInputs.length).toBe(2);
    plugin.removeRange(idOfRange(plugin, 0));
    expect(plugin.selectionInputs.length).toBe(1);
    expect(plugin.selectionInputs.map((i) => i.id)).toEqual([ids[1]]);
  });

  test("last range is focused when one is removed", () => {
    const { plugin } = makeSelectionInputPlugin();
    plugin.addEmptyRange();
    plugin.addEmptyRange();
    plugin.addEmptyRange();
    expect(plugin.selectionInputs.length).toBe(4);
    plugin.removeRange(idOfRange(plugin, 0));
    expect(plugin.selectionInputs.length).toBe(3);
    expect(plugin.selectionInputs[2].isFocused).toBe(true);
  });

  test("ranges are unfocused", () => {
    const { plugin } = makeSelectionInputPlugin();
    expect(plugin.selectionInputs[0].isFocused).toBe(true);
    plugin.unfocus();
    expect(plugin.selectionInputs[0].isFocused).toBeFalsy();
  });

  test("same range is updated while selecting", () => {
    const { plugin, model } = makeSelectionInputPlugin();
    selectCell(model, "C2");
    expect(plugin.selectionInputs[0].xc).toBe("C2");
    selectCell(model, "D2");
    expect(plugin.selectionInputs[0].xc).toBe("D2");
  });

  test("same range is updated while expanding", () => {
    const { plugin, model } = makeSelectionInputPlugin(["A1"]);
    plugin.addEmptyRange();

    addCellToSelection(model, "C2");
    expect(plugin.selectionInputs[1].xc).toBe("C2");
    setAnchorCorner(model, "D2");
    expect(plugin.selectionInputs[1].xc).toBe("C2:D2");
  });

  test("same color while selecting", () => {
    const { plugin, model } = makeSelectionInputPlugin();
    selectCell(model, "C2");
    const color = plugin.selectionInputs[0].color;
    expect(color).toBeTruthy();
    selectCell(model, "D2");
    expect(plugin.selectionInputs[0].color).toBe(color);
  });

  test("same color with new selection in same range", () => {
    const { plugin, model } = makeSelectionInputPlugin();
    selectCell(model, "C2");
    const color = plugin.selectionInputs[0].color;
    selectCell(model, "D2");
    expect(plugin.selectionInputs[0].color).toBe(color);
  });

  test("color changes when expanding selection", () => {
    const { plugin, model } = makeSelectionInputPlugin();
    selectCell(model, "C2");
    const color = plugin.selectionInputs[0].color;
    addCellToSelection(model, "D2");
    expect(plugin.selectionInputs[1].color).not.toEqual(color);
  });

  test("color changes in new input", () => {
    const { plugin, model } = makeSelectionInputPlugin();
    selectCell(model, "C2");
    const color = plugin.selectionInputs[0].color;
    plugin.addEmptyRange();
    selectCell(model, "C2");
    expect(plugin.selectionInputs[1].color).not.toBe(color);
  });

  test("focus does not change values", () => {
    const { plugin } = makeSelectionInputPlugin(["A1", "B2"]);
    expect(plugin.selectionInputs[0].xc).toBe("A1");
    expect(plugin.selectionInputs[1].xc).toBe("B2");
    expect(plugin.selectionInputs[0].isFocused).toBe(false);
    expect(plugin.selectionInputs[1].isFocused).toBe(false);
    plugin.focusById(idOfRange(plugin, 0));
    expect(plugin.selectionInputs[0].xc).toBe("A1");
    expect(plugin.selectionInputs[1].xc).toBe("B2");
    expect(plugin.selectionInputs[0].isFocused).toBe(true);
    expect(plugin.selectionInputs[1].isFocused).toBe(false);
  });

  test("manually changing the input updates highlighted zone", () => {
    const { plugin, getPlugin } = makeSelectionInputPlugin();
    plugin.changeRange(idOfRange(plugin, 0), "C5");
    expect(plugin.selectionInputs[0].xc).toBe("C5");
    expect(highlightedZones(getPlugin)).toStrictEqual(["C5"]);
  });

  test("selection input updates handle full column ranges", () => {
    const { plugin, getPlugin } = makeSelectionInputPlugin();
    plugin.changeRange(idOfRange(plugin, 0), "A3:A");
    expect(plugin.selectionInputs[0].xc).toBe("A3:A");
    expect(highlightedZones(getPlugin)).toEqual(["A3:A100"]);
  });

  test("selection input updates handle full row ranges", () => {
    const { plugin, getPlugin } = makeSelectionInputPlugin();
    plugin.changeRange(idOfRange(plugin, 0), "F3:3");
    expect(plugin.selectionInputs[0].xc).toBe("F3:3");
    expect(highlightedZones(getPlugin)).toEqual(["F3:Z3"]);
  });

  test("manually changing the input with existing range", () => {
    const { plugin, getPlugin } = makeSelectionInputPlugin(["A8"]);
    plugin.changeRange(idOfRange(plugin, 0), "A8, C5");
    expect(plugin.selectionInputs[0].xc).toBe("A8");
    expect(plugin.selectionInputs[1].xc).toBe("C5");
    expect(plugin.selectionInputs[1].isFocused).toBe(true);
    expect(highlightedZones(getPlugin)).toStrictEqual(["A8", "C5"]);
  });

  test("setting multiple ranges in one input", () => {
    const { plugin, getPlugin } = makeSelectionInputPlugin();
    plugin.changeRange(idOfRange(plugin, 0), "C5, D8, B2");
    const [range1, range2, range3] = plugin.selectionInputs;
    expect(range1.xc).toBe("C5");
    expect(range2.xc).toBe("D8");
    expect(range3.xc).toBe("B2");
    expect(range1.id).not.toBe(range2.id);
    expect(range2.id).not.toBe(range3.id);
    expect(highlightedZones(getPlugin)).toStrictEqual(["C5", "D8", "B2"]);
    const [firstColor, secondColor, thirdColor] = plugin.highlights.map((h) => h.color);
    expect(firstColor).not.toBe(secondColor);
    expect(thirdColor).not.toBe(secondColor);
  });

  test("writing an invalid range does not crash", () => {
    const { plugin, getPlugin } = makeSelectionInputPlugin();
    plugin.changeRange(idOfRange(plugin, 0), "This is invalid");
    expect(plugin.selectionInputValues).toEqual(["This is invalid"]);
    expect(highlightedZones(getPlugin)).toStrictEqual([]);
  });

  test("writing an invalid range with valid ones keeps the invalid one", () => {
    const { plugin, getPlugin } = makeSelectionInputPlugin(["B2", "E3"]);
    plugin.focusById(idOfRange(plugin, 0));
    plugin.changeRange(idOfRange(plugin, 0), "A1, This is invalid");
    expect(highlightedZones(getPlugin)).toEqual(["A1", "E3"]);
    expect(plugin.selectionInputs).toHaveLength(3);
    expect(plugin.selectionInputs[0].xc).toBe("A1");
    expect(plugin.selectionInputs[1].xc).toBe("This is invalid");
    expect(plugin.selectionInputs[2].xc).toBe("E3");
    expect(plugin.selectionInputValues).toEqual(["A1", "This is invalid", "E3"]);
  });

  test("writing an empty range removes the highlight", () => {
    const { plugin, getPlugin } = makeSelectionInputPlugin();
    plugin.changeRange(idOfRange(plugin, 0), "C2");
    expect(highlightedZones(getPlugin)).toStrictEqual(["C2"]);
    plugin.changeRange(idOfRange(plugin, 0), "");
    expect(highlightedZones(getPlugin)).toStrictEqual([]);
  });

  test("disable input removes highlighted zones", () => {
    const { plugin, getPlugin } = makeSelectionInputPlugin();
    plugin.changeRange(idOfRange(plugin, 0), "C2");
    expect(highlightedZones(getPlugin)).toStrictEqual(["C2"]);
    plugin.unfocus();
    expect(highlightedZones(getPlugin)).toStrictEqual([]);
  });

  test("initial ranges are not highlighted", () => {
    const { plugin } = makeSelectionInputPlugin(["C2", "D4"]);
    expect(plugin.selectionInputs.length).toBe(2);
    expect(plugin.highlights.length).toBe(0);
  });

  test("ranges are split for value", () => {
    const { plugin } = makeSelectionInputPlugin();
    plugin.changeRange(idOfRange(plugin, 0), "C2, D5");
    expect(plugin.selectionInputValues).toStrictEqual(["C2", "D5"]);
  });

  test("multiple ranges are combined", () => {
    const { plugin } = makeSelectionInputPlugin();
    plugin.addEmptyRange();
    plugin.changeRange(idOfRange(plugin, 0), "C2");
    plugin.changeRange(idOfRange(plugin, 1), "C6");
    expect(plugin.selectionInputValues).toStrictEqual(["C2", "C6"]);
  });

  test("trailing commas and spaces are removed", () => {
    const { plugin } = makeSelectionInputPlugin();
    plugin.changeRange(idOfRange(plugin, 0), "C2, ");
    expect(plugin.selectionInputValues).toStrictEqual(["C2"]);
  });

  test("leading commas and spaces are removed", () => {
    const { plugin } = makeSelectionInputPlugin();
    plugin.changeRange(idOfRange(plugin, 0), " ,C2,B3");
    expect(plugin.selectionInputValues).toStrictEqual(["C2", "B3"]);
  });

  test("selection expansion adds as many input as needed", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin(["C4"]);
    selectCell(model, "C2");
    plugin.focusById(idOfRange(plugin, 0));
    expect(highlightedZones(getPlugin)).toEqual(["C4"]);
    addCellToSelection(model, "D2");
    expect(highlightedZones(getPlugin)).toEqual(["C4", "D2"]);
    expect(plugin.selectionInputs[0].xc).toBe("C4");
    expect(plugin.selectionInputs[1].xc).toBe("D2");
  });

  test("multiple alter selection in a single range component", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin(["C4"], true);
    selectCell(model, "C2");
    plugin.focusById(idOfRange(plugin, 0));
    addCellToSelection(model, "E1");
    setAnchorCorner(model, "E2");
    setAnchorCorner(model, "E3");
    expect(highlightedZones(getPlugin)).toEqual(["E1:E3"]);
    expect(plugin.selectionInputs[0].xc).toBe("E1:E3");
  });

  test("selection expansion by altering selection adds inputs", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin(["D4"]);
    selectCell(model, "C2");
    plugin.focusById(idOfRange(plugin, 0));
    addCellToSelection(model, "D2");
    expect(highlightedZones(getPlugin)).toEqual(["D4", "D2"]);
    resizeAnchorZone(model, "right");
    expect(highlightedZones(getPlugin)).toEqual(["D4", "D2:E2"]);
    expect(plugin.selectionInputs[0].xc).toBe("D4");
    expect(plugin.selectionInputs[1].xc).toBe("D2:E2");
  });

  test("Selections are not shared between selection inputs", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin(["D4"]);
    selectCell(model, "C2");
    plugin.focusById(idOfRange(plugin, 0));
    addCellToSelection(model, "D2");
    expect(highlightedZones(getPlugin)).toEqual(["D4", "D2"]);
    resizeAnchorZone(model, "right");
    expect(highlightedZones(getPlugin)).toEqual(["D4", "D2:E2"]);
    expect(plugin.selectionInputs[0].xc).toBe("D4");
    expect(plugin.selectionInputs[1].xc).toBe("D2:E2");
  });

  test("highlights are updated when focus switched from one input to another", () => {
    const { plugin: plugin1, scope, getPlugin } = makeSelectionInputPlugin(["D4"]);
    const plugin2 = makeSelectionInput(scope, ["D5"]);
    plugin1.focusById(idOfRange(plugin1, 0));
    expect(plugin1.selectionInputs[0].isFocused).toBe(true);
    expect(plugin2.selectionInputs[0].isFocused).toBe(false);
    expect(plugin1.selectionInputs[0].color).toBeTruthy();
    expect(plugin2.selectionInputs[0].color).toBeFalsy();
    expect(highlightedZones(getPlugin)).toEqual(["D4"]);
    plugin2.focusById(idOfRange(plugin2, 0));
    expect(plugin1.selectionInputs[0].isFocused).toBe(false);
    expect(plugin2.selectionInputs[0].isFocused).toBe(true);
    expect(plugin1.selectionInputs[0].color).toBeFalsy();
    expect(plugin2.selectionInputs[0].color).toBeTruthy();
    expect(highlightedZones(getPlugin)).toEqual(["D5"]);
  });

  test("color is kept between focuses", () => {
    const { plugin } = makeSelectionInputPlugin(["D4"]);
    plugin.focusById(idOfRange(plugin, 0));
    const color = plugin.selectionInputs[0].color;
    expect(color).toBeTruthy();
    plugin.unfocus();
    expect(plugin.selectionInputs[0].color).toBe(null);
    plugin.focusById(idOfRange(plugin, 0));
    expect(plugin.selectionInputs[0].color).toBe(color);
  });

  test("Pre-existing ranges from other sheets are selected", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin(["Sheet2!A2"]);
    createSheet(model, { sheetId: "42", name: "Sheet2", activate: false });
    expect(plugin.selectionInputs[0].xc).toBe("Sheet2!A2");
    plugin.focusById(idOfRange(plugin, 0));
    expect(highlightedZones(getPlugin)).toEqual([]);
    const firstSheetId = model.getters.getActiveSheetId();
    activateSheet(model, "42", firstSheetId);
    expect(highlightedZones(getPlugin)).toEqual(["A2"]);
    flattenHighlightRange;
    expect(flattenHighlightRange(plugin.highlights[0])).toMatchObject({
      sheetId: "42",
      zone: toZone("A2"),
    });
  });

  test("can select multiple ranges in another sheet", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin();
    selectCell(model, "A1");
    expect(plugin.selectionInputs[0].xc).toBe("A1");
    expect(highlightedZones(getPlugin)).toEqual(["A1"]);
    const firstSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    addCellToSelection(model, "B2");
    expect(plugin.selectionInputs).toHaveLength(2);
    expect(plugin.selectionInputs[0].xc).toBe("A1");
    expect(plugin.selectionInputs[1].xc).toBe("Sheet2!B2");
    expect(highlightedZones(getPlugin)).toEqual(["B2"]);
    addCellToSelection(model, "B3");
    expect(plugin.selectionInputs).toHaveLength(3);
    expect(plugin.selectionInputs[0].xc).toBe("A1");
    expect(plugin.selectionInputs[1].xc).toBe("Sheet2!B2");
    expect(plugin.selectionInputs[2].xc).toBe("Sheet2!B3");
    expect(highlightedZones(getPlugin)).toEqual(["B2", "B3"]);
    activateSheet(model, firstSheetId);
    expect(highlightedZones(getPlugin)).toEqual(["A1"]);
  });

  test.each(["sheet name", "Sheet+", "Sheet:)"])(
    "can select a range  with special characters in its name: %s",
    (sheetName) => {
      const { plugin, model } = makeSelectionInputPlugin();
      createSheetWithName(model, { sheetId: "42", activate: true }, sheetName);
      selectCell(model, "A1");
      expect(plugin.selectionInputs[0].xc).toBe(`'${sheetName}'!A1`);
    }
  );

  test("focus while in other sheet", () => {
    const { plugin, model } = makeSelectionInputPlugin();
    selectCell(model, "A1");
    createSheet(model, { sheetId: "42", activate: true });
    plugin.unfocus();
    let [range] = plugin.selectionInputs;
    plugin.focusById(range.id);
    [range] = plugin.selectionInputs;
    expect(range.xc).toBe("A1");
  });

  test("mixing ranges from different sheets in the same input", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin();
    createSheet(model, { sheetId: "42", position: 1 });
    expect(model.getters.getActiveSheet()).not.toBe("42");
    plugin.changeRange(idOfRange(plugin, 0), "A1, Sheet2!B3");
    const [range1, range2] = plugin.selectionInputs;
    expect(highlightedZones(getPlugin)).toEqual(["A1"]);
    expect(range1.xc).toBe("A1");
    expect(range2.xc).toBe("Sheet2!B3");
  });

  test("mixing ranges from different sheets in the same input in another sheet", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin();
    createSheet(model, { sheetId: "42", activate: true });
    plugin.changeRange(idOfRange(plugin, 0), "Sheet2!B3, A1");
    const [range1, range2] = plugin.selectionInputs;
    expect(highlightedZones(getPlugin)).toEqual(["B3"]);
    expect(plugin.selectionInputs).toHaveLength(2);
    expect(range1.xc).toBe("Sheet2!B3");
    expect(range2.xc).toBe("A1");
  });

  test("manually adding a range from another sheet", () => {
    const { plugin, model } = makeSelectionInputPlugin(["A1"]);
    createSheet(model, { sheetId: "42", activate: true });
    expect(plugin.selectionInputs[0].xc).toBe("A1");
    plugin.focusById(idOfRange(plugin, 0));
    plugin.changeRange(idOfRange(plugin, 0), "A1, C5");
    expect(plugin.selectionInputs).toHaveLength(2);
    expect(plugin.selectionInputs[0].xc).toBe("A1");
    expect(plugin.selectionInputs[1].xc).toBe("C5");
  });

  test("highlights are set when activating another sheet", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin();
    createSheet(model, { sheetId: "42", position: 1 });
    plugin.changeRange(idOfRange(plugin, 0), "Sheet2!B3, A1");
    expect(highlightedZones(getPlugin)).toEqual(["A1"]);
    activateSheet(model, "42");
    expect(highlightedZones(getPlugin)).toEqual(["B3"]);
  });

  test("input not focused when changing sheet", () => {
    const { plugin, model } = makeSelectionInputPlugin(["Sheet2!B2"]);
    createSheet(model, { sheetId: "42", position: 1 });
    plugin.focusById(idOfRange(plugin, 0));
    plugin.unfocus();
    expect(plugin.selectionInputs[0].isFocused).toBe(false);
    activateSheet(model, "42");
    expect(plugin.selectionInputs[0].isFocused).toBe(false);
  });

  test("input selection is reset only when changing sheet", () => {
    const { plugin, model, getPlugin } = makeSelectionInputPlugin();
    createSheet(model, { sheetId: "42" });
    plugin.focusById(idOfRange(plugin, 0));
    selectCell(model, "B7");
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(highlightedZones(getPlugin)).toEqual(["A2"]);
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(highlightedZones(getPlugin)).toEqual(["A3"]);
  });

  test("focus and change range with unbounded ranges", () => {
    const { plugin } = makeSelectionInputPlugin(["A:A"]);
    plugin.focusById(idOfRange(plugin, 0));
    expect(plugin.selectionInputs[0].xc).toBe("A:A");
    plugin.changeRange(idOfRange(plugin, 0), "1:1");
    expect(plugin.selectionInputs[0].xc).toBe("1:1");
  });

  test("consistent range colors upon refocusing multiple times", () => {
    const { plugin } = makeSelectionInputPlugin(["B1:B5", "C1:C5"]);
    plugin.focusById(idOfRange(plugin, 0));
    const [initialFirstColor, initialSecondColor] = plugin.selectionInputs.map((i) => i.color);
    plugin.unfocus();
    plugin.focusById(idOfRange(plugin, 0));
    const [newFirstColor, newSecondColor] = plugin.selectionInputs.map((i) => i.color);
    expect(initialFirstColor).toBe(newFirstColor);
    expect(initialSecondColor).toBe(newSecondColor);
  });

  test("no duplicate range ids when creating and deleting ranges frequently", () => {
    const { plugin } = makeSelectionInputPlugin(["B1:B5", "C1:C5"]);
    plugin.addEmptyRange(); // id: 3
    plugin.addEmptyRange(); // id: 4
    plugin.removeRange(idOfRange(plugin, 2));
    plugin.addEmptyRange(); // id: 5
    const selectionInput = plugin.selectionInputs;
    expect(selectionInput.length).toEqual(4);
    expect(selectionInput.map((input) => input.id)).toStrictEqual([1, 2, 4, 5]);
  });

  test("Selection input is deactivated/ falls back on grid selection on a PASTE", () => {
    const { plugin, model, container } = makeSelectionInputPlugin(["B1:B2"]);
    container.get(ClipboardStore);
    setCellContent(model, "A1", "1");
    setSelection(model, ["A1:A2"]);
    copy(model, "A1:A2");
    plugin.focusById(idOfRange(plugin, 0));
    let input = plugin.selectionInputs;
    expect(input.length).toBe(1);
    expect(input[0]).toMatchObject({ xc: "B1:B2", isFocused: true });
    expect(model.getters.isGridSelectionActive()).toBe(false);
    paste(model, "C1:C2");
    input = plugin.selectionInputs;
    expect(input.length).toBe(1);
    expect(input[0]).toMatchObject({ xc: "B1:B2", isFocused: false });
    expect(model.getters.isGridSelectionActive()).toBe(true);
  });

  test("Can add a empty range to a second input without pre-focusing", () => {
    const { plugin: plugin1, scope } = makeSelectionInputPlugin([], true);
    const plugin2 = makeSelectionInput(scope, []);
    plugin1.focusById(idOfRange(plugin1, 0));
    plugin2.addEmptyRange();
    expect(plugin2.selectionInputs).toHaveLength(2);
  });

  test("Can change the range of a second input without pre-focusing", () => {
    const { plugin: plugin1, scope } = makeSelectionInputPlugin([], true);
    const plugin2 = makeSelectionInput(scope, []);
    plugin1.focusById(idOfRange(plugin1, 0));
    plugin2.changeRange(idOfRange(plugin2, 0), "F1,F2");
    expect(plugin2.selectionInputs).toHaveLength(2);
    expect(plugin2.selectionInputs[0].xc).toBe("F1");
    expect(plugin2.selectionInputs[1].xc).toBe("F2");
    expect(plugin2.selectionInputs[1].isFocused).toBe(true);
  });

  test("selecting a cell after resetting with fewer ranges than the focused index", () => {
    const { plugin, model } = makeSelectionInputPlugin(["A1", "A2", "A3"]);
    plugin.focusById(idOfRange(plugin, 2));
    plugin.resetWithRanges(["B1"]);
    selectCell(model, "C1");
    expect(plugin.selectionInputValues).toEqual(["C1"]);
  });
});
