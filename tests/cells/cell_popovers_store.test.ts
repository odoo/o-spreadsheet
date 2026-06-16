import { CellPopoverPlugin } from "../../src/components/owl_plugins/cell_popover_plugin";
import { DelayedHoveredCellPlugin } from "../../src/components/owl_plugins/delayed_hovered_cell_plugin";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { toCartesian } from "../../src/helpers/coordinates";
import { merge, setCellContent } from "../test_helpers";
import { makeOwlPlugin } from "../test_helpers/owl_plugin";

describe("cell popover plugin", () => {
  test("Anchor rect is correct on a merge", () => {
    const { model, pluginManager, plugin: cellPopovers } = makeOwlPlugin(CellPopoverPlugin);
    const hoveredCellPlugin = pluginManager.getPlugin(DelayedHoveredCellPlugin)!;
    merge(model, "A1:B2");
    setCellContent(model, "A1", "=0/0");
    hoveredCellPlugin.hover(toCartesian("B2"));
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
    const { plugin: cellPopovers } = makeOwlPlugin(CellPopoverPlugin);
    cellPopovers.open(
      { col: 0, row: 0 },
      /** @ts-ignore */
      "This doesn't exist"
    );
    expect(cellPopovers.cellPopover).toEqual({ isOpen: false });
  });
});
