import { Model } from "../../src";
import { SelectionMultiuserPlugin } from "../../src/plugins/ui/selection_multiuser";
import { setupCollaborativeEnv } from "./collaborative_helpers";
import "../canvas.mock";
import { addColumns } from "../helpers";

describe("Collaborative selection", () => {
  let alice: Model;
  let bob: Model;
  let charly: Model;

  let aliceSelectionPlugin: SelectionMultiuserPlugin;
  let bobSelectionPlugin: SelectionMultiuserPlugin;
  let CharlySelectionPlugin: SelectionMultiuserPlugin;

  beforeEach(() => {
    ({ alice, bob, charly } = setupCollaborativeEnv());
    aliceSelectionPlugin = alice["handlers"].find(
      (p) => p instanceof SelectionMultiuserPlugin
    )! as SelectionMultiuserPlugin;
    bobSelectionPlugin = bob["handlers"].find(
      (p) => p instanceof SelectionMultiuserPlugin
    )! as SelectionMultiuserPlugin;
    CharlySelectionPlugin = charly["handlers"].find(
      (p) => p instanceof SelectionMultiuserPlugin
    )! as SelectionMultiuserPlugin;
  });

  test("active cell is transfered to other users", () => {
    alice.dispatch("SELECT_CELL", {
      col: 2,
      row: 2,
    });
    bob.dispatch("MOVE_POSITION", {
      deltaX: 1,
      deltaY: 1,
    });
    const sheetId = alice.getters.getActiveSheetId();
    expect(aliceSelectionPlugin.selections).toEqual({
      bob: { col: 1, row: 1, sheetId, displayName: bob.getters.getUserName() },
      charly: { col: 0, row: 0, sheetId, displayName: charly.getters.getUserName() },
    });
    expect(bobSelectionPlugin.selections).toEqual({
      alice: { col: 2, row: 2, sheetId, displayName: alice.getters.getUserName() },
      charly: { col: 0, row: 0, sheetId, displayName: charly.getters.getUserName() },
    });
    expect(CharlySelectionPlugin.selections).toEqual({
      alice: { col: 2, row: 2, sheetId, displayName: alice.getters.getUserName() },
      bob: { col: 1, row: 1, sheetId, displayName: bob.getters.getUserName() },
    });
  });

  test("Cell selected is updated after insert column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    alice.dispatch("SELECT_CELL", { col: 1, row: 0 });
    addColumns(bob, "before", "B", 2);
    expect(bobSelectionPlugin.selections.alice).toEqual({
      col: 3,
      row: 0,
      sheetId,
      displayName: alice.getters.getUserName(),
    });
  });

  test("Cell selected of remote client is updated after insert column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    bob.dispatch("SELECT_CELL", { col: 1, row: 0 });
    addColumns(alice, "before", "B", 2);
    expect(aliceSelectionPlugin.selections.bob).toEqual({
      col: 3,
      row: 0,
      sheetId,
      displayName: bob.getters.getUserName(),
    });
  });

  test("Cell selected is updated select an entire column", () => {
    const sheetId = alice.getters.getActiveSheetId();
    bob.dispatch("SELECT_COLUMN", { index: 1 });
    expect(aliceSelectionPlugin.selections.bob).toEqual({
      col: 1,
      row: 0,
      sheetId,
      displayName: bob.getters.getUserName(),
    });
  });
});
