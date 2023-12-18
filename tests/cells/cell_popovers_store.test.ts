import { HoveredCellStore } from "../../src/components/grid/hovered_cell_store";
import { CellPopoverStore } from "../../src/components/popover";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { toCartesian } from "../../src/helpers";
import { merge, setCellContent } from "../test_helpers";
import { makeStore } from "../test_helpers/stores";

describe("cell popover store", () => {
  test("Anchor rect is correct on a merge", () => {
    const { store: cellPopovers, model, container } = makeStore(CellPopoverStore);
    const hoveredCellStore = container.get(HoveredCellStore);
    merge(model, "A1:B2");
    setCellContent(model, "A1", "=0/0");
    hoveredCellStore.hover(toCartesian("B2"));
    expect(cellPopovers.cellPopover).toMatchObject({
      anchorRect: {
        x: 0,
        y: 0,
        height: 2 * DEFAULT_CELL_HEIGHT,
        width: 2 * DEFAULT_CELL_WIDTH,
      },
    });
  });

  test("cannot open popover which does not exists", () => {
    const { store: cellPopovers } = makeStore(CellPopoverStore);
    cellPopovers.open(
      { col: 0, row: 0 },
      /** @ts-ignore */
      "This doesn't exist"
    );
    expect(cellPopovers.cellPopover).toEqual({ isOpen: false });
  });
});
