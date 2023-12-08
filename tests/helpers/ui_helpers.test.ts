import { toCartesian, toXC, toZone, zoneToXc } from "../../src/helpers/index";
import { interactiveSortSelection } from "../../src/helpers/sort";
import { interactiveCut } from "../../src/helpers/ui/cut_interactive";
import {
  AddFilterInteractiveContent,
  interactiveAddFilter,
} from "../../src/helpers/ui/filter_interactive";
import { interactiveFreezeColumnsRows } from "../../src/helpers/ui/freeze_interactive";
import {
  AddMergeInteractiveContent,
  interactiveAddMerge,
} from "../../src/helpers/ui/merge_interactive";
import {
  PasteInteractiveContent,
  interactivePaste,
  interactivePasteFromOS,
} from "../../src/helpers/ui/paste_interactive";
import { interactiveRenameSheet } from "../../src/helpers/ui/sheet_interactive";
import {
  ToggleGroupInteractiveContent,
  interactiveToggleGroup,
} from "../../src/helpers/ui/toggle_group_interactive";
import { Model } from "../../src/model";
import { CommandResult, Dimension, Position, SpreadsheetChildEnv, UID } from "../../src/types";
import {
  addCellToSelection,
  copy,
  createChart,
  createFilter,
  createSheet,
  cut,
  freezeColumns,
  freezeRows,
  groupHeaders,
  merge,
  selectCell,
  setCellContent,
  setSelection,
  sort,
  undo,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getCellText } from "../test_helpers/getters_helpers";
import { makeTestEnv, target } from "../test_helpers/helpers";

function getCellsObject(model: Model, sheetId: UID) {
  const cells = {};
  for (const cell of Object.values(model.getters.getCells(sheetId))) {
    const { col, row } = model.getters.getCellPosition(cell.id);
    cells[toXC(col, row)] = {
      ...cell,
      value: model.getters.getEvaluatedCell({ sheetId, col, row }).value,
      content: cell.content,
    };
  }
  return cells;
}

describe("Interactive rename sheet", () => {
  let env: SpreadsheetChildEnv;
  let raiseErrorSpy: jest.Mock;
  let errorTextSpy: jest.Mock;
  let model: Model;

  beforeEach(() => {
    errorTextSpy = jest.fn();
    raiseErrorSpy = jest.fn().mockImplementation((error, callback) => {
      errorTextSpy(error.toString());
      callback();
    });
    model = new Model({});
    env = makeTestEnv({ model, raiseError: raiseErrorSpy });
  });

  test.each([
    ["", "The sheet name cannot be empty."],
    ["   ", "The sheet name cannot be empty."],
    [
      "hééélo///",
      "Some used characters are not allowed in a sheet name (Forbidden characters are ' * ? / \\ [ ]).",
    ],
  ])(
    "Rename a sheet with interaction with wrong name %s",
    async (sheetName, expectedErrorMessage) => {
      const errorCallback = jest.fn();
      interactiveRenameSheet(env, model.getters.getActiveSheetId(), sheetName, errorCallback);
      expect(raiseErrorSpy).toHaveBeenCalledTimes(1);
      expect(errorCallback).toHaveBeenCalled();
      expect(errorTextSpy).toHaveBeenCalledWith(expectedErrorMessage);
    }
  );

  test("Rename a sheet with interaction with same name as other sheet", async () => {
    const sheetName = "ThisSheetExistsAlready";
    createSheet(model, { name: sheetName });
    const errorCallback = jest.fn();
    interactiveRenameSheet(env, model.getters.getActiveSheetId(), sheetName, errorCallback);
    expect(raiseErrorSpy).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenCalled();
    expect(errorTextSpy).toHaveBeenCalledWith(
      `A sheet with the name ${sheetName} already exists. Please select another name.`
    );
  });
});

describe("Interactive Freeze columns/rows", () => {
  test.each([
    ["column", "COL"],
    ["row", "ROW"],
  ])("freeze %s through a merge", (name, dimension) => {
    const model = new Model();
    merge(model, "A1:D4");
    const raiseError = jest.fn();
    const env = makeTestEnv({ model, raiseError });
    interactiveFreezeColumnsRows(env, dimension as Dimension, 2);
    expect(raiseError).toBeCalled();
  });
});

describe("UI Helpers", () => {
  let env: SpreadsheetChildEnv;
  let notifyUserTextSpy: jest.Mock<any, any>;
  let askConfirmationTextSpy: jest.Mock<any, any>;
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    notifyUserTextSpy = jest.fn();
    askConfirmationTextSpy = jest.fn();
    const raiseError = (content: string) => {
      notifyUserTextSpy(content.toString());
    };
    const askConfirmation = (content: string, confirm: () => any, cancel?: () => any) => {
      askConfirmationTextSpy(content.toString());
    };
    env = makeTestEnv({ model, raiseError, askConfirmation });
  });

  describe("Interactive Create Filter", () => {
    test("Successfully create a filter", () => {
      interactiveAddFilter(env, sheetId, target("A1:B5"));
      expect(notifyUserTextSpy).toHaveBeenCalledTimes(0);
    });

    test("Create a filter across a merge", () => {
      merge(model, "A1:A2");
      interactiveAddFilter(env, sheetId, target("A1:B1"));
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        AddFilterInteractiveContent.mergeInFilter.toString()
      );
    });

    test("Create a filter across another filter", () => {
      createFilter(model, "A1:A2");
      interactiveAddFilter(env, sheetId, target("A1:B5"));
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        AddFilterInteractiveContent.filterOverlap.toString()
      );
    });

    test("Create filters with non-continuous zones", () => {
      interactiveAddFilter(env, sheetId, target("A1:A2,C3"));
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        AddFilterInteractiveContent.nonContinuousTargets.toString()
      );
    });
  });

  describe("Interactive paste", () => {
    test("paste without copied value interactively", () => {
      interactivePaste(env, target("D2"));
      expect(getCellContent(model, "D2")).toBe("");
    });

    test("Interactive paste paste options are working", async () => {
      const style = { fontSize: 36 };
      setCellContent(model, "A1", "=42");
      model.dispatch("UPDATE_CELL", { sheetId, col: 0, row: 0, style });

      copy(model, "A1");
      const env = makeTestEnv({ model });
      interactivePaste(env, target("B1"), "onlyFormat");
      interactivePaste(env, target("B2"), "onlyValue");
      interactivePaste(env, target("B3"));

      expect(getCellText(model, "B1")).toBe("");
      expect(getCell(model, "B1")!.style).toEqual(style);

      expect(getCellText(model, "B2")).toBe("42");
      expect(getCell(model, "B2")!.style).toBeUndefined();

      expect(getCellText(model, "B3")).toBe("=42");
      expect(getCell(model, "B3")!.style).toEqual(style);
    });

    test("paste a zone with more than one value will warn user", async () => {
      cut(model, "A1:A2");

      selectCell(model, "C4");
      addCellToSelection(model, "F6");
      interactivePaste(env, model.getters.getSelectedZones());
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.wrongPasteSelection.toString()
      );
    });

    test("paste a zone with more than one value will warn user", async () => {
      copy(model, "A1:A2");

      // select C4 and F6
      selectCell(model, "C4");
      addCellToSelection(model, "F6");

      interactivePaste(env, model.getters.getSelectedZones());
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.wrongPasteSelection.toString()
      );
    });

    test("will warn user if paste in several selection", () => {
      copy(model, "A1", "C1");
      interactivePaste(env, target("A2, B2"));
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.wrongPasteSelection.toString()
      );
    });

    test("paste special with a figure will warn the user", async () => {
      createChart(model, {}, "chartId");
      model.dispatch("SELECT_FIGURE", { id: "chartId" });
      copy(model);
      interactivePaste(env, target("A1"), "onlyFormat");
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.wrongFigurePasteOption.toString()
      );
    });

    test("Pasting content that will destroy a merge will notify the user", async () => {
      merge(model, "B2:C3");
      copy(model, "B2");
      selectCell(model, "A1");
      interactivePaste(env, model.getters.getSelectedZones());
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.willRemoveExistingMerge.toString()
      );
    });

    describe("Paste from OS", () => {
      const clipboardString = "a\t1\nb\t2";

      test("Can interactive paste", () => {
        interactivePasteFromOS(env, target("D2"), clipboardString);
        expect(getCellContent(model, "D2")).toBe("a");
        expect(getCellContent(model, "E2")).toBe("1");
        expect(getCellContent(model, "D3")).toBe("b");
        expect(getCellContent(model, "E3")).toBe("2");
      });

      test("Pasting content that will destroy a merge will notify the user", async () => {
        merge(model, "B2:C3");
        selectCell(model, "A1");
        interactivePasteFromOS(env, model.getters.getSelectedZones(), clipboardString);
        expect(notifyUserTextSpy).toHaveBeenCalledWith(
          PasteInteractiveContent.willRemoveExistingMerge.toString()
        );
      });
    });

    test("cannot paste merge through frozen panes horizontally", async () => {
      freezeColumns(model, 2);
      merge(model, "F4:G5");
      copy(model, "F4:G5");

      selectCell(model, "B4");
      interactivePaste(env, model.getters.getSelectedZones());
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.frozenPaneOverlap.toString()
      );
    });

    test("cannot paste merge through frozen panes vertically", async () => {
      freezeRows(model, 2);
      merge(model, "F4:G5");
      copy(model, "F4:G5");

      selectCell(model, "B2");
      interactivePaste(env, model.getters.getSelectedZones());
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.frozenPaneOverlap.toString()
      );
    });
  });

  describe("Interactive cut", () => {
    test("cutting with multiple selection will warn user", async () => {
      setSelection(model, ["A1", "A2"]);
      interactiveCut(env);
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.wrongPasteSelection.toString()
      );
    });
  });

  describe("Interactive Merge", () => {
    test("Successfully Create a merge", () => {
      interactiveAddMerge(env, sheetId, target("A1:B5"));
      expect(askConfirmationTextSpy).toHaveBeenCalledTimes(0);
      expect(notifyUserTextSpy).toHaveBeenCalledTimes(0);
    });

    test("Destructive merge", () => {
      setCellContent(model, "A2", ":)");
      interactiveAddMerge(env, sheetId, target("A1:B5"));
      expect(askConfirmationTextSpy).toHaveBeenCalledWith(
        AddMergeInteractiveContent.MergeIsDestructive.toString()
      );
    });

    test("Create a merge inside a filter", () => {
      createFilter(model, "A1:A2");
      interactiveAddMerge(env, sheetId, target("A1:B5"));
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        AddMergeInteractiveContent.MergeInFilter.toString()
      );
    });

    test("Destructive merge inside a filter", () => {
      createFilter(model, "A1:A2");
      setCellContent(model, "A2", ":)");
      interactiveAddMerge(env, sheetId, target("A1:B5"));
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        AddMergeInteractiveContent.MergeInFilter.toString()
      );
      expect(askConfirmationTextSpy).not.toHaveBeenCalled();
    });
  });

  describe("Fold header group", () => {
    test("Cannot fold all rows", () => {
      const numberOfRows = model.getters.getNumberRows(sheetId);
      groupHeaders(model, "ROW", 0, numberOfRows - 1);
      interactiveToggleGroup(env, sheetId, "ROW", 0, numberOfRows - 1);
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        ToggleGroupInteractiveContent.CannotHideAllRows.toString()
      );
    });

    test("Cannot fold all columns", () => {
      const numberOfColumns = model.getters.getNumberCols(sheetId);
      groupHeaders(model, "COL", 0, numberOfColumns - 1);
      interactiveToggleGroup(env, sheetId, "COL", 0, numberOfColumns - 1);
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        ToggleGroupInteractiveContent.CannotHideAllColumns.toString()
      );
    });
  });

  describe("Sort multi adjacent columns", () => {
    let askConfirmation: jest.Mock;
    const sheetId: UID = "sheet3";
    let anchor: Position;
    const modelData = {
      sheets: [
        {
          id: sheetId,
          colNumber: 4,
          rowNumber: 5,
          cells: {
            A1: { content: "Alpha" },
            A2: { content: "Tango" },
            A3: { content: "Delta" },
            A4: { content: "Zulu" },
            B1: { content: "3" },
            B2: { content: "4" },
            B3: { content: "2" },
            C2: { content: "5" },
            C4: { content: "Charlie" },
            D5: { content: "6" },
          },
        },
      ],
    };
    test("Sort with adjacent values to the selection ask for confirmation", () => {
      askConfirmation = jest.fn();
      model = new Model(modelData);
      const zone = toZone("A2:A3");
      anchor = toCartesian("A2");
      const env = makeTestEnv({ model, askConfirmation });
      interactiveSortSelection(env, sheetId, anchor, zone, "descending");
      expect(askConfirmation).toHaveBeenCalled();
    });
    test("Sort without adjacent values to the selection does not ask for confirmation", () => {
      askConfirmation = jest.fn();
      model = new Model(modelData);
      const zone = toZone("A2:A3");
      const contiguousZone = model.getters.getContiguousZone(sheetId, zone);
      const env = makeTestEnv({ model, askConfirmation });
      interactiveSortSelection(env, sheetId, anchor, contiguousZone, "descending");
      expect(askConfirmation).not.toHaveBeenCalled();
    });

    test("Sort on first column w/ confirming contiguous", () => {
      askConfirmation = jest.fn((text, confirm, cancel) => confirm());
      model = new Model(modelData);
      const zone = toZone("A3:A4");
      anchor = toCartesian("A3");
      const env = makeTestEnv({ model, askConfirmation });
      interactiveSortSelection(env, sheetId, anchor, zone, "descending");
      expect(getCellsObject(model, sheetId)).toMatchObject({
        A1: { content: "Zulu" },
        A2: { content: "Tango" },
        A3: { content: "Delta" },
        A4: { content: "Alpha" },
        B2: { content: "4" },
        B3: { content: "2" },
        B4: { content: "3" },
        C1: { content: "Charlie" },
        C2: { content: "5" },
        D5: { content: "6" },
      });
    });
    test("Sort on first column w/ refusing contiguous", () => {
      askConfirmation = jest.fn((text, confirm, cancel) => cancel());
      model = new Model(modelData);
      const zone = toZone("A3:A4");
      anchor = toCartesian("A3");
      const env = makeTestEnv({ model, askConfirmation });
      interactiveSortSelection(env, sheetId, anchor, zone, "descending");
      expect(getCellsObject(model, sheetId)).toMatchObject({
        A1: { content: "Alpha" },
        A2: { content: "Tango" },
        A3: { content: "Zulu" },
        A4: { content: "Delta" },
        B1: { content: "3" },
        B2: { content: "4" },
        B3: { content: "2" },
        C2: { content: "5" },
        C4: { content: "Charlie" },
        D5: { content: "6" },
      });
    });
  });

  describe("Sort Merges", () => {
    const raiseError = jest.fn();
    const sheetId: UID = "sheet5";
    let anchor: Position;
    const modelData = {
      sheets: [
        {
          id: sheetId,
          colNumber: 6,
          rowNumber: 10,
          cells: {
            B2: { content: "20" },
            B5: { content: "6" },
            B8: { content: "9" },
            C2: { content: "Zulu" },
            C5: { content: "Echo" },
            C8: { content: "Golf" },
            D2: { content: "09/20/2020" },
            D5: { content: "08/20/2020" },
            D8: { content: "07/20/2020" },
          },
          merges: [
            "B2:B4",
            "B5:B7",
            "B8:B10",
            "C2:C4",
            "C5:C7",
            "C8:C10",
            "D2:D4",
            "D5:D7",
            "D8:D10",
          ],
        },
      ],
    };
    beforeEach(() => {
      model = new Model(modelData);
    });
    test("Failed Sort of merges with single adjacent cell with and without interactive mode", () => {
      // add value in adjacent cell
      setCellContent(model, "E6", "Bad Cell!", sheetId);

      // sort
      const zone = toZone("B2:B8");
      const contiguousZone = model.getters.getContiguousZone(sheetId, zone);
      anchor = toCartesian("B2");
      const env = makeTestEnv({ model, raiseError });
      interactiveSortSelection(env, sheetId, anchor, contiguousZone, "ascending");
      expect(raiseError).toHaveBeenCalled();
      expect(model.getters.getSelection()).toEqual({
        anchor: { cell: anchor, zone: contiguousZone },
        zones: [contiguousZone],
      });
      undo(model);
      expect(
        sort(model, {
          zone: zoneToXc(contiguousZone),
          anchor: "B2",
          direction: "ascending",
        })
      ).toBeCancelledBecause(CommandResult.InvalidSortZone);
    });

    test("Failed Sort of merges with adjacent merge with and without interactive mode", () => {
      const sheetId = model.getters.getActiveSheetId();
      //add merge [cols:2, rows: 1] above existing merges
      setCellContent(model, "B1", "Bad Merge!", sheetId);
      merge(model, "B1:C1");
      // sort
      const zone = toZone("B2:B8");
      const contiguousZone = model.getters.getContiguousZone(sheetId, zone);

      const anchor = toCartesian("B2");
      const env = makeTestEnv({ model, raiseError });
      interactiveSortSelection(env, sheetId, anchor, contiguousZone, "ascending");
      expect(raiseError).toHaveBeenCalled();
      expect(model.getters.getSelection()).toEqual({
        anchor: { cell: anchor, zone: contiguousZone },
        zones: [contiguousZone],
      });
      undo(model);
      expect(
        sort(model, {
          zone: zoneToXc(contiguousZone),
          anchor: "B2",
          direction: "ascending",
        })
      ).toBeCancelledBecause(CommandResult.InvalidSortZone);
    });
  });
});
