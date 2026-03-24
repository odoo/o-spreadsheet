import { Model } from "../../src";
import type { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { Store } from "../../src/store_engine";
import { NotificationStore } from "../../src/stores/notification_store";
import {
  activateSheet,
  addColumns,
  addRows,
  createSheet,
  deleteColumns,
  deleteRows,
  deleteSheet,
  redo,
  selectCell,
  setCellContent,
  undo,
} from "../test_helpers/commands_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";
import {
  createModel,
  makeTestComposerStore,
  makeTestNotificationStore,
} from "../test_helpers/helpers";

describe("describe", () => {
  let model: Model;
  let composerStore: Store<CellComposerStore>;
  let notificationStore: NotificationStore;
  let raiseErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    model = await createModel();
    notificationStore = makeTestNotificationStore();
    raiseErrorSpy = jest.spyOn(notificationStore, "raiseError");
    composerStore = makeTestComposerStore(model, notificationStore);
  });

  test("Updatecell & composer on different cells", async () => {
    composerStore.startEdition();
    await setCellContent(model, "A2", "A2");
    composerStore.setCurrentContent("Hi");
    composerStore.stopEdition();
    expect(getCellContent(model, "A2")).toEqual("A2");
    expect(getCellContent(model, "A1")).toEqual("Hi");
  });

  test("Updatecell & composer on the same cell", async () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("bla");
    await setCellContent(model, "A1", "A1");
    expect(composerStore.editionMode).toBe("editing");
    expect(getCellContent(model, "A1")).toEqual("A1");
    composerStore.stopEdition();
    expect(getCellContent(model, "A1")).toEqual("bla");
  });

  test("Updatecell & composer on the same cell when cancelling edition", async () => {
    composerStore.startEdition();
    composerStore.setCurrentContent("bla");
    await setCellContent(model, "A1", "A1");
    expect(composerStore.editionMode).toBe("editing");
    expect(getCellContent(model, "A1")).toEqual("A1");
    composerStore.cancelEdition();
    expect(getCellContent(model, "A1")).toEqual("A1");
  });

  test("Composer is moved when column is added before it", async () => {
    await selectCell(model, "D2");
    composerStore.startEdition("hello");
    await addColumns(model, "after", "B", 1);
    composerStore.stopEdition();
    expect(getCellContent(model, "E2")).toEqual("hello");
  });

  test("Composer is not moved when column is added after it", async () => {
    await selectCell(model, "A2");
    composerStore.startEdition("hello");
    await addColumns(model, "after", "B", 1);
    composerStore.stopEdition();
    expect(getCellContent(model, "A2")).toEqual("hello");
  });

  test("Composer is moved when column is removed before it", async () => {
    await selectCell(model, "D2");
    composerStore.startEdition("hello");
    await deleteColumns(model, ["B"]);
    composerStore.stopEdition();
    expect(getCellContent(model, "C2")).toEqual("hello");
  });

  test("Composer is not moved when column is removed after it", async () => {
    await selectCell(model, "D2");
    composerStore.startEdition("hello");
    await deleteColumns(model, ["E"]);
    composerStore.stopEdition();
    expect(getCellContent(model, "D2")).toEqual("hello");
  });

  test("Composer is moved when column is removed on it", async () => {
    await selectCell(model, "D2");
    composerStore.startEdition("hello");
    await deleteColumns(model, ["D"]);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Composer is moved when row is added before it", async () => {
    await selectCell(model, "A4");
    composerStore.startEdition("hello");
    await addRows(model, "after", 1, 1);
    composerStore.stopEdition();
    expect(getCellContent(model, "A5")).toEqual("hello");
  });

  test("Composer is not moved when row is added after it", async () => {
    await selectCell(model, "A2");
    composerStore.startEdition("hello");
    await addRows(model, "after", 5, 1);
    composerStore.stopEdition();
    expect(getCellContent(model, "A2")).toEqual("hello");
  });

  test("Composer is moved when row is removed before it", async () => {
    await selectCell(model, "A4");
    composerStore.startEdition("hello");
    await deleteRows(model, [1]);
    composerStore.stopEdition();
    expect(getCellContent(model, "A3")).toEqual("hello");
  });

  test("Composer is not moved when row is removed after it", async () => {
    await selectCell(model, "A4");
    composerStore.startEdition("hello");
    await deleteRows(model, [10]);
    composerStore.stopEdition();
    expect(getCellContent(model, "A4")).toEqual("hello");
  });

  test("Delete row & Don't notify cell is deleted when composer is active", async () => {
    await selectCell(model, "A4");
    composerStore.startEdition("hello");
    await deleteRows(model, [3]);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete col & Don't notify cell is deleted when composer is active", async () => {
    await selectCell(model, "A4");
    composerStore.startEdition("hello");
    await deleteColumns(model, ["A"]);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete sheet & Don't notify cell is deleted when composer is active", async () => {
    const activeSheetId = model.getters.getActiveSheetId();
    await createSheet(model, { sheetId: "42" });
    await selectCell(model, "A4");
    composerStore.startEdition("hello");
    await deleteSheet(model, activeSheetId);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete row & Don't notify cell is deleted when composer is not active", async () => {
    await selectCell(model, "A4");
    composerStore.startEdition("hello");
    composerStore.stopEdition();
    await deleteRows(model, [3]);
    expect(raiseErrorSpy).not.toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete col & Don't notify cell is deleted when composer is not active", async () => {
    await selectCell(model, "A4");
    composerStore.startEdition("hello");
    composerStore.stopEdition();
    await deleteColumns(model, ["A"]);
    expect(raiseErrorSpy).not.toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete sheet & Don't notify cell is deleted when composer is not active", async () => {
    const activeSheetId = model.getters.getActiveSheetId();
    await createSheet(model, { sheetId: "42" });
    await selectCell(model, "A4");
    composerStore.startEdition("hello");
    composerStore.stopEdition();
    await deleteSheet(model, activeSheetId);
    expect(raiseErrorSpy).not.toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Delete sheet & Don't notify cell is deleted when composer is in selecting mode", async () => {
    const activeSheetId = model.getters.getActiveSheetId();
    await createSheet(model, { sheetId: "42" });
    await selectCell(model, "A4");
    await setCellContent(model, "A4", "=A1+");
    composerStore.startEdition();
    await deleteSheet(model, activeSheetId);
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Composing in a sheet when the sheet is deleted", async () => {
    await createSheet(model, { sheetId: "42" });
    await activateSheet(model, "42");
    await selectCell(model, "A4");
    composerStore.startEdition("hello");
    await deleteSheet(model, "42");
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Composing in a sheet when a sheet deletion is redone", async () => {
    await createSheet(model, { sheetId: "42" });
    await selectCell(model, "A4");
    await deleteSheet(model, "42");
    await undo(model);
    await activateSheet(model, "42");
    composerStore.startEdition("hello");
    await redo(model);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Composing in a sheet when a sheet creation is undone", async () => {
    await createSheet(model, { sheetId: "42" });
    await selectCell(model, "A4");
    await activateSheet(model, "42");
    composerStore.startEdition("hello");
    await undo(model);
    expect(raiseErrorSpy).toHaveBeenCalled();
    expect(composerStore.editionMode).toBe("inactive");
  });
});
