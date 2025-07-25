import { Component, xml } from "@odoo/owl";
import { DelayedHoveredCellStore } from "../../src/components/grid/delayed_hovered_cell_store";
import { CellPopoverStore } from "../../src/components/popover";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { toCartesian, toZone } from "../../src/helpers";
import { cellPopoverRegistry } from "../../src/registries/cell_popovers_registry";
import { CellPopoverComponent, PopoverBuilders } from "../../src/types/cell_popovers";
import { getElStyle, hoverCell, merge, setCellContent } from "../test_helpers";
import { mountSpreadsheet } from "../test_helpers/helpers";
import { makeStore } from "../test_helpers/stores";

describe("cell popover store", () => {
  test("Anchor rect is correct on a merge", () => {
    const { store: cellPopovers, model, container } = makeStore(CellPopoverStore);
    const hoveredCellStore = container.get(DelayedHoveredCellStore);
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

describe("Cell popover component", () => {
  class TestComponent extends Component {
    static template = xml`<div class="o-test">Test</div>`;
    static props = { "*": Object };
  }

  test("Can open a cell popover on another cell than the hovered cell", async () => {
    jest.useFakeTimers();
    const testPopover: PopoverBuilders = {
      onHover: (position, getters): CellPopoverComponent<typeof TestComponent> => {
        return {
          isOpen: true,
          Component: TestComponent,
          props: {},
          cellCorner: "top-right",
          position: { ...position, col: 0, row: 0 },
        };
      },
    };
    cellPopoverRegistry.add("TestPopover", testPopover);

    const { model } = await mountSpreadsheet();

    await hoverCell(model, "D4", 400);
    expect(".o-popover").toHaveCount(1);
    const a1Rect = model.getters.getVisibleRect(toZone("A1"));
    expect(getElStyle(".o-popover", "left")).toEqual(`${a1Rect.x + a1Rect.width}px`);
    expect(getElStyle(".o-popover", "top")).toEqual(`${a1Rect.y}px`);

    cellPopoverRegistry.remove("TestPopover");
  });

  test("Can open a cell popover with an opening animation", async () => {
    jest.useFakeTimers();
    const testPopover: PopoverBuilders = {
      onHover: (position, getters): CellPopoverComponent<typeof TestComponent> => {
        return {
          isOpen: true,
          Component: TestComponent,
          props: {},
          cellCorner: "top-right",
          slideInAnimation: true,
        };
      },
    };
    cellPopoverRegistry.add("TestPopover", testPopover);

    const { model } = await mountSpreadsheet();

    await hoverCell(model, "D4", 400);
    expect(".o-popover").toHaveCount(1);
    expect(getElStyle(".o-popover", "animation")).toEqual(`o-popover-grow 200ms ease-out`);

    cellPopoverRegistry.remove("TestPopover");
  });
});
