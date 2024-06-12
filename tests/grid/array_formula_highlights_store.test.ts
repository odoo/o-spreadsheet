import { Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { toZone, zoneToXc } from "../../src/helpers";
import { ArrayFormulaHighlight } from "../../src/stores/array_formula_highlight";
import { selectCell, setCellContent } from "../test_helpers/commands_helpers";
import { dragElement } from "../test_helpers/dom_helper";
import { getCell, getCellContent } from "../test_helpers/getters_helpers";
import { getHighlightsFromStore, mountSpreadsheet } from "../test_helpers/helpers";
import { makeStore } from "../test_helpers/stores";

describe("array function highlights", () => {
  test("Putting the selection inside an array formula highlights it", () => {
    const { model, container } = makeStore(ArrayFormulaHighlight);
    setCellContent(model, "A2", "=TRANSPOSE(A1:C1)");
    expect(getHighlightsFromStore(container)).toEqual([]);
    const highlight = {
      sheetId: model.getters.getActiveSheetId(),
      zone: toZone("A2:A4"),
      color: "#17A2B8",
      noFill: true,
      thinLine: true,
      dashed: false,
      movable: true,
    };
    selectCell(model, "A2"); // main cell
    expect(getHighlightsFromStore(container)).toEqual([highlight]);
    selectCell(model, "A3"); // array function cell
    expect(getHighlightsFromStore(container)).toEqual([highlight]);
  });

  test("Selecting an array formula that cannot spill is still highlighted", () => {
    const { model, container } = makeStore(ArrayFormulaHighlight);
    setCellContent(model, "A2", "=TRANSPOSE(A1:C1)");
    setCellContent(model, "A4", "blocking the spread");
    expect(getHighlightsFromStore(container)).toEqual([]);
    selectCell(model, "A2"); // main cell
    expect(getHighlightsFromStore(container)).toEqual([
      {
        sheetId: model.getters.getActiveSheetId(),
        zone: toZone("A2:A4"),
        color: "#17A2B8",
        noFill: true,
        thinLine: true,
        dashed: true,
        movable: true,
      },
    ]);
    selectCell(model, "A3"); // no highlight as the function does not spill
    expect(getHighlightsFromStore(container)).toEqual([]);
  });

  test("Non-array formula are not highlighted", () => {
    const { model, container } = makeStore(ArrayFormulaHighlight);
    setCellContent(model, "A2", "=A1");
    selectCell(model, "A2");
    expect(getHighlightsFromStore(container)).toEqual([]);
  });
});

describe("Drag & drop array formula highlight", () => {
  test("Can drag & drop the array formula highlight", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=MUNIT(3)");
    const { fixture } = await mountSpreadsheet({ model });

    const el = fixture.querySelector(".o-border-w")!;
    const dragOffset = { x: DEFAULT_CELL_WIDTH * 2, y: DEFAULT_CELL_HEIGHT * 2 };
    await dragElement(el, dragOffset, undefined, true);

    expect(getCell(model, "A1")?.content).toEqual(undefined);
    expect(getCell(model, "C3")?.content).toEqual("=MUNIT(3)");
    expect(zoneToXc(model.getters.getSelectedZone())).toEqual("C3:E5");
  });

  test("Drag & drop formula on existing cells will give a warning and remove the content", () => {
    const askConfirmation = jest.fn((_, confirm) => confirm());
    const { model } = makeStore(ArrayFormulaHighlight, {
      notificationCallbacks: { askConfirmation },
    });

    setCellContent(model, "A1", "=MUNIT(3)");
    setCellContent(model, "D4", "text");

    model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("A1:C3") });
    model.selection.selectZone({ cell: { col: 1, row: 1 }, zone: toZone("B2:D4") });
    model.dispatch("STOP_CHANGE_HIGHLIGHT");

    expect(askConfirmation).toHaveBeenCalled();
    expect(getCell(model, "B2")?.content).toEqual("=MUNIT(3)");
    expect(getCellContent(model, "D4")).toEqual("1");
  });

  test("Drag & drop formula on itself will give no warning ", () => {
    const askConfirmation = jest.fn((_, confirm) => confirm());
    const { model } = makeStore(ArrayFormulaHighlight, {
      notificationCallbacks: { askConfirmation },
    });

    setCellContent(model, "B2", "=MUNIT(3)");
    selectCell(model, "B2");

    model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B2:D4") });
    model.selection.selectZone({ cell: { col: 0, row: 0 }, zone: toZone("A1:C3") });
    model.dispatch("STOP_CHANGE_HIGHLIGHT");

    expect(askConfirmation).not.toHaveBeenCalled();
    expect(getCell(model, "A1")?.content).toEqual("=MUNIT(3)");
    expect(getCell(model, "B2")?.content).toEqual(undefined);
  });

  test("Drag & drop formula on itself and on another cell will give a warning", () => {
    const askConfirmation = jest.fn((_, confirm) => confirm());
    const { model } = makeStore(ArrayFormulaHighlight, {
      notificationCallbacks: { askConfirmation },
    });

    setCellContent(model, "B2", "=MUNIT(3)");
    setCellContent(model, "B1", "text");
    selectCell(model, "B2");

    model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B2:D4") });
    model.selection.selectZone({ cell: { col: 0, row: 0 }, zone: toZone("A1:C3") });
    model.dispatch("STOP_CHANGE_HIGHLIGHT");

    expect(askConfirmation).toHaveBeenCalled();
    expect(getCell(model, "A1")?.content).toEqual("=MUNIT(3)");
    expect(getCell(model, "B1")?.content).toEqual(undefined);
    expect(getCell(model, "B2")?.content).toEqual(undefined);
  });

  test("Drag & drop is cancelled if someone captures the selection stream", () => {
    const { model, store } = makeStore(ArrayFormulaHighlight, {});

    setCellContent(model, "B2", "=MUNIT(3)");
    selectCell(model, "B2");
    expect(zoneToXc(store.highlights[0].zone)).toBe("B2:D4");

    model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B2:D4") });
    model.selection.selectZone({ cell: { col: 0, row: 0 }, zone: toZone("A1:C3") });
    expect(zoneToXc(store.highlights[0].zone)).toBe("A1:C3");

    model.selection.capture(
      {},
      { cell: { col: 0, row: 0 }, zone: toZone("A1") },
      {
        handleEvent: () => {},
      }
    );
    expect(zoneToXc(store.highlights[0].zone)).toBe("B2:D4");
    expect(getCell(model, "A1")).toEqual(undefined);
    expect(getCell(model, "B2")?.content).toEqual("=MUNIT(3)");
  });
});
