import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { CommandResult, UID } from "../../src/types";
import {
  addCellProtectionRule,
  addColumns,
  addDataValidation,
  addRows,
  clearCells,
  copy,
  createSheet,
  createTable,
  deleteColumns,
  deleteRows,
  deleteSheet,
  freezeColumns,
  freezeRows,
  groupColumns,
  groupRows,
  hideSheet,
  moveColumns,
  moveRows,
  moveSheet,
  paste,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { createEqualCF, toRangesData } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

describe("Cell protection", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  describe("UI cell protection", () => {
    describe("When a range is protected", () => {
      beforeEach(() => {
        addCellProtectionRule(model, {
          id: "id",
          type: "range",
          sheetId,
          ranges: ["A1:C2"],
        });
      });
      test("Cannot update a cell", () => {
        expect(setCellContent(model, "A1", "hola")).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(setCellContent(model, "B1", "hola")).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(setCellContent(model, "C2", "hola")).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(clearCells(model, ["A1:C2"], sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
      });

      test("Cannot insert a table", () => {
        expect(createTable(model, "A1:C2")).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(createTable(model, "C2:D4")).toBeCancelledBecause(CommandResult.CellIsProtected);
      });

      test("Cannot re-insert a pivot table", () => {
        addPivot(
          model,
          "A1:B3",
          {
            columns: [],
            rows: [{ fieldName: "Customer" }],
            measures: [{ id: "Price:sum", fieldName: "Price", aggregator: "sum" }],
          },
          "1"
        );
        expect(
          model.dispatch("INSERT_PIVOT_WITH_TABLE", {
            col: 0,
            row: 0,
            sheetId,
            pivotId: "1",
            table: {
              cols: [],
              rows: [],
              measures: [],
            },
          })
        ).toBeCancelledBecause(CommandResult.CellIsProtected);
      });

      test("Cannot add a CF", () => {
        expect(
          model.dispatch("ADD_CONDITIONAL_FORMAT", {
            cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
            ranges: toRangesData(sheetId, "A1, A2"),
            sheetId,
          })
        ).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(
          model.dispatch("ADD_CONDITIONAL_FORMAT", {
            cf: createEqualCF("1", { fillColor: "#FF0000" }, "1"),
            ranges: toRangesData(sheetId, "C1, C3"),
            sheetId,
          })
        ).toBeCancelledBecause(CommandResult.CellIsProtected);
      });

      test("Cannot add cell protection rules", () => {
        expect(
          addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] })
        ).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(
          addDataValidation(model, "C1:C5", "id", { type: "textContains", values: ["1"] })
        ).toBeCancelledBecause(CommandResult.CellIsProtected);
      });

      test("Cannot sort cells", () => {
        expect(
          model.dispatch("SORT_CELLS", {
            sheetId,
            col: 0,
            row: 0,
            zone: toZone("A1:A5"),
            sortDirection: "ascending",
          })
        ).toBeCancelledBecause(CommandResult.CellIsProtected);
      });
      test("Can copy content", () => {
        expect(copy(model, "A1:C2")).toBeSuccessfullyDispatched();
      });
      test("Cannot paste content", () => {
        copy(model, "A1:C2");
        expect(paste(model, "A1:C2")).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(paste(model, "A1")).toBeCancelledBecause(CommandResult.CellIsProtected);
      });
      test("Cannot add columns", () => {
        expect(addColumns(model, "before", "B", 1, sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(addColumns(model, "after", "B", 1, sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(addColumns(model, "after", "C", 1, sheetId)).toBeSuccessfullyDispatched();
      });
      test("Cannot add rows", () => {
        expect(addRows(model, "before", 0, 1, sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(addRows(model, "after", 0, 1, sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(addRows(model, "after", 2, 1, sheetId)).toBeSuccessfullyDispatched();
      });
      test("Cannot delete columns", () => {
        expect(deleteColumns(model, ["B"], sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(deleteColumns(model, ["D"], sheetId)).toBeSuccessfullyDispatched();
      });

      test("Cannot delete rows", () => {
        expect(deleteRows(model, [0], sheetId)).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(deleteRows(model, [4], sheetId)).toBeSuccessfullyDispatched();
      });

      test("Cannot move columns", () => {
        expect(moveColumns(model, "B", ["D", "E"], "before", sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(moveColumns(model, "E", ["A", "B"], "after", sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(moveColumns(model, "F", ["D", "E"], "after", sheetId)).toBeSuccessfullyDispatched();
      });

      test("Cannot move rows", () => {
        expect(moveRows(model, 1, [4, 5], "before", sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(moveRows(model, 5, [0, 1], "before", sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(moveRows(model, 6, [4, 5])).toBeSuccessfullyDispatched();
      });

      test("Cannot freeze columns", () => {
        expect(freezeColumns(model, 1, sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(freezeColumns(model, 2, sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(freezeColumns(model, 3, sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(freezeColumns(model, 4, sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
      });

      test("Cannot freeze rows", () => {
        expect(freezeRows(model, 1, sheetId)).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(freezeRows(model, 2, sheetId)).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(freezeRows(model, 3, sheetId)).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(freezeRows(model, 4, sheetId)).toBeCancelledBecause(CommandResult.CellIsProtected);
      });

      test("Cannot group columns", () => {
        expect(groupColumns(model, "A", "C", sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(groupColumns(model, "C", "E", sheetId)).toBeCancelledBecause(
          CommandResult.CellIsProtected
        );
        expect(groupColumns(model, "D", "E", sheetId)).toBeSuccessfullyDispatched();
      });

      test("Cannot group rows", () => {
        expect(groupRows(model, 0, 1, sheetId)).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(groupRows(model, 1, 4, sheetId)).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(groupRows(model, 3, 4, sheetId)).toBeSuccessfullyDispatched();
      });

      test("Can delete cell protection rule", () => {
        expect(
          model.dispatch("REMOVE_CELL_PROTECTION_RULE", { sheetId })
        ).toBeSuccessfullyDispatched();
      });
    });

    describe("When a sheet is protected", () => {
      beforeEach(() => {
        createSheet(model, {});
        addCellProtectionRule(model, {
          id: "id",
          type: "sheet",
          sheetId: sheetId,
          excludeRanges: [],
        });
      });
      test("Cannot delete sheet", () => {
        expect(deleteSheet(model, sheetId)).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(deleteSheet(model, model.getters.getSheetIds()[1])).toBeSuccessfullyDispatched();
      });

      test("Cannot move sheet", async () => {
        expect(moveSheet(model, 1, sheetId)).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(moveSheet(model, -1, model.getters.getSheetIds()[1])).toBeSuccessfullyDispatched();
      });

      test("Cannot hide sheet", () => {
        expect(hideSheet(model, sheetId)).toBeCancelledBecause(CommandResult.CellIsProtected);
        expect(hideSheet(model, model.getters.getSheetIds()[1])).toBeSuccessfullyDispatched();
      });
    });
  });
});
