import { Model } from "../../src";
import type { ComposerStore } from "../../src/components/composer/composer/composer_store";
import { Store } from "../../src/store_engine";
import { NotificationStore } from "../../src/stores/notification_store";
import {
  activateSheet,
  addColumns,
  addRows,
  createSheet,
  deleteColumns,
  deleteRows,
  redo,
  selectCell,
  setCellContent,
  undo,
} from "../test_helpers/commands_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";
import { makeTestComposerStore, makeTestNotificationStore } from "../test_helpers/helpers";

describe("describe", () => {
  let model: Model;
  let composerStore: Store<ComposerStore>;
  let notificationStore: NotificationStore;
  let raiseErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    model = new Model();
    notificationStore = makeTestNotificationStore();
    raiseErrorSpy = jest.spyOn(notificationStore, "raiseError");
    composerStore = makeTestComposerStore(model, notificationStore);
  });

  test("Updatecell & composer on different cells", () => {
    composerStore.startEdition();
    setCellContent(model, "A2", "A2");
    composerStore.setCurrentContent("Hi");
    composerStore.stopEdition();
    expect(getCellContent(model, "A2")).toEqual("A2");
    expect(getCellContent(model, "A1")).toEqual("Hi");
  });

  test("Updatecell & composer on the same cell", () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("bla");
    setCellContent(model, "A1", "A1");
    expect(composerStore.editionMode).toBe("editing");
    expect(getCellContent(model, "A1")).toEqual("A1");
    composerStore.stopEdition();
    expect(getCellContent(model, "A1")).toEqual("bla");
  });

  test("Updatecell & composer on the same cell when cancelling edition", () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("bla");
    setCellContent(model, "A1", "A1");
    expect(composerStore.editionMode).toBe("editing");
    expect(getCellContent(model, "A1")).toEqual("A1");
    composerStore.cancelEdition();
    expect(getCellContent(model, "A1")).toEqual("A1");
  });

  test("Composer is moved when column is added before it", () => {
    selectCell(model, "D2");
    composerStore.startEdition("hello");
    addColumns(model, "after", "B", 1);
    composerStore.stopEdition();
    expect(getCellContent(model, "E2")).toEqual("hello");
  });

  test("Composer is not moved when column is added after it", () => {
    selectCell(model, "A2");
    composerStore.startEdition("hello");
    addColumns(model, "after", "B", 1);
    composerStore.stopEdition();
    expect(getCellContent(model, "A2")).toEqual("hello");
  });

  test("Composer is moved when column is removed before it", () => {
    selectCell(model, "D2");
    composerStore.startEdition("hello");
    deleteColumns(model, ["B"]);
    composerStore.stopEdition();
    expect(getCellContent(model, "C2")).toEqual("hello");
  });

  test("Composer is not moved when column is removed after it", () => {
    selectCell(model, "D2");
    composerStore.startEdition("hello");
    deleteColumns(model, ["E"]);
    composerStore.stopEdition();
    expect(getCellContent(model, "D2")).toEqual("hello");
  });

  test("Composer is moved when column is removed on it", () => {
    selectCell(model, "D2");
    composerStore.startEdition("hello");
    deleteColumns(model, ["D"]);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Composer is moved when row is added before it", () => {
    selectCell(model, "A4");
    composerStore.startEdition("hello");
    addRows(model, "after", 1, 1);
    composerStore.stopEdition();
    expect(getCellContent(model, "A5")).toEqual("hello");
  });

  test("Composer is not moved when row is added after it", () => {
    selectCell(model, "A2");
    composerStore.startEdition("hello");
    addRows(model, "after", 5, 1);
    composerStore.stopEdition();
    expect(getCellContent(model, "A2")).toEqual("hello");
  });

  test("Composer is moved when row is removed before it", () => {
    selectCell(model, "A4");
    composerStore.startEdition("hello");
    deleteRows(model, [1]);
    composerStore.stopEdition();
    expect(getCellContent(model, "A3")).toEqual("hello");
  });

  test("Composer is not moved when row is removed after it", () => {
    selectCell(model, "A4");
    composerStore.startEdition("hello");
    deleteRows(model, [10]);
    composerStore.stopEdition();
    expect(getCellContent(model, "A4")).toEqual("hello");
  });

  test("Delete row & Don't notify cell is deleted when composer is active", () => {
    selectCell(model, "A4");
    composerStore.startEdition("hello");
    deleteRows(model, [3]);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete col & Don't notify cell is deleted when composer is active", () => {
    selectCell(model, "A4");
    composerStore.startEdition("hello");
    deleteColumns(model, ["A"]);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete sheet & Don't notify cell is deleted when composer is active", () => {
    const activeSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    selectCell(model, "A4");
    composerStore.startEdition("hello");
    model.dispatch("DELETE_SHEET", { sheetId: activeSheetId });
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete row & Don't notify cell is deleted when composer is not active", () => {
    selectCell(model, "A4");
    composerStore.startEdition("hello");
    composerStore.stopEdition();
    deleteRows(model, [3]);
    expect(raiseErrorSpy).not.toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete col & Don't notify cell is deleted when composer is not active", () => {
    selectCell(model, "A4");
    composerStore.startEdition("hello");
    composerStore.stopEdition();
    deleteColumns(model, ["A"]);
    expect(raiseErrorSpy).not.toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete sheet & Don't notify cell is deleted when composer is not active", () => {
    const activeSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    selectCell(model, "A4");
    composerStore.startEdition("hello");
    composerStore.stopEdition();
    model.dispatch("DELETE_SHEET", { sheetId: activeSheetId });
    expect(raiseErrorSpy).not.toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Composing in a sheet when the sheet is deleted", () => {
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    selectCell(model, "A4");
    composerStore.startEdition("hello");
    model.dispatch("DELETE_SHEET", { sheetId: "42" });
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Composing in a sheet when a sheet deletion is redone", () => {
    createSheet(model, { sheetId: "42" });
    selectCell(model, "A4");
    model.dispatch("DELETE_SHEET", { sheetId: "42" });
    undo(model);
    activateSheet(model, "42");
    composerStore.startEdition("hello");
    redo(model);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Composing in a sheet when a sheet creation is undone", () => {
    createSheet(model, { sheetId: "42" });
    selectCell(model, "A4");
    activateSheet(model, "42");
    composerStore.startEdition("hello");
    undo(model);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });
});
