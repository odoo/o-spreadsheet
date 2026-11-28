import { StandaloneComposerStore } from "../../src/components/composer/standalone_composer/standalone_composer_store";
import { Model } from "../../src/model";
import { DependencyContainer } from "../../src/store_engine/dependency_container";
import { ClipboardStore } from "../../src/stores/clipboard_store";
import { Store } from "../../src/types/store_engine";
import { activateSheet, createSheet } from "../test_helpers";
import { makeStoreWithModel } from "../test_helpers/stores";

let model: Model;
let composerStore: Store<StandaloneComposerStore>;
let container: DependencyContainer;

beforeEach(() => {
  model = new Model();
  const sheetId = model.getters.getActiveSheetId();
  ({ container, store: composerStore } = makeStoreWithModel(model, StandaloneComposerStore, () => ({
    onConfirm: () => {},
    content: "hello",
    defaultRangeSheetId: sheetId,
  })));
  container.get(ClipboardStore); // Instantiate a clipboard store
});

test("cancel edition reset current content", () => {
  composerStore.startEdition("=SUM(A2:A3, B5)");
  composerStore.cancelEdition({ resetContent: true, activateSheet: true });
  expect(composerStore["_currentContent"]).toBe("hello");
});

test("resetContent false keeps the current content", () => {
  composerStore.startEdition("=SUM(A2:A3, B5)");
  composerStore.cancelEdition({ resetContent: false, activateSheet: true });
  expect(composerStore["_currentContent"]).toBe("=SUM(A2:A3, B5)");
});

test("activateSheet true activate the original sheet", () => {
  const sheet1Id = model.getters.getActiveSheetId();
  createSheet(model, { sheetId: "42", activate: true });
  composerStore.startEdition("=SUM(A2:A3, B5)");
  activateSheet(model, sheet1Id);
  composerStore.cancelEdition({ resetContent: true, activateSheet: true });
  expect(model.getters.getActiveSheetId()).toBe("42");
});

test("activateSheet false keeps the current sheet", () => {
  const sheet1Id = model.getters.getActiveSheetId();
  createSheet(model, { sheetId: "42", activate: true });
  composerStore.startEdition("=SUM(A2:A3, B5)");
  activateSheet(model, sheet1Id);
  composerStore.cancelEdition({ resetContent: true, activateSheet: false });
  expect(model.getters.getActiveSheetId()).toBe(sheet1Id);
});
