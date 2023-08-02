import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { CellPopover } from "../../src/stores/cell_popover";
import { HoveredCell } from "../../src/stores/hovered_cell";
import { ModelStore } from "../../src/stores/model_store";
import { activateSheet, createSheet, merge, setCellContent } from "../test_helpers";
import { makeStore, makeStoreContainer } from "../test_helpers/stores";

describe("cell popover plugin", () => {
  test("Anchor rect is correct on a merge", () => {
    const stores = makeStoreContainer();
    const model = stores.get(ModelStore);
    merge(model, "A1:B2");
    setCellContent(model, "A1", "=0/0");
    const cellPopover = stores.get(CellPopover);
    stores.get(HoveredCell).hover({ col: 0, row: 0 });
    expect(cellPopover.cellPopoverComponent).toMatchObject({
      anchorRect: {
        x: 0,
        y: 0,
        height: 2 * DEFAULT_CELL_HEIGHT,
        width: 2 * DEFAULT_CELL_WIDTH,
      },
    });
  });

  test("cannot open popover which does not exists", () => {
    const cellPopover = makeStore(CellPopover);
    //@ts-ignore
    cellPopover.open({ col: 0, row: 0 }, "This doesn't exist");
    expect(cellPopover.isOpen).toBe(false);
  });

  test("popover is closed when sheet is changed", () => {
    const stores = makeStoreContainer();
    const model = stores.get(ModelStore);
    createSheet(model, { sheetId: "Sheet2" });
    const cellPopover = stores.get(CellPopover);
    cellPopover.open({ col: 0, row: 0 }, "ErrorToolTip");
    expect(cellPopover.isOpen).toBe(true);
    activateSheet(model, "Sheet2");
    expect(cellPopover.isOpen).toBe(false);
  });
});
