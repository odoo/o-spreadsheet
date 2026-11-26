import { DelayedHoveredCellPlugin } from "../../src/components/grid/delayed_hovered_cell_owl_plugin";
import { CellPopoverPlugin } from "../../src/components/popover/cell_popover_owl_plugin";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { toCartesian } from "../../src/helpers/coordinates";
import { merge, setCellContent } from "../test_helpers";
import { makeOwlPluginManager } from "../test_helpers/owl_plugins_helpers";

describe("cell popover plugin", () => {
  test("Anchor rect is correct on a merge", () => {
    const { model, getPlugin } = makeOwlPluginManager([DelayedHoveredCellPlugin]);
    const hoveredCellStore = getPlugin(DelayedHoveredCellPlugin);
    const cellPopovers = getPlugin(CellPopoverPlugin);
    merge(model, "A1:B2");
    setCellContent(model, "A1", "=0/0");
    hoveredCellStore.hover(toCartesian("B2"));
    expect(cellPopovers.cellPopover()).toMatchObject({
      anchorRect: {
        x: 0,
        y: 0,
        height: 2 * DEFAULT_CELL_HEIGHT,
        width: 2 * DEFAULT_CELL_WIDTH,
      },
    });
  });

  test("cannot open popover which does not exists", () => {
    const { getPlugin } = makeOwlPluginManager([DelayedHoveredCellPlugin]);
    const cellPopovers = getPlugin(CellPopoverPlugin);
    cellPopovers.open(
      { col: 0, row: 0 },
      /** @ts-ignore */
      "This doesn't exist"
    );
    expect(cellPopovers.cellPopover()).toEqual({ isOpen: false });
  });
});
